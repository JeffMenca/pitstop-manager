// src/pages/GestionPagosProveedores.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";

/* ==================== helpers ==================== */

const nz = (v, f = "") => v ?? f;
const nn = (v, f = 0) => Number(v ?? f);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtMoney = (n) =>
  isFinite(Number(n))
    ? Number(n).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : n;


function estadoPagoBadge(status) {
  switch (status) {
    case "PENDIENTE":
      return "badge badge-warning";
    case "PARCIAL":
      return "badge badge-info";
    case "PAGADO":
      return "badge badge-success";
    default:
      return "badge badge-ghost";
  }
}

// normalizaers
function normProveedor(p) {
  return {
    id: nn(p.id),
    nombre: nz(p.nombre_empresa ?? p.nombre ?? `Proveedor #${p.id}`),
    descripcion: nz(p.descripcion ?? ""),
    es_servicio: Boolean(p.es_servicio ?? false),
    raw: p,
  };
}
function normProvRep(pr) {
  return {
    id: nn(pr.id),
    id_proveedor: nn(pr.id_proveedor),
    id_repuesto: nn(pr.id_repuesto),
    precio: Number(pr.precio ?? 0),
    raw: pr,
  };
}
function normPedido(p) {
  return {
    id: nn(p.id),
    fecha_pedido: nz(p.fecha_pedido ?? ""),
    fecha_entrega: nz(p.fecha_entrega ?? ""),
    estado: nn(p.estado ?? 0),
    raw: p,
  };
}
function normPedDet(d) {
  return {
    id: nn(d.id),
    id_pedido: nn(d.id_pedido),
    id_proveedor_repuesto: nn(d.id_proveedor_repuesto),
    estado: nn(d.estado ?? 0),
    cantidad_solicitada: nn(d.cantidad_solicitada ?? 0),
    raw: d,
  };
}
function normFactura(f) {
  return {
    id: nn(f.id),
    id_orden_reparacion: nn(
      f.id_orden_reparacion ?? f.id_orden ?? f.orden_id ?? 0
    ), 
    fecha: String(nz(f.fecha, "")),
    total: Number(f.total ?? 0),
    raw: f,
  };
}
function normPago(p) {
  return {
    id: nn(p.id),
    id_factura: nn(p.id_factura),
    monto: Number(p.monto ?? 0),
    fecha: String(nz(p.fecha, "")),
    raw: p,
  };
}

/* ==================== Main content ==================== */

