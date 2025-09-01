// src/pages/GestionOrdenes.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { useSearchParams } from "react-router-dom";
import { jsPDF } from "jspdf";

/* ==================== helpers ==================== */

function estadoBadge(id) {
  const n = Number(id);
  if (n === 1) return "badge badge-warning"; // Pendiente
  if (n === 2) return "badge badge-error";   // Cancelado
  if (n === 3) return "badge badge-success"; // Aprobado
  if (n === 4) return "badge badge-info";    // En curso
  if (n === 5) return "badge badge-success"; // Completado
  return "badge badge-ghost";
}

function vehicleLabel(v) {
  if (!v) return "";
  const { placas, marca, modelo } = v;
  return `${placas || ""} ${marca || ""} ${modelo || ""}`.trim();
}

const fmtMoney = (n) =>
  isFinite(Number(n))
    ? Number(n).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : n;

// Normalizers
function normalizeServicio(s) {
  return {
    id: Number(s.id),
    servicio: s.servicio ?? s.nombre ?? "", // nombre visible
    es_correctivo: Boolean(s.es_correctivo ?? false),
    descripcion: s.descripcion ?? "",
    tiempo_estimado: Number(s.tiempo_estimado ?? s.tiempo ?? 0),
    precio: Number(s.precio ?? 0),
    raw: s,
  };
}

function normFactura(f) {
  return {
    id: Number(f.id),
    id_orden_reparacion: Number(
      f.id_orden_reparacion ?? f.id_orden ?? f.orden_id ?? 0
    ),
    fecha: String(f.fecha ?? ""),
    total: Number(f.total ?? 0),
    raw: f,
  };
}


function dateForInput(val) {
  if (!val) return "";
  // ya viene en yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // ISO con hora -> a local yyyy-MM-dd
  const d = new Date(val);
  if (isNaN(d)) return String(val).slice(0, 10);
  const off = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return off.toISOString().slice(0, 10);
}
function todayInput() {
  const d = new Date();
  const off = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return off.toISOString().slice(0, 10);
}

/* ==================== Main content ==================== */

