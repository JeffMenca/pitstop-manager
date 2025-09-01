import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { useSearchParams } from "react-router-dom";

/* ==================== helpers ==================== */

// Clase de badge por id de estado (colores orientativos)
function estadoBadge(id) {
  const n = Number(id);
  if (n === 1) return "badge badge-warning"; // Pendiente
  if (n === 2) return "badge badge-error"; // Cancelado
  if (n === 3) return "badge badge-success";    // Aprobado 
  if (n === 4) return "badge badge-info"; // En curso
  if (n === 5) return "badge badge-success"; // COmpletado
  return "badge badge-ghost";
}

function vehicleLabel(v) {
  if (!v) return "";
  const { placas, marca, modelo } = v;
  return `${placas || ""} ${marca || ""} ${modelo || ""}`.trim();
}

// Normaliza un servicio desde el backend a la forma que usamos
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

/* ==================== Página principal ==================== */

export default function GestionOrdenes() {
  // URL (?vehiculoId=)
  const [sp] = useSearchParams();
  const vehiculoIdFromURL = Number(sp.get("vehiculoId") || 0);

  // Filtros
  const [q, setQ] = useState("");
  const [estadoFilter, setEstadoFilter] = useState(0); // 0 = todos
  const [vehiculoId, setVehiculoId] = useState(vehiculoIdFromURL || 0);

  // Datos
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // ===== Estados de la ORDEN (vía /estadoordenreparacion) =====
  const [estadosOrden, setEstadosOrden] = useState([]);
  const estadoOrdenMap = useMemo(() => {
    const m = new Map();
    estadosOrden.forEach((e) => m.set(Number(e.id), String(e.label)));
    return m;
  }, [estadosOrden]);

  // ===== Estados de TRABAJO (líneas/servicios) vía /estadotrabajo =====
  const [estadosTrabajo, setEstadosTrabajo] = useState([]);
  const estadoTrabajoMap = useMemo(() => {
    const m = new Map();
    estadosTrabajo.forEach((e) => m.set(Number(e.id), String(e.label)));
    return m;
  }, [estadosTrabajo]);

  // Modales
  const [editing, setEditing] = useState(null);
  const [openOrderModal, setOpenOrderModal] = useState(false);
  const [openServicesPanel, setOpenServicesPanel] = useState(false);
  const [servicesForOrder, setServicesForOrder] = useState(null);
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(false);

  // Cache ligera de vehículos (si el backend los incluye embebidos)
  const vehicleMap = useMemo(() => {
    const map = new Map();
    rows.forEach((o) => {
      if (o.vehiculo) map.set(o.vehiculo.id, o.vehiculo);
    });
    return map;
  }, [rows]);

  // Cargar estados de la ORDEN una sola vez
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

  // Cargar estados de TRABAJO (para líneas/servicios) una sola vez
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

  // Cargar órdenes
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
        // Si escriben placas y tienes ese endpoint
        try {
          data = await api.get(`/ordenreparacion/placas/${q}`);
        } catch {
          data = await api.get("/ordenreparacion");
        }
      } else {
        data = await api.get("/ordenreparacion");
      }

      const list = Array.isArray(data) ? data : [];

      // Filtro sencillo adicional por texto
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

  useEffect(() => {
    fetchOrdenes();
  }, [fetchOrdenes]);

  // Handlers
  function openCreate() {
    const defaultEstado = estadosOrden[0]?.id ?? 0; // estado de la ORDEN
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

  return (
    <section className="prose max-w-none px-10">
      <h2>Órdenes de reparación</h2>
      <p className="opacity-70 mb-10">
        Crea, actualiza estados, registra egreso y administra servicios ligados
        a una orden.
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
          <button className="btn join-item mr-10" onClick={() => setQ("")}>
            Limpiar
          </button>
        </div>

        <input
          type="number"
          className="input input-bordered"
          placeholder="ID Vehículo"
          value={vehiculoId || ""}
          onChange={(e) => setVehiculoId(Number(e.target.value) || 0)}
        />

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
        <button className="btn btn-ghost" onClick={fetchOrdenes}>
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
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <span className="loading loading-spinner loading-sm"></span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6}>Sin registros.</td>
              </tr>
            ) : (
              rows.map((o) => (
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
                        className="btn btn-ghost btn-sm text-error join-item"
                        onClick={() => onDeleteRequest(o)}
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

      {/* Modales */}
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

/* ==================== Modal de Orden ==================== */

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
        // PUT columna a columna
        const diffs = diffOrden(initial, form);
        for (const [columnName, value] of Object.entries(diffs)) {
          await api.put(`/ordenreparacion/${initial.id}`, {
            columnName,
            value,
          });
        }
      } else {
        // POST crear (incluye estado de la ORDEN)
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

          {/* Estado de la ORDEN (seleccionable también al crear) */}
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

/* ==================== Panel Servicios de la Orden ==================== */

function ServiciosOrdenPanel({
  orden,
  estadosTrabajo,
  estadoTrabajoMap,
  onClose,
}) {
  // Catálogo
  const [svc, setSvc] = useState([]);
  const [svcLoading, setSvcLoading] = useState(false);

  // Líneas (servicio-orden)
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

  // Cargar líneas de la orden (obtenemos todas y filtramos por id_orden_reparacion)
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
              ? Esta acción no se puede deshacer.
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

/* ==================== Modal CRUD Servicio ==================== */

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
        // Campos válidos para PUT (coinciden con nombres del backend)
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
        // POST crear con las keys exactas del backend
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

/* ==================== Modal Línea Servicio-Orden ==================== */

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

/* ==================== util genérico ==================== */

function diffGeneric(initial, next, keys) {
  const diffs = {};
  keys.forEach((k) => {
    const a = initial?.[k];
    const b = next?.[k];
    if (String(a ?? "") !== String(b ?? "")) diffs[k] = b;
  });
  return diffs;
}