export default function GestionPagosProveedores() {
  // datos base
  const [proveedores, setProveedores] = useState([]);
  const [provRep, setProvRep] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [pagos, setPagos] = useState([]);

  // ui
  const [q, setQ] = useState("");
  const [provFilter, setProvFilter] = useState(0); 
  const [statusFilter, setStatusFilter] = useState("ALL"); 
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // modals
  const [openPagoModal, setOpenPagoModal] = useState(false);
  const [pagoTarget, setPagoTarget] = useState(null); 

  const [openVerPagos, setOpenVerPagos] = useState(false);
  const [facturaForList, setFacturaForList] = useState(null);

  const [openEditFactura, setOpenEditFactura] = useState(false);
  const [facturaEdit, setFacturaEdit] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [provRaw, provRepRaw, pedRaw, detRaw, facRaw, pagRaw] =
        await Promise.all([
          api.get("/proveedor"),
          api.get("/proveedorrepuesto"),
          api.get("/pedido"),
          api.get("/pedidodetalle"),
          api.get("/factura"),
          api.get("/pago"),
        ]);

      setProveedores(
        (Array.isArray(provRaw) ? provRaw : []).map(normProveedor)
      );
      setProvRep(
        (Array.isArray(provRepRaw) ? provRepRaw : []).map(normProvRep)
      );
      setPedidos((Array.isArray(pedRaw) ? pedRaw : []).map(normPedido));
      setDetalles((Array.isArray(detRaw) ? detRaw : []).map(normPedDet));
      setFacturas((Array.isArray(facRaw) ? facRaw : []).map(normFactura));
      setPagos((Array.isArray(pagRaw) ? pagRaw : []).map(normPago));
    } catch (e) {
      setErr(e.message || "No se pudo cargar la información");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* --------------------------- maps y joins --------------------------- */

  const proveedorMap = useMemo(() => {
    const m = new Map();
    proveedores.forEach((p) => m.set(p.id, p));
    return m;
  }, [proveedores]);

  const provRepMap = useMemo(() => {
    const m = new Map();
    provRep.forEach((r) => m.set(r.id, r));
    return m;
  }, [provRep]);

  const detallesByPedido = useMemo(() => {
    const m = new Map();
    detalles.forEach((d) => {
      const arr = m.get(d.id_pedido) || [];
      arr.push(d);
      m.set(d.id_pedido, arr);
    });
    return m;
  }, [detalles]);

  const pagosByFactura = useMemo(() => {
    const m = new Map();
    pagos.forEach((p) => {
      const arr = m.get(p.id_factura) || [];
      arr.push(p);
      m.set(p.id_factura, arr);
    });
    return m;
  }, [pagos]);


  function computeProveedorDeFactura(f) {
    const pedidoId = f.id_orden_reparacion;
    const dets = detallesByPedido.get(pedidoId) || [];
    const provIds = new Set(
      dets
        .map((d) => provRepMap.get(d.id_proveedor_repuesto)?.id_proveedor)
        .filter(Boolean)
    );
    if (provIds.size === 1) {
      const only = [...provIds][0];
      return (
        proveedorMap.get(only) || { id: only, nombre: `Proveedor #${only}` }
      );
    }
    if (provIds.size > 1) {
      return { id: 0, nombre: `Mixto (${provIds.size})` };
    }
    return null;
  }


  function computeSugeridoFactura(f) {
    const pedidoId = f.id_orden_reparacion;
    const dets = detallesByPedido.get(pedidoId) || [];
    return dets.reduce((acc, d) => {
      const link = provRepMap.get(d.id_proveedor_repuesto);
      const precio = Number(link?.precio ?? 0);
      return acc + precio * Number(d.cantidad_solicitada ?? 0);
    }, 0);
  }


  const facturasView = useMemo(() => {
    return facturas.map((f) => {
      const pagosArr = pagosByFactura.get(f.id) || [];
      const pagado = pagosArr.reduce((a, p) => a + (p.monto || 0), 0);
      const pendiente = Math.max(0, (f.total || 0) - pagado);
      const status =
        pagado <= 0
          ? "PENDIENTE"
          : pagado >= (f.total || 0)
          ? "PAGADO"
          : "PARCIAL";
      const proveedor = computeProveedorDeFactura(f); // puede ser null
      const pedido =
        pedidos.find((p) => p.id === f.id_orden_reparacion) || null;
      const sugerido = computeSugeridoFactura(f);
      return { f, proveedor, pedido, pagado, pendiente, status, sugerido };
    });

  }, [
    facturas,
    pagosByFactura,
    detallesByPedido,
    provRepMap,
    proveedores,
    pedidos,
  ]);

  // Filters
  const filteredRows = useMemo(() => {
    let out = facturasView;
    if (provFilter) {
      out = out.filter((r) => (r.proveedor?.id || 0) === Number(provFilter));
    }
    if (statusFilter !== "ALL") {
      out = out.filter((r) => r.status === statusFilter);
    }
    if (q) {
      const qq = q.toLowerCase();
      out = out.filter((r) => {
        const blob = `${r.f.id} ${r.f.fecha} ${r.f.total} ${
          r.pedido?.id ?? ""
        } ${r.proveedor?.nombre ?? ""}`.toLowerCase();
        return blob.includes(qq);
      });
    }
    return out;
  }, [facturasView, provFilter, statusFilter, q]);

  /* ----------------------------- handlers ------------------------------ */

  function openRegistrarPago(row) {
    setPagoTarget({ factura: row.f, pendiente: row.pendiente });
    setOpenPagoModal(true);
  }
  function openListaPagos(row) {
    setFacturaForList(row.f);
    setOpenVerPagos(true);
  }
  function openEditarFactura(row) {
    setFacturaEdit(row.f);
    setOpenEditFactura(true);
  }

  /* ============================ UI ============================ */

  return (
    <section className="prose max-w-none px-10">
      <h2>Pagos a proveedores</h2>
      <p className="opacity-70 mb-6">
        Visualiza facturación de proveedores.
      </p>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div className="join">
          <input
            className="input input-bordered join-item w-[220px]"
            placeholder="Buscar (factura, proveedor, pedido)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn join-item" onClick={() => setQ("")}>
            Limpiar
          </button>
        </div>

        <select
          className="select select-bordered"
          value={provFilter}
          onChange={(e) => setProvFilter(Number(e.target.value))}
        >
          <option value={0}>Todos los proveedores</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        <select
          className="select select-bordered"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="PARCIAL">Parcial</option>
          <option value="PAGADO">Pagado</option>
        </select>

        <button className="btn btn-ghost" onClick={fetchAll}>
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
              <th># Factura</th>
              <th>Proveedor</th>
              <th>Pedido</th>
              <th>Fecha</th>
              <th className="text-right">Total</th>
              <th className="text-right">Pagado</th>
              <th className="text-right">Pendiente</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9}>
                  <span className="loading loading-spinner loading-sm"></span>
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9}>Sin facturas.</td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.f.id}>
                  <td>#{row.f.id}</td>
                  <td>{row.proveedor?.nombre ?? "—"}</td>
                  <td>{row.pedido ? `#${row.pedido.id}` : "—"}</td>
                  <td>{row.f.fecha || "—"}</td>
                  <td className="text-right">${fmtMoney(row.f.total)}</td>
                  <td className="text-right">${fmtMoney(row.pagado)}</td>
                  <td className="text-right">
                    {row.pendiente > 0 ? `$${fmtMoney(row.pendiente)}` : "—"}
                  </td>
                  <td>
                    <span className={estadoPagoBadge(row.status)}>
                      {row.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="join">
                      <button
                        className="btn btn-outline btn-sm join-item mr-4"
                        onClick={() => openListaPagos(row)}
                      >
                        Ver pagos
                      </button>
                      <button
                        className={`btn btn-sm join-item ${
                          row.pendiente > 0 ? "btn-secondary" : "btn-outline"
                        }`}
                        onClick={() => openRegistrarPago(row)}
                      >
                        Registrar pago
                      </button>
                      <button
                        className="btn btn-ghost btn-sm join-item"
                        onClick={() => openEditarFactura(row)}
                      >
                        Editar factura
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {openPagoModal && pagoTarget && (
        <PagoModal
          factura={pagoTarget.factura}
          pendiente={pagoTarget.pendiente}
          onClose={() => setOpenPagoModal(false)}
          onSaved={async () => {
            setOpenPagoModal(false);
            const data = await api.get("/pago");
            setPagos((Array.isArray(data) ? data : []).map(normPago));
          }}
        />
      )}

      {openVerPagos && facturaForList && (
        <ListaPagosModal
          factura={facturaForList}
          pagos={pagosByFactura.get(facturaForList.id) || []}
          onClose={() => setOpenVerPagos(false)}
          onChanged={async () => {
            const data = await api.get("/pago");
            setPagos((Array.isArray(data) ? data : []).map(normPago));
          }}
        />
      )}

      {openEditFactura && facturaEdit && (
        <EditarFacturaModal
          initial={facturaEdit}
          onClose={() => setOpenEditFactura(false)}
          onSaved={async () => {
            setOpenEditFactura(false);
            const data = await api.get("/factura");
            setFacturas((Array.isArray(data) ? data : []).map(normFactura));
          }}
        />
      )}
    </section>
  );
}