export default function GestionFactura() {
  // URL (?vehiculoId=)
  const [sp] = useSearchParams();
  const vehiculoIdFromURL = Number(sp.get("vehiculoId") || 0);

  // Filtros
  const [q, setQ] = useState("");
  const [estadoFilter, setEstadoFilter] = useState(0); 
  const [vehiculoId, setVehiculoId] = useState(vehiculoIdFromURL || 0);

  // Datos
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);


  const [estadosOrden, setEstadosOrden] = useState([]);
  const estadoOrdenMap = useMemo(() => {
    const m = new Map();
    estadosOrden.forEach((e) => m.set(Number(e.id), String(e.label)));
    return m;
  }, [estadosOrden]);


  const [estadosTrabajo, setEstadosTrabajo] = useState([]);

  const estadoTrabajoMap = useMemo(() => {
    const m = new Map();
    estadosTrabajo.forEach((e) => m.set(Number(e.id), String(e.label)));
    return m;
  }, [estadosTrabajo]);

  // ===== Invoices =====
  const [facturas, setFacturas] = useState([]);
  const factByOrderId = useMemo(() => {
    const m = new Map();
    facturas.forEach((f) => m.set(f.id_orden_reparacion, f));
    return m;
  }, [facturas]);

  // Modales
  const [editing, setEditing] = useState(null);
  const [openOrderModal, setOpenOrderModal] = useState(false);

  const [openServicesPanel, setOpenServicesPanel] = useState(false);
  const [servicesForOrder, setServicesForOrder] = useState(null);

  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(false);

  const [openFacturaModal, setOpenFacturaModal] = useState(false);
  const [facturaTarget, setFacturaTarget] = useState(null); 


  const vehicleMap = useMemo(() => {
    const map = new Map();
    rows.forEach((o) => {
      if (o.vehiculo) map.set(o.vehiculo.id, o.vehiculo);
    });
    return map;
  }, [rows]);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get("/estadoordenreparacion");
        if (!cancelled && Array.isArray(data)) {
          const normalized = data
            .map((e) => ({
              id: Number(e.id ?? e.ID ?? e.codigo ?? e.estado_id ?? 0),
              label: String(
                e.estado ?? e.nombre ?? e.descripcion ?? `Estado ${e.id}`
              ),
            }))
            .sort((a, b) => a.id - b.id);
          setEstadosOrden(normalized);
        }
      } catch {
        setEstadosOrden([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get("/estadotrabajo");
        if (!cancelled && Array.isArray(data)) {
          const normalized = data
            .map((e) => ({
              id: Number(e.id ?? e.ID ?? e.codigo ?? e.estado_id ?? 0),
              label: String(
                e.estado ?? e.descripcion ?? e.nombre ?? `Estado ${e.id}`
              ),
            }))
            .sort((a, b) => a.id - b.id);
          setEstadosTrabajo(normalized);
        }
      } catch {
        setEstadosTrabajo([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);


  //Orders
  const fetchOrdenes = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      let data;
      if (vehiculoId > 0) {
        data = await api.get(`/ordenreparacion/idVehiculo/${vehiculoId}`);
      } else if (estadoFilter > 0) {
        data = await api.get(`/ordenreparacion/estado/${estadoFilter}`);
      } else if (q && /^[A-Za-z0-9-]+$/.test(q)) {
        try {
          data = await api.get(`/ordenreparacion/placas/${q}`);
        } catch {
          data = await api.get("/ordenreparacion");
        }
      } else {
        data = await api.get("/ordenreparacion");
      }

      const list = Array.isArray(data) ? data : [];

      const filtered = list.filter((o) => {
        if (!q) return true;
        const blob = `${o.id} ${o.id_vehiculo} ${o.fecha_ingreso} ${
          o.hora_ingreso
        } ${o.fecha_egreso ?? ""} ${o.hora_egreso ?? ""}`.toLowerCase();
        return blob.includes(q.toLowerCase());
      });

      setRows(filtered);
    } catch (e) {
      setErr(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }, [vehiculoId, estadoFilter, q]);


  const fetchFacturas = useCallback(async () => {
    try {
      const data = await api.get("/factura");
      setFacturas((Array.isArray(data) ? data : []).map(normFactura));
    } catch {
      setFacturas([]);
    }
  }, []);

  useEffect(() => {
    fetchOrdenes();
  }, [fetchOrdenes]);

  useEffect(() => {
    fetchFacturas();
  }, [fetchFacturas]);

  // Handlers
  function openCreate() {
    const defaultEstado = estadosOrden[0]?.id ?? 0; 
    setEditing({
      id: null,
      id_vehiculo: vehiculoId || 0,
      fecha_ingreso: "",
      hora_ingreso: "",
      fecha_egreso: "",
      hora_egreso: "",
      estado: defaultEstado,
    });
    setOpenOrderModal(true);
  }

  function openEdit(order) {
    setEditing({ ...order });
    setOpenOrderModal(true);
  }

  function onDeleteRequest(order) {
    setConfirmDeleteOrder(order);
  }

  async function confirmDeleteOrderFn() {
    if (!confirmDeleteOrder) return;
    setDeletingOrder(true);
    try {
      await api.del(`/ordenreparacion/${confirmDeleteOrder.id}`);
      await fetchOrdenes();
      await fetchFacturas(); 
    } catch (e) {
      alert(e.message || "No se pudo eliminar");
    } finally {
      setDeletingOrder(false);
      setConfirmDeleteOrder(null);
    }
  }

  function openServices(order) {
    setServicesForOrder(order);
    setOpenServicesPanel(true);
  }

  function openFactura(order) {
    const existing = factByOrderId.get(order.id) || null;
    setFacturaTarget({ orden: order, factura: existing });
    setOpenFacturaModal(true);
  }

  return (
    <section className="prose max-w-none px-10">
      <h2>Órdenes de reparación</h2>
      <p className="opacity-70 mb-10">
        Crea, actualiza estados, registra egreso y administra servicios ligados
        a una orden. También puedes generar la factura.
      </p>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div className="join">
          <input
            className="input input-bordered join-item w-[200px]"
            placeholder="Buscar (id, fechas, placas)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="join">
          <input
            type="number"
            className="input input-bordered join-item"
            placeholder="ID Vehículo"
            value={vehiculoId || ""}
            onChange={(e) => setVehiculoId(Number(e.target.value) || 0)}
          />
          <button className="btn join-item" onClick={() => setQ("")}>
            Limpiar
          </button>
        </div>

        <select
          className="select select-bordered"
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(Number(e.target.value))}
        >
          <option value={0}>Todos los estados</option>
          {estadosOrden.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>

        <button className="btn btn-primary" onClick={openCreate}>
          Nueva orden
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            fetchOrdenes();
            fetchFacturas();
          }}
        >
          Recargar
        </button>
      </div>

      {/* Errors */}
      {err && <p className="text-error">{err}</p>}

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Vehículo</th>
              <th>Ingreso</th>
              <th>Egreso</th>
              <th>Estado</th>
              <th>Factura</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <span className="loading loading-spinner loading-sm"></span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7}>Sin registros.</td>
              </tr>
            ) : (
              rows.map((o) => {
                const inv = factByOrderId.get(o.id);
                return (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td title={`Vehículo ${o.id_vehiculo}`}>
                      {vehicleLabel(o.vehiculo) || `ID ${o.id_vehiculo}`}
                    </td>
                    <td>
                      {o.fecha_ingreso} {o.hora_ingreso}
                    </td>
                    <td>
                      {o.fecha_egreso ? (
                        `${o.fecha_egreso} ${o.hora_egreso}`
                      ) : (
                        <span className="opacity-60">—</span>
                      )}
                    </td>
                    <td>
                      <span className={estadoBadge(o.estado)}>
                        {estadoOrdenMap.get(Number(o.estado)) ||
                          `Estado ${o.estado}`}
                      </span>
                    </td>
                    <td>
                      {inv ? (
                        <span
                          className="badge badge-success"
                          title={`Factura #${inv.id}`}
                        >
                          #{inv.id} — ${fmtMoney(inv.total)}
                        </span>
                      ) : (
                        <span className="badge badge-ghost">Sin factura</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="join">
                        <button
                          className="btn btn-outline btn-sm join-item"
                          onClick={() => openServices(o)}
                        >
                          Servicios
                        </button>
                        <button
                          className="btn btn-ghost btn-sm join-item"
                          onClick={() => openEdit(o)}
                        >
                          Editar
                        </button>
                        <button
                          className={`btn btn-sm join-item ${
                            factByOrderId.has(o.id)
                              ? "btn-outline"
                              : "btn-secondary"
                          }`}
                          onClick={() => openFactura(o)}
                        >
                          {factByOrderId.has(o.id)
                            ? "Editar factura"
                            : "Generar factura"}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm text-error join-item"
                          onClick={() => onDeleteRequest(o)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {openOrderModal && (
        <OrdenModal
          initial={editing}
          estadosOrden={estadosOrden}
          estadoOrdenMap={estadoOrdenMap}
          onClose={() => setOpenOrderModal(false)}
          onSaved={async () => {
            setOpenOrderModal(false);
            await fetchOrdenes();
          }}
        />
      )}

      {openServicesPanel && servicesForOrder && (
        <ServiciosOrdenPanel
          orden={servicesForOrder}
          estadosTrabajo={estadosTrabajo}
          estadoTrabajoMap={estadoTrabajoMap}
          onClose={() => setOpenServicesPanel(false)}
        />
      )}

      {openFacturaModal && facturaTarget && (
        <FacturaModal
          orden={facturaTarget.orden}
          factura={facturaTarget.factura}
          onClose={() => setOpenFacturaModal(false)}
          onSaved={async () => {
            setOpenFacturaModal(false);
            await fetchFacturas();
          }}
        />
      )}

      {confirmDeleteOrder && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error">
              Confirmar eliminación
            </h3>
            <p className="py-4">
              ¿Seguro que deseas eliminar la orden{" "}
              <strong>#{confirmDeleteOrder.id}</strong>? Esta acción no se puede
              deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="btn"
                onClick={() => setConfirmDeleteOrder(null)}
                disabled={deletingOrder}
              >
                Cancelar
              </button>
              <button
                className="btn btn-error"
                onClick={confirmDeleteOrderFn}
                disabled={deletingOrder}
              >
                {deletingOrder ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => !deletingOrder && setConfirmDeleteOrder(null)}
          ></div>
        </div>
      )}
    </section>
  );
}

/* ==================== Modal order ==================== */

function OrdenModal({
  initial,
  estadosOrden,
  estadoOrdenMap,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(() => ({ ...initial }));
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  function upd(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        const diffs = diffOrden(initial, form);
        for (const [columnName, value] of Object.entries(diffs)) {
          await api.put(`/ordenreparacion/${initial.id}`, {
            columnName,
            value,
          });
        }
      } else {
        const body = {
          id_vehiculo: Number(form.id_vehiculo),
          fecha_ingreso: String(form.fecha_ingreso || ""),
          hora_ingreso: String(form.hora_ingreso || ""),
          estado: Number(form.estado || estadosOrden[0]?.id || 0),
        };
        await api.post("/ordenreparacion", body);
      }
      await onSaved?.();
    } catch (e) {
      alert(e.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">
          {isEdit ? "Editar orden" : "Nueva orden"}
        </h3>

        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
          onSubmit={onSubmit}
        >
          {/* Vehículo */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">ID Vehículo</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              value={form.id_vehiculo || ""}
              onChange={(e) => upd("id_vehiculo", Number(e.target.value))}
              required={!isEdit}
              disabled={isEdit}
            />
          </div>

          {/* Estado de la ORDEN  */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Estado</span>
            </label>
            <select
              className="select select-bordered"
              value={form.estado || (estadosOrden[0]?.id ?? 0)}
              onChange={(e) => upd("estado", Number(e.target.value))}
            >
              {estadosOrden.length ? (
                estadosOrden.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))
              ) : (
                <option value={form.estado || 0}>
                  {estadoOrdenMap.get(Number(form.estado)) ||
                    `Estado ${form.estado || 0}`}
                </option>
              )}
            </select>
          </div>

          {/* Ingreso */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Fecha ingreso</span>
            </label>
            <input
              type="date"
              className="input input-bordered"
              value={form.fecha_ingreso || ""}
              onChange={(e) => upd("fecha_ingreso", e.target.value)}
              required={!isEdit}
              disabled={isEdit}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Hora ingreso</span>
            </label>
            <input
              type="time"
              className="input input-bordered"
              value={form.hora_ingreso || ""}
              onChange={(e) => upd("hora_ingreso", e.target.value)}
              required={!isEdit}
              disabled={isEdit}
            />
          </div>

          {/* Egreso */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Fecha egreso</span>
            </label>
            <input
              type="date"
              className="input input-bordered"
              value={form.fecha_egreso || ""}
              onChange={(e) => upd("fecha_egreso", e.target.value)}
              disabled={!isEdit}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Hora egreso</span>
            </label>
            <input
              type="time"
              className="input input-bordered"
              value={form.hora_egreso || ""}
              onChange={(e) => upd("hora_egreso", e.target.value)}
              disabled={!isEdit}
            />
          </div>

          {/* Acciones */}
          <div className="md:col-span-2 flex justify-end gap-2 mt-6">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}

function diffOrden(initial, next) {
  const map = {
    id_vehiculo: "id_vehiculo",
    fecha_ingreso: "fecha_ingreso",
    hora_ingreso: "hora_ingreso",
    fecha_egreso: "fecha_egreso",
    hora_egreso: "hora_egreso",
    estado: "estado",
  };
  const diffs = {};
  Object.keys(map).forEach((k) => {
    const a = initial?.[k];
    const b = next?.[k];
    if (String(a ?? "") !== String(b ?? "")) diffs[map[k]] = b;
  });
  return diffs;
}

/* ==================== Service of order ==================== */

function ServiciosOrdenPanel({
  orden,
  estadosTrabajo,
  estadoTrabajoMap,
  onClose,
}) {
  const [svc, setSvc] = useState([]);
  const [svcLoading, setSvcLoading] = useState(false);

  const [lines, setLines] = useState([]);
  const [linesLoading, setLinesLoading] = useState(false);

  const [err, setErr] = useState(null);
  const [openSvcModal, setOpenSvcModal] = useState(false);
  const [editingSvc, setEditingSvc] = useState(null);

  const [openLineModal, setOpenLineModal] = useState(false);
  const [editingLine, setEditingLine] = useState(null);

  const [confirmDeleteLine, setConfirmDeleteLine] = useState(null);
  const [deletingLine, setDeletingLine] = useState(false);

  const [confirmDeleteSvc, setConfirmDeleteSvc] = useState(null);
  const [deletingSvc, setDeletingSvc] = useState(false);

  // Cargar catálogo
  const fetchServicios = useCallback(async () => {
    setSvcLoading(true);
    try {
      const data = await api.get("/servicio");
      const list = Array.isArray(data) ? data : [];
      setSvc(list.map(normalizeServicio));
    } catch (e) {
      setErr(e.message || "No se pudieron cargar los servicios");
    } finally {
      setSvcLoading(false);
    }
  }, []);


  const fetchLines = useCallback(async () => {
    setLinesLoading(true);
    setErr(null);
    try {
      const all = await api.get("/servicioordenreparacion");
      const arr = Array.isArray(all) ? all : [];
      const ordenId = Number(orden.id);
      const filtered = arr.filter(
        (r) =>
          Number(r.id_orden_reparacion ?? r.id_orden ?? r.idOrden) === ordenId
      );
      setLines(filtered);
    } catch (e) {
      setErr(e.message || "No se pudieron cargar los servicios de la orden");
    } finally {
      setLinesLoading(false);
    }
  }, [orden.id]);

  useEffect(() => {
    fetchServicios();
    fetchLines();
  }, [fetchServicios, fetchLines]);

  function openCreateSvc() {
    setEditingSvc({
      id: null,
      servicio: "",
      es_correctivo: false,
      descripcion: "",
      tiempo_estimado: 0,
      precio: 0,
    });
    setOpenSvcModal(true);
  }
  function openEditSvc(s) {
    setEditingSvc({ ...s });
    setOpenSvcModal(true);
  }

  function openCreateLine() {
    const defaultEstado = estadosTrabajo[0]?.id ?? 0;
    setEditingLine({
      id: null,
      id_orden_reparacion: orden.id,
      id_servicio: 0,
      id_estado_trabajo: defaultEstado,
    });
    setOpenLineModal(true);
  }
  function openEditLine(line) {
    setEditingLine({ ...line });
    setOpenLineModal(true);
  }

  function onDeleteLineRequest(line) {
    setConfirmDeleteLine(line);
  }
  async function confirmDeleteLineFn() {
    if (!confirmDeleteLine) return;
    setDeletingLine(true);
    try {
      await api.del(`/servicioordenreparacion/${confirmDeleteLine.id}`);
      await fetchLines();
    } catch (e) {
      alert(e.message || "No se pudo eliminar la línea");
    } finally {
      setDeletingLine(false);
      setConfirmDeleteLine(null);
    }
  }

  function onDeleteSvcRequest(svcItem) {
    setConfirmDeleteSvc(svcItem);
  }
  async function confirmDeleteSvcFn() {
    if (!confirmDeleteSvc) return;
    setDeletingSvc(true);
    try {
      await api.del(`/servicio/${confirmDeleteSvc.id}`);
      await fetchServicios();
    } catch (e) {
      alert(e.message || "No se pudo eliminar el servicio");
    } finally {
      setDeletingSvc(false);
      setConfirmDeleteSvc(null);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-6xl">
        <h3 className="font-bold text-lg">Servicios de la orden #{orden.id}</h3>
        {err && <p className="text-error">{err}</p>}

        {/* Líneas asociadas */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <h4 className="m-0">Servicios asociados</h4>
            <button className="btn btn-primary btn-sm" onClick={openCreateLine}>
              Añadir a la orden
            </button>
          </div>
          <div className="overflow-x-auto mt-2">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Servicio</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {linesLoading ? (
                  <tr>
                    <td colSpan={4}>
                      <span className="loading loading-spinner loading-sm"></span>
                    </td>
                  </tr>
                ) : lines.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Sin servicios en esta orden.</td>
                  </tr>
                ) : (
                  lines.map((l) => (
                    <tr key={l.id}>
                      <td>{l.id}</td>
                      <td>
                        {svc.find((s) => s.id === Number(l.id_servicio))
                          ?.servicio || l.id_servicio}
                      </td>
                      <td>
                        <span className={estadoBadge(l.id_estado_trabajo)}>
                          {estadoTrabajoMap.get(Number(l.id_estado_trabajo)) ||
                            `Estado ${l.id_estado_trabajo}`}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="join">
                          <button
                            className="btn btn-ghost btn-sm join-item"
                            onClick={() => openEditLine(l)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-ghost btn-sm text-error join-item"
                            onClick={() => onDeleteLineRequest(l)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Catálogo de servicios */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h4 className="m-0">Catálogo de servicios</h4>
            <button className="btn btn-outline btn-sm" onClick={openCreateSvc}>
              Nuevo servicio
            </button>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Servicio</th>
                  <th>Correctivo</th>
                  <th>Tiempo (min)</th>
                  <th>Precio</th>
                  <th>Descripción</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {svcLoading ? (
                  <tr>
                    <td colSpan={7}>
                      <span className="loading loading-spinner loading-sm"></span>
                    </td>
                  </tr>
                ) : svc.length === 0 ? (
                  <tr>
                    <td colSpan={7}>Sin servicios en el catálogo.</td>
                  </tr>
                ) : (
                  svc.map((s) => (
                    <tr key={s.id}>
                      <td>{s.id}</td>
                      <td>{s.servicio || "-"}</td>
                      <td>{s.es_correctivo ? "Sí" : "No"}</td>
                      <td>{s.tiempo_estimado}</td>
                      <td>{s.precio}</td>
                      <td>{s.descripcion || "-"}</td>
                      <td className="text-right">
                        <div className="join">
                          <button
                            className="btn btn-ghost btn-sm join-item"
                            onClick={() => openEditSvc(s)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-ghost btn-sm text-error join-item"
                            onClick={() => onDeleteSvcRequest(s)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>

      {/* Sub-modales */}
      {openSvcModal && (
        <ServicioModal
          initial={editingSvc}
          onClose={() => setOpenSvcModal(false)}
          onSaved={async () => {
            setOpenSvcModal(false);
            await fetchServicios();
          }}
        />
      )}

      {openLineModal && (
        <LineaServicioModal
          initial={editingLine}
          servicios={svc}
          estadosTrabajo={estadosTrabajo}
          onClose={() => setOpenLineModal(false)}
          onSaved={async () => {
            setOpenLineModal(false);
            await fetchLines();
          }}
        />
      )}

      {confirmDeleteLine && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error">
              Quitar servicio de la orden
            </h3>
            <p className="py-4">
              ¿Seguro que deseas eliminar la línea{" "}
              <strong>#{confirmDeleteLine.id}</strong> de la orden{" "}
              <strong>#{orden.id}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="btn"
                onClick={() => setConfirmDeleteLine(null)}
                disabled={deletingLine}
              >
                Cancelar
              </button>
              <button
                className="btn btn-error"
                onClick={confirmDeleteLineFn}
                disabled={deletingLine}
              >
                {deletingLine ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => !deletingLine && setConfirmDeleteLine(null)}
          ></div>
        </div>
      )}

      {confirmDeleteSvc && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error">
              Eliminar servicio del catálogo
            </h3>
            <p className="py-4">
              ¿Seguro que deseas eliminar el servicio{" "}
              <strong>
                {confirmDeleteSvc.servicio ||
                  `Servicio #${confirmDeleteSvc.id}`}
              </strong>
              ?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="btn"
                onClick={() => setConfirmDeleteSvc(null)}
                disabled={deletingSvc}
              >
                Cancelar
              </button>
              <button
                className="btn btn-error"
                onClick={confirmDeleteSvcFn}
                disabled={deletingSvc}
              >
                {deletingSvc ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => !deletingSvc && setConfirmDeleteSvc(null)}
          ></div>
        </div>
      )}
    </div>
  );
}

/* ==================== Modal CRUD Service ==================== */

function ServicioModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({ ...initial }));
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  function upd(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        const diffs = diffGeneric(initial, form, [
          "servicio",
          "es_correctivo",
          "descripcion",
          "tiempo_estimado",
          "precio",
        ]);
        for (const [columnName, value] of Object.entries(diffs)) {
          await api.put(`/servicio/${initial.id}`, { columnName, value });
        }
      } else {
        const body = {
          servicio: String(form.servicio || ""),
          es_correctivo: Boolean(form.es_correctivo || false),
          descripcion: String(form.descripcion || ""),
          tiempo_estimado: Number(form.tiempo_estimado || 0),
          precio: Number(form.precio || 0),
        };
        await api.post("/servicio", body);
      }
      await onSaved?.();
    } catch (e) {
      alert(e.message || "No se pudo guardar el servicio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-lg">
          {isEdit ? "Editar servicio" : "Nuevo servicio"}
        </h3>

        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
          onSubmit={onSubmit}
        >
          <div className="form-control">
            <label className="label">
              <span className="label-text">Servicio</span>
            </label>
            <input
              className="input input-bordered"
              value={form.servicio || ""}
              onChange={(e) => upd("servicio", e.target.value)}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Tiempo estimado (min)</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              value={form.tiempo_estimado ?? 0}
              onChange={(e) => upd("tiempo_estimado", Number(e.target.value))}
              min={0}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Precio</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              value={form.precio ?? 0}
              onChange={(e) => upd("precio", Number(e.target.value))}
              min={0}
              step="0.01"
            />
          </div>

          <div className="form-control flex items-center">
            <label className="label">
              <span className="label-text mx-4 mt-6">Correctivo</span>
            </label>
            <input
              type="checkbox"
              className="toggle mt-6"
              checked={!!form.es_correctivo}
              onChange={(e) => upd("es_correctivo", e.target.checked)}
            />
          </div>

          <div className="form-control mt-2 w-[350px]">
            <label className="label">
              <span className="label-text mr-6">Descripción</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              value={form.descripcion || ""}
              onChange={(e) => upd("descripcion", e.target.value)}
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 mt-6">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}

/* ==================== Modal Líne Service-Order ==================== */

function LineaServicioModal({
  initial,
  servicios,
  estadosTrabajo,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(() => ({ ...initial }));
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  function upd(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        const diffs = diffGeneric(initial, form, [
          "id_servicio",
          "id_estado_trabajo",
        ]);
        for (const [columnName, value] of Object.entries(diffs)) {
          await api.put(`/servicioordenreparacion/${initial.id}`, {
            columnName,
            value,
          });
        }
      } else {
        const body = {
          id_orden_reparacion: Number(form.id_orden_reparacion),
          id_servicio: Number(form.id_servicio),
          id_estado_trabajo: Number(
            form.id_estado_trabajo || estadosTrabajo[0]?.id || 0
          ),
        };
        await api.post("/servicioordenreparacion", body);
      }
      await onSaved?.();
    } catch (e) {
      alert(e.message || "No se pudo guardar la línea");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-lg">
          {isEdit
            ? "Editar servicio de la orden"
            : "Añadir servicio a la orden"}
        </h3>

        <form className="grid grid-cols-1 gap-4 mt-4" onSubmit={onSubmit}>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Servicio</span>
            </label>
            <select
              className="select select-bordered ml-6"
              value={form.id_servicio || 0}
              onChange={(e) => upd("id_servicio", Number(e.target.value))}
              required
            >
              <option value={0} disabled>
                Seleccione
              </option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.servicio || `Servicio ${s.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Estado</span>
            </label>
            <select
              className="select select-bordered ml-8"
              value={form.id_estado_trabajo || estadosTrabajo[0]?.id || 0}
              onChange={(e) => upd("id_estado_trabajo", Number(e.target.value))}
            >
              {estadosTrabajo.length ? (
                estadosTrabajo.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))
              ) : (
                <option value={form.id_estado_trabajo || 0}>
                  {form.id_estado_trabajo || 0}
                </option>
              )}
            </select>
          </div>

          {/* Hidden order id */}
          <input type="hidden" value={form.id_orden_reparacion} readOnly />

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}

/* ==================== Modal Invoice ==================== */

function FacturaModal({ orden, factura, onClose, onSaved }) {
  const isEdit = Boolean(factura?.id);

  const [form, setForm] = useState(() => ({
    id_orden_reparacion: Number(orden?.id || factura?.id_orden_reparacion || 0),
    fecha: dateForInput(factura?.fecha || todayInput()),
    total: Number(factura?.total ?? 0),
  }));
  const [saving, setSaving] = useState(false);


  const [lines, setLines] = useState([]);
  const [svc, setSvc] = useState([]);

  const upd = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const allLines = await api.get("/servicioordenreparacion");
        const ordenId = Number(orden.id);
        const filtered = (Array.isArray(allLines) ? allLines : []).filter(
          (r) =>
            Number(r.id_orden_reparacion ?? r.id_orden ?? r.idOrden) === ordenId
        );
        setLines(filtered);
      } catch {
        setLines([]);
      }
      try {
        const data = await api.get("/servicio");
        setSvc(
          (Array.isArray(data) ? data : []).map((s) => ({
            id: Number(s.id),
            nombre: String(s.servicio ?? s.nombre ?? ""),
            precio: Number(s.precio ?? 0),
          }))
        );
      } catch {
        setSvc([]);
      }
    })();
  }, [orden.id]);

  const sugerido = useMemo(() => {
    const map = new Map(svc.map((s) => [s.id, s]));
    return lines.reduce(
      (acc, l) => acc + (map.get(Number(l.id_servicio))?.precio ?? 0),
      0
    );
  }, [lines, svc]);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        const diffs = {};
        if (dateForInput(factura.fecha || "") !== dateForInput(form.fecha || ""))
          diffs["fecha"] = dateForInput(form.fecha);
        if (Number(factura.total ?? 0) !== Number(form.total ?? 0))
          diffs["total"] = Number(form.total);

        for (const [columnName, value] of Object.entries(diffs)) {
          await api.put(`/factura/${factura.id}`, {
            columnName,
            value: String(value),
          });
        }
      } else {
        await api.post("/factura", {
          id_orden_reparacion: Number(form.id_orden_reparacion),
          fecha: dateForInput(form.fecha || todayInput()),
          total: Number(form.total || 0),
        });
      }
      await onSaved?.();
    } catch (e) {
      alert(e.message || "No se pudo guardar la factura");
    } finally {
      setSaving(false);
    }
  }

  function descargarPDF() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("PitStop Manager", 15, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Factura #${factura?.id ?? "-"}`, 15, (y += 6));

    doc.setFont("helvetica", "normal");
    const right = (txt, yy) => doc.text(txt, pageW - 15, yy, { align: "right" });
    right(`Fecha: ${dateForInput(form.fecha)}`, 15);
    right(`Orden: #${orden?.id}`, 21);
    const veh =
      orden?.vehiculo
        ? `${orden.vehiculo.placas ?? ""} ${orden.vehiculo.marca ?? ""} ${orden.vehiculo.modelo ?? ""}`.trim()
        : `ID ${orden?.id_vehiculo}`;
    right(`Vehículo: ${veh}`, 27);

    y = 32;
    doc.setDrawColor(180);
    doc.line(15, y, pageW - 15, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Detalle", 15, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("#", 15, y);
    doc.text("Servicio", 25, y);
    right("Precio", y);
    y += 4;

    doc.setDrawColor(200);
    doc.line(15, y, pageW - 15, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    const serviciosRender = (() => {
      const map = new Map(svc.map((s) => [s.id, s]));
      return lines.map((l) => {
        const s = map.get(Number(l.id_servicio));
        return {
          id: l.id,
          nombre: s?.nombre ?? `Servicio #${l.id_servicio}`,
          precio: s?.precio ?? 0,
        };
      });
    })();

    if (serviciosRender.length === 0) {
      doc.text("Sin servicios asociados", 25, y);
      y += 6;
    } else {
      serviciosRender.forEach((it, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 15;
        }
        doc.text(String(idx + 1), 15, y);
        const maxWidth = pageW - 15 - 15 - 30; 
        const lines = doc.splitTextToSize(it.nombre, maxWidth);
        doc.text(lines, 25, y);
        right(`$${Number(it.precio).toFixed(2)}`, y);
        y += 6 + (lines.length - 1) * 5;
      });
    }

    // Totald
    y += 4;
    doc.setDrawColor(200);
    doc.line(15, y, pageW - 15, y);
    y += 8;

    const totalStr = `$${Number(form.total ?? 0).toFixed(2)}`;
    doc.setFont("helvetica", "bold");
    right("Total", y);
    right(totalStr, (y += 6));

    doc.save(`Factura_${orden.id}.pdf`);
  }

  const fmt = (n) =>
    isFinite(Number(n))
      ? Number(n).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : n;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-lg">
            {isEdit
              ? `Editar factura #${factura.id}`
              : `Generar factura (Orden #${orden.id})`}
          </h3>
          <button className="btn btn-outline btn-sm" onClick={descarargarPDFSafe}>
            Descargar PDF
          </button>
        </div>

        {/* Formulario de edición/creación */}
        <form
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4"
          onSubmit={onSubmit}
        >
          <div className="form-control">
            <label className="label">
              <span className="label-text">Orden</span>
            </label>
            <input
              className="input input-bordered"
              value={form.id_orden_reparacion}
              disabled
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Fecha</span>
            </label>
            <input
              type="date"
              className="input input-bordered"
              value={dateForInput(form.fecha) || ""}
              onChange={(e) => upd("fecha", e.target.value)}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Total</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input input-bordered"
              value={form.total ?? 0}
              onChange={(e) => upd("total", Number(e.target.value))}
              required
            />
            <label className="label">
              <span className="label-text-alt">
                Sugerido por servicios: ${fmt(sugerido)}
              </span>
            </label>
          </div>

          <div className="md:col-span-3 flex justify-end gap-2 mt-2">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving
                ? "Guardando..."
                : isEdit
                ? "Actualizar"
                : "Crear factura"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );

  function descarargarPDFSafe() {
    try {
      descargarPDF();
    } catch (e) {
      console.error(e);
      alert("No se pudo generar el PDF.");
    }
  }
}

/* ==================== utils generics==================== */

function diffGeneric(initial, next, keys) {
  const diffs = {};
  keys.forEach((k) => {
    const a = initial?.[k];
    const b = next?.[k];
    if (String(a ?? "") !== String(b ?? "")) diffs[k] = b;
  });
  return diffs;
}