/* ==================== Modal: Payment ==================== */

function PagoModal({ factura, pendiente, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id_factura: nn(factura?.id),
    monto: Number(pendiente || 0),
    fecha: factura?.fecha ? String(factura.fecha).slice(0, 10) : todayStr(),
  });

  const upd = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/pago", {
        id_factura: Number(form.id_factura),
        monto: Number(form.monto),
        fecha: String(form.fecha || todayStr()),
      });
      await onSaved?.();
    } catch (e) {
      alert(e.message || "No se pudo registrar el pago");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg">
          Registrar pago – Factura #{factura?.id}
        </h3>
        <form className="grid grid-cols-1 gap-4 mt-4" onSubmit={onSubmit}>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Fecha</span>
            </label>
            <input
              type="date"
              className="input input-bordered"
              value={form.fecha || ""}
              onChange={(e) => upd("fecha", e.target.value)}
              required
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Monto</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              min={0}
              step="0.01"
              value={form.monto ?? 0}
              onChange={(e) => upd("monto", Number(e.target.value))}
              required
            />
            <label className="label">
              <span className="label-text-alt">
                Pendiente: ${fmtMoney(pendiente || 0)}
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}

/* ==================== Modal: List of payments ==================== */

function ListaPagosModal({ factura, pagos, onClose, onChanged }) {
  const [workingId, setWorkingId] = useState(null);

  async function onDelete(pago) {
    if (!confirm(`Eliminar pago #${pago.id}?`)) return;
    setWorkingId(pago.id);
    try {
      await api.del(`/pago/${pago.id}`);
      await onChanged?.();
    } catch (e) {
      alert(e.message || "No se pudo eliminar el pago");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-lg">
          Pagos de la factura #{factura?.id}
        </h3>

        <div className="overflow-x-auto mt-4">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th className="text-right">Monto</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 ? (
                <tr>
                  <td colSpan={4}>Sin pagos.</td>
                </tr>
              ) : (
                pagos.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>{p.fecha || "—"}</td>
                    <td className="text-right">${fmtMoney(p.monto)}</td>
                    <td className="text-right">
                      <button
                        className="btn btn-ghost btn-sm text-error"
                        disabled={workingId === p.id}
                        onClick={() => onDelete(p)}
                      >
                        {workingId === p.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}

/* ==================== Modal: Edit invoice ==================== */

function EditarFacturaModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    id: nn(initial?.id),
    fecha: initial?.fecha ? String(initial.fecha).slice(0, 10) : todayStr(),
    total: Number(initial?.total ?? 0),
  });
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (
        String(initial?.fecha || "").slice(0, 10) !== String(form.fecha || "")
      ) {
        await api.put(`/factura/${initial.id}`, {
          columnName: "fecha",
          value: String(form.fecha),
        });
      }
      if (Number(initial?.total ?? 0) !== Number(form.total ?? 0)) {
        await api.put(`/factura/${initial.id}`, {
          columnName: "total",
          value: String(form.total),
        });
      }
      await onSaved?.();
    } catch (e) {
      alert(e.message || "No se pudo actualizar la factura");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg">Editar factura #{initial?.id}</h3>
        <form className="grid grid-cols-1 gap-4 mt-4" onSubmit={onSubmit}>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Fecha</span>
            </label>
            <input
              type="date"
              className="input input-bordered"
              value={form.fecha || ""}
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
              min={0}
              className="input input-bordered"
              value={form.total ?? 0}
              onChange={(e) => upd("total", Number(e.target.value))}
              required
            />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
