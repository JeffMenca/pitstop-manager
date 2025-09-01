// src/pages/GestionInventario.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";

/* ==================== helpers ==================== */

const ROLE_PROVEEDOR_ID = 4;
const nz = (v, f = "") => v ?? f;
const nn = (v, f = 0) => Number(v ?? f);

function normProveedor(p) {
  return {
    id: nn(p.id),
    id_usuario: nn(p.id_usuario ?? p.usuario?.id ?? 0),
    nombre_empresa: nz(p.nombre_empresa ?? p.nombre ?? ""),
    es_servicio: Boolean(p.es_servicio ?? p.esServicio ?? false),
    descripcion: nz(p.descripcion ?? ""),
    raw: p,
  };
}
function normUsuario(u) {
  const rid =
    typeof u?.rol === "number" ? u.rol : nn(u?.rol?.id ?? u?.rol_id ?? 0);
  return {
    id: nn(u.id),
    nombre: `${nz(u.nombre)} ${nz(u.apellido)}`.trim(),
    rol: rid,
  };
}
function normRepuesto(r) {
  return {
    id: nn(r.id),
    nombre_repuesto: nz(r.nombre_repuesto ?? r.nombre ?? ""),
    descripcion: nz(r.descripcion ?? ""),
    raw: r,
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
function normInventario(i) {
  return {
    id: nn(i.id),
    id_repuesto: nn(i.id_repuesto),
    cantidad: nn(i.cantidad),
    precio_unitario: Number(i.precio_unitario ?? 0),
    raw: i,
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
    cantidad_solicitada: nn(d.cantidad_solicitada),
    raw: d,
  };
}

function estadoPedidoBadgeClass(id) {
  switch (Number(id)) {
    case 1:
      return "badge badge-info"; // Pendiente
    case 2:
      return "badge badge-success"; // Completado
    case 3:
      return "badge badge-error"; // Cancelado
    default:
      return "badge badge-ghost";
  }
}

function estadoDetalleBadgeClass(id) {
  return estadoPedidoBadgeClass(id);
}

/* ==================== Main info ==================== */

export default function GestionInventario() {
  const [tab, setTab] = useState("repuestos");

  // datos base
  const [proveedores, setProveedores] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [repuestos, setRepuestos] = useState([]);
  const [provRep, setProvRep] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [estadosPedido, setEstadosPedido] = useState([]);
  const [estadosDet, setEstadosDet] = useState([]);

  // ui
  const [qRep, setQRep] = useState("");
  const [err, setErr] = useState(null);

  // modales
  const [openRep, setOpenRep] = useState(false);
  const [repForm, setRepForm] = useState(null);

  const [openProv, setOpenProv] = useState(false);
  const [provForm, setProvForm] = useState(null);

  const [openInv, setOpenInv] = useState(false);
  const [invForm, setInvForm] = useState(null);

  const [openStock, setOpenStock] = useState(false);
  const [stockForm, setStockForm] = useState(null);

  const [openPedido, setOpenPedido] = useState(false);
  const [pedidoForm, setPedidoForm] = useState(null);

  const [openEstado, setOpenEstado] = useState(false);
  const [estadoForm, setEstadoForm] = useState(null);


  const fetchProveedores = useCallback(async () => {
    try {
      const data = await api.get("/proveedor");
      setProveedores((Array.isArray(data) ? data : []).map(normProveedor));
    } catch (e) {
      console.warn("[GET /proveedor] error:", e);
      setProveedores([]);
    }
  }, []);

  const fetchUsuarios = useCallback(async () => {
    try {
      const data = await api.get("/usuario");
      setUsuarios((Array.isArray(data) ? data : []).map(normUsuario));
    } catch (e) {
      console.warn("[GET /usuario] error:", e);
      setUsuarios([]);
    }
  }, []);

  const fetchRepuestos = useCallback(async () => {
    try {
      const data = await api.get("/repuesto");
      setRepuestos((Array.isArray(data) ? data : []).map(normRepuesto));
    } catch (e) {
      console.warn("[GET /repuesto] error:", e);
      setRepuestos([]);
    }
  }, []);

  const fetchProvRep = useCallback(async () => {
    try {
      const data = await api.get("/proveedorrepuesto");
      setProvRep((Array.isArray(data) ? data : []).map(normProvRep));
    } catch (e) {
      console.warn("[GET /proveedorrepuesto] error:", e);
      setProvRep([]);
    }
  }, []);

  const fetchInventario = useCallback(async () => {
    try {
      const data = await api.get("/inventario");
      setInventario((Array.isArray(data) ? data : []).map(normInventario));
    } catch (e) {
      console.warn("[GET /inventario] error:", e);
      setInventario([]);
    }
  }, []);

  const fetchPedidos = useCallback(async () => {
    try {
      const p = await api.get("/pedido");
      const d = await api.get("/pedidodetalle");
      setPedidos((Array.isArray(p) ? p : []).map(normPedido));
      setDetalles((Array.isArray(d) ? d : []).map(normPedDet));
    } catch (e) {
      console.warn("[pedido|detalle] error:", e);
      setPedidos([]);
      setDetalles([]);
    }
  }, []);

  const fetchEstados = useCallback(async () => {
    try {
      const ep = await api.get("/estadopedido");
      setEstadosPedido(
        (Array.isArray(ep) ? ep : []).map((x) => ({
          id: nn(x.id),
          label: nz(x.estado ?? x.nombre ?? x.descripcion ?? `Estado ${x.id}`),
        }))
      );
    } catch {
      setEstadosPedido([]);
    }
    try {
      const ed = await api.get("/estadopedidodetalle");
      setEstadosDet(
        (Array.isArray(ed) ? ed : []).map((x) => ({
          id: nn(x.id),
          label: nz(x.estado ?? x.nombre ?? x.descripcion ?? `Estado ${x.id}`),
        }))
      );
    } catch {
      setEstadosDet([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([
        fetchProveedores(),
        fetchUsuarios(),
        fetchRepuestos(),
        fetchProvRep(),
        fetchInventario(),
        fetchPedidos(),
        fetchEstados(),
      ]);
    })();
  }, [
    fetchProveedores,
    fetchUsuarios,
    fetchRepuestos,
    fetchProvRep,
    fetchInventario,
    fetchPedidos,
    fetchEstados,
  ]);

  /* --------------------------- MAPS --------------------------- */

  const usuariosProveedor = useMemo(
    () => usuarios.filter((u) => Number(u.rol) === ROLE_PROVEEDOR_ID),
    [usuarios]
  );

  const repuestosMap = useMemo(() => {
    const m = new Map();
    repuestos.forEach((r) => m.set(r.id, r));
    return m;
  }, [repuestos]);

  const provRepByRep = useMemo(() => {
    const m = new Map();
    provRep.forEach((x) => {
      const arr = m.get(x.id_repuesto) || [];
      arr.push(x);
      m.set(x.id_repuesto, arr);
    });
    return m;
  }, [provRep]);

  const filteredRepuestos = useMemo(() => {
    if (!qRep) return repuestos;
    const q = qRep.toLowerCase();
    return repuestos.filter((r) =>
      `${r.id} ${r.nombre_repuesto} ${r.descripcion}`.toLowerCase().includes(q)
    );
  }, [repuestos, qRep]);

  /* ----------------------------- handlers ------------------------------ */

  function openNewProveedor() {
    setProvForm({
      id: null,
      id_usuario: 0,
      nombre_empresa: "",
      es_servicio: false,
      descripcion: "",
    });
    setOpenProv(true);
  }
  function openEditProveedor(p) {
    setProvForm({ ...p });
    setOpenProv(true);
  }

  function openNewRepuesto() {
    setRepForm({
      id: null,
      nombre_repuesto: "",
      descripcion: "",
      id_proveedor: 0,
      precio_proveedor: 0,
    });
    setOpenRep(true);
  }
  function openEditRepuesto(r) {
    setRepForm({ ...r, id_proveedor: 0, precio_proveedor: 0 });
    setOpenRep(true);
  }

  function openNewInventario() {
    setInvForm({ id: null, id_repuesto: 0, cantidad: 0, precio_unitario: 0 });
    setOpenInv(true);
  }
  function openEditInventario(i) {
    setInvForm({ ...i });
    setOpenInv(true);
  }
  function openStockModal(i) {
    setStockForm({ id: i.id, cantidad: 0, esAbastecer: true });
    setOpenStock(true);
  }

  function openNewPedido() {
    setPedidoForm({
      id: null,
      fecha_pedido: "",
      fecha_entrega: "",
      estado: estadosPedido[0]?.id || 0,
      id_proveedor_repuesto: 0,
      estado_detalle: estadosDet[0]?.id || 0,
      cantidad_solicitada: 1,
    });
    setOpenPedido(true);
  }


  function openEditEstadoPedido(p) {
    setEstadoForm({
      id: p.id,
      estado: Number(p.estado) || estadosPedido[0]?.id || 0,
    });
    setOpenEstado(true);
  }

  /* ============================ UI tabs ============================ */

  return (
    <section className="prose max-w-none px-10">
      <h2>Inventario & Pedidos</h2>
      {err && <p className="text-error">{err}</p>}

      <div role="tablist" className="tabs tabs-lifted mb-6">
        <button
          role="tab"
          className={`tab ${tab === "repuestos" ? "tab-active" : ""}`}
          onClick={() => setTab("repuestos")}
        >
          Repuestos
        </button>
        <button
          role="tab"
          className={`tab ${tab === "inventario" ? "tab-active" : ""}`}
          onClick={() => setTab("inventario")}
        >
          Inventario
        </button>
        <button
          role="tab"
          className={`tab ${tab === "pedidos" ? "tab-active" : ""}`}
          onClick={() => setTab("pedidos")}
        >
          Pedidos
        </button>
        <button
          role="tab"
          className={`tab ${tab === "proveedores" ? "tab-active" : ""}`}
          onClick={() => setTab("proveedores")}
        >
          Proveedores
        </button>
      </div>

      {/* -------------------- TAB: REPUESTOS -------------------- */}
      {tab === "repuestos" && (
        <div>
          <div className="flex items-center justify-between">
            <h3 className="m-0">Catálogo de repuestos</h3>
            <div className="flex gap-2">
              <div className="join">
                <input
                  className="input input-bordered join-item"
                  placeholder="Buscar repuesto"
                  value={qRep}
                  onChange={(e) => setQRep(e.target.value)}
                />
                <button className="btn join-item" onClick={() => setQRep("")}>
                  Limpiar
                </button>
              </div>
              <button className="btn btn-outline" onClick={openNewProveedor}>
                Nuevo proveedor
              </button>
              <button className="btn btn-primary" onClick={openNewRepuesto}>
                Nuevo repuesto
              </button>
            </div>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Proveedores (precio)</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRepuestos.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Sin repuestos.</td>
                  </tr>
                ) : (
                  filteredRepuestos.map((r) => {
                    const prs = provRepByRep.get(r.id) || [];
                    return (
                      <tr key={r.id}>
                        <td>{r.id}</td>
                        <td>{r.nombre_repuesto}</td>
                        <td>{r.descripcion || "—"}</td>
                        <td>
                          {prs.length === 0
                            ? "—"
                            : prs
                                .map((x) => {
                                  const p = proveedores.find(
                                    (pp) => pp.id === x.id_proveedor
                                  );
                                  return `${
                                    p?.nombre_empresa ??
                                    "Prov #" + x.id_proveedor
                                  } ($${x.precio})`;
                                })
                                .join(", ")}
                        </td>
                        <td className="text-right">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEditRepuesto(r)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- TAB: INVENTARIO -------------------- */}
      {tab === "inventario" && (
        <div>
          <div className="flex items-center justify-between">
            <h3 className="m-0">Inventario</h3>
            <button className="btn" onClick={openNewInventario}>
              Nuevo registro
            </button>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Repuesto</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inventario.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Sin inventario.</td>
                  </tr>
                ) : (
                  inventario.map((i) => (
                    <tr key={i.id}>
                      <td>{i.id}</td>
                      <td>
                        {repuestosMap.get(i.id_repuesto)?.nombre_repuesto ??
                          `Repuesto #${i.id_repuesto}`}
                      </td>
                      <td>{i.cantidad}</td>
                      <td>${i.precio_unitario}</td>
                      <td className="text-right">
                        <div className="join">
                          <button
                            className="btn btn-ghost btn-sm join-item"
                            onClick={() => openStockModal(i)}
                          >
                            Stock ±
                          </button>
                          <button
                            className="btn btn-ghost btn-sm join-item"
                            onClick={() => openEditInventario(i)}
                          >
                            Editar
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
      )}

      {/* -------------------- TAB: PEDIDOS -------------------- */}
      {tab === "pedidos" && (
        <div>
          <div className="flex items-center justify-between">
            <h3 className="m-0">Pedidos a proveedores</h3>
            <button className="btn btn-primary" onClick={openNewPedido}>
              Nuevo pedido
            </button>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha pedido</th>
                  <th>Fecha entrega</th>
                  <th>Estado</th>
                  <th>Detalles</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.length === 0 ? (
                  <tr>
                    <td colSpan={6}>Sin pedidos.</td>
                  </tr>
                ) : (
                  pedidos.map((p) => {
                    const ds = detalles.filter((d) => d.id_pedido === p.id);
                    return (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td>{p.fecha_pedido || "—"}</td>
                        <td>{p.fecha_entrega || "—"}</td>
                        <td>
                          <span className={estadoPedidoBadgeClass(p.estado)}>
                            {estadosPedido.find((e) => e.id === p.estado)
                              ?.label || `Estado ${p.estado}`}
                          </span>
                        </td>

                        <td>
                          {ds.length === 0
                            ? "—"
                            : ds
                                .map((d) => {
                                  const link = provRep.find(
                                    (x) => x.id === d.id_proveedor_repuesto
                                  );
                                  const prov = proveedores.find(
                                    (pp) => pp.id === link?.id_proveedor
                                  );
                                  const rep = repuestosMap.get(
                                    link?.id_repuesto
                                  );
                                  const est =
                                    estadosDet.find((e) => e.id === d.estado)
                                      ?.label || `Estado ${d.estado}`;
                                  return `${prov?.nombre_empresa ?? "Prov"} – ${
                                    rep?.nombre_repuesto ?? "Repuesto"
                                  } x${d.cantidad_solicitada} (${est})`;
                                })
                                .join(" | ")}
                        </td>
                        <td className="text-right">
                          <div className="join">
                            <button
                              className="btn btn-ghost btn-sm join-item"
                              onClick={() => openEditEstadoPedido(p)}
                            >
                              Estado
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
        </div>
      )}

      {/* -------------------- TAB: PROVEEDORES -------------------- */}
      {tab === "proveedores" && (
        <div>
          <div className="flex items-center justify-between">
            <h3 className="m-0">Proveedores</h3>
            <button className="btn btn-primary" onClick={openNewProveedor}>
              Nuevo proveedor
            </button>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Empresa</th>
                  <th>Usuario</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.length === 0 ? (
                  <tr>
                    <td colSpan={6}>Sin proveedores.</td>
                  </tr>
                ) : (
                  proveedores.map((p) => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.nombre_empresa}</td>
                      <td>
                        {usuarios.find((u) => u.id === p.id_usuario)?.nombre ||
                          `Usuario #${p.id_usuario}`}
                      </td>
                      <td>{p.es_servicio ? "Servicio" : "Repuestos"}</td>
                      <td>{p.descripcion || "—"}</td>
                      <td className="text-right">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEditProveedor(p)}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================= Modales ======================= */}

      {openProv && (
        <ProveedorModal
          initial={provForm}
          usuariosProveedor={usuariosProveedor}
          onClose={() => setOpenProv(false)}
          onSaved={async () => {
            setOpenProv(false);
            await fetchProveedores();
          }}
        />
      )}

      {openRep && (
        <RepuestoModal
          initial={repForm}
          proveedores={proveedores}
          onNewProveedor={openNewProveedor}
          onClose={() => setOpenRep(false)}
          onSaved={async () => {
            setOpenRep(false);
            await fetchRepuestos();
            await fetchProvRep();
          }}
        />
      )}

      {openInv && (
        <InventarioModal
          initial={invForm}
          repuestos={repuestos}
          onClose={() => setOpenInv(false)}
          onSaved={async () => {
            setOpenInv(false);
            await fetchInventario();
          }}
        />
      )}

      {openStock && (
        <StockModal
          initial={stockForm}
          onClose={() => setOpenStock(false)}
          onSaved={async () => {
            setOpenStock(false);
            await fetchInventario();
          }}
        />
      )}

      {openPedido && (
        <PedidoModal
          initial={pedidoForm}
          estadosPedido={estadosPedido}
          estadosDet={estadosDet}
          provRep={provRep}
          proveedores={proveedores}
          repuestos={repuestos}
          onClose={() => setOpenPedido(false)}
          onSaved={async () => {
            setOpenPedido(false);
            await fetchPedidos();
          }}
        />
      )}

      {openEstado && (
        <EstadoPedidoModal
          initial={estadoForm}
          estadosPedido={estadosPedido}
          onClose={() => setOpenEstado(false)}
          onSaved={async () => {
            setOpenEstado(false);
            await fetchPedidos();
          }}
        />
      )}
    </section>
  );
}

/* ==================== Modales ==================== */

// Proveedor
function ProveedorModal({ initial, usuariosProveedor, onClose, onSaved }) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);
  const upd = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        const diffs = {};
        if (initial.id_usuario !== form.id_usuario)
          diffs["id_usuario"] = Number(form.id_usuario);
        if (initial.nombre_empresa !== form.nombre_empresa)
          diffs["nombre_empresa"] = form.nombre_empresa;
        if (Boolean(initial.es_servicio) !== Boolean(form.es_servicio))
          diffs["es_servicio"] = Boolean(form.es_servicio);
        if ((initial.descripcion || "") !== (form.descripcion || ""))
          diffs["descripcion"] = form.descripcion;
        for (const [columnName, value] of Object.entries(diffs)) {
          await api.put(`/proveedor/${initial.id}`, { columnName, value });
        }
      } else {
        await api.post("/proveedor", {
          id_usuario: Number(form.id_usuario),
          nombre_empresa: String(form.nombre_empresa || ""),
          es_servicio: Boolean(form.es_servicio || false),
          descripcion: String(form.descripcion || ""),
        });
      }
      await onSaved?.();
    } catch (e) {
      alert(e.message || "No se pudo guardar el proveedor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-xl">
        <h3 className="font-bold text-lg">
          {isEdit ? "Editar proveedor" : "Nuevo proveedor"}
        </h3>
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
          onSubmit={onSubmit}
        >
          <div className="form-control md:col-span-2">
            <label className="label">
              <span className="label-text">Usuario (rol proveedor)</span>
            </label>
            <select
              className="select select-bordered"
              value={form.id_usuario || 0}
              onChange={(e) => upd("id_usuario", Number(e.target.value))}
              required
            >
              <option value={0} disabled>
                {usuariosProveedor.length
                  ? "Seleccione usuario"
                  : "No hay usuarios con rol proveedor"}
              </option>
              {usuariosProveedor.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control md:col-span-2">
            <label className="label">
              <span className="label-text">Nombre de la empresa</span>
            </label>
            <input
              className="input input-bordered"
              value={form.nombre_empresa || ""}
              onChange={(e) => upd("nombre_empresa", e.target.value)}
              required
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">¿Es de servicio?</span>
            </label>
            <input
              type="checkbox"
              className="toggle"
              checked={!!form.es_servicio}
              onChange={(e) => upd("es_servicio", e.target.checked)}
            />
          </div>
          <div className="form-control md:col-span-2">
            <label className="label">
              <span className="label-text">Descripción</span>
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
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

// Repuesto (+ proveedorrepuesto obligatorio al crear)
function RepuestoModal({
  initial,
  proveedores,
  onNewProveedor,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);
  const upd = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        const diffs = {};
        if ((initial.nombre_repuesto || "") !== (form.nombre_repuesto || ""))
          diffs["nombre_repuesto"] = form.nombre_repuesto;
        if ((initial.descripcion || "") !== (form.descripcion || ""))
          diffs["descripcion"] = form.descripcion;
        for (const [columnName, value] of Object.entries(diffs)) {
          await api.put(`/repuesto/${initial.id}`, { columnName, value });
        }
        if (form.id_proveedor && form.precio_proveedor > 0) {
          await api.post("/proveedorrepuesto", {
            id_proveedor: Number(form.id_proveedor),
            id_repuesto: Number(initial.id),
            precio: Number(form.precio_proveedor),
          });
        }
      } else {
        const created = await api.post("/repuesto", {
          nombre_repuesto: String(form.nombre_repuesto || ""),
          ...(form.descripcion
            ? { descripcion: String(form.descripcion) }
            : {}),
        });
        const repuestoId = nn(created?.id);
        if (!form.id_proveedor)
          throw new Error("Debes seleccionar un proveedor");
        if (!repuestoId)
          throw new Error("No se obtuvo el ID del repuesto creado");

        await api.post("/proveedorrepuesto", {
          id_proveedor: Number(form.id_proveedor),
          id_repuesto: repuestoId,
          precio: Number(form.precio_proveedor || 0),
        });
      }
      await onSaved?.();
    } catch (e) {
      alert(e.message || "No se pudo guardar el repuesto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">
          {isEdit ? "Editar repuesto" : "Nuevo repuesto"}
        </h3>
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
          onSubmit={onSubmit}
        >
          <div className="form-control md:col-span-2">
            <label className="label">
              <span className="label-text">Nombre del repuesto</span>
            </label>
            <input
              className="input input-bordered"
              value={form.nombre_repuesto || ""}
              onChange={(e) => upd("nombre_repuesto", e.target.value)}
              required
            />
          </div>
          <div className="form-control md:col-span-2">
            <label className="label">
              <span className="label-text">Descripción (opcional)</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              value={form.descripcion || ""}
              onChange={(e) => upd("descripcion", e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Proveedor</span>
            </label>
            <div className="flex gap-2">
              <select
                className="select select-bordered flex-1"
                value={form.id_proveedor || 0}
                onChange={(e) => upd("id_proveedor", Number(e.target.value))}
              >
                <option value={0} disabled>
                  {proveedores.length
                    ? "Seleccione proveedor"
                    : "No hay proveedores"}
                </option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_empresa}
                  </option>
                ))}
              </select>
              <button type="button" className="btn" onClick={onNewProveedor}>
                Nuevo
              </button>
            </div>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Precio del proveedor</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              value={form.precio_proveedor ?? 0}
              onChange={(e) => upd("precio_proveedor", Number(e.target.value))}
              min={0}
              step="0.01"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 mt-6">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

// Inventario
function InventarioModal({ initial, repuestos, onClose, onSaved }) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);
  const upd = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        const diffs = {};
        if (initial.id_repuesto !== form.id_repuesto)
          diffs["id_repuesto"] = Number(form.id_repuesto);
        if (initial.cantidad !== form.cantidad)
          diffs["cantidad"] = Number(form.cantidad);
        if (Number(initial.precio_unitario) !== Number(form.precio_unitario))
          diffs["precio_unitario"] = Number(form.precio_unitario);
        for (const [columnName, value] of Object.entries(diffs)) {
          await api.put(`/inventario/${initial.id}`, { columnName, value });
        }
      } else {
        await api.post("/inventario", {
          id_repuesto: Number(form.id_repuesto),
          cantidad: Number(form.cantidad),
          precio_unitario: Number(form.precio_unitario),
        });
      }
      await onSaved?.();
    } catch (e) {
      alert(e.message || "No se pudo guardar inventario");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-xl">
        <h3 className="font-bold text-lg">
          {isEdit ? "Editar inventario" : "Nuevo inventario"}
        </h3>
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
          onSubmit={onSubmit}
        >
          <div className="form-control md:col-span-2">
            <label className="label">
              <span className="label-text">Repuesto</span>
            </label>
            <select
              className="select select-bordered"
              value={form.id_repuesto || 0}
              onChange={(e) => upd("id_repuesto", Number(e.target.value))}
              required
            >
              <option value={0} disabled>
                Seleccione
              </option>
              {repuestos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre_repuesto}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Cantidad</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              value={form.cantidad ?? 0}
              onChange={(e) => upd("cantidad", Number(e.target.value))}
              min={0}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Precio unitario</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              value={form.precio_unitario ?? 0}
              onChange={(e) => upd("precio_unitario", Number(e.target.value))}
              step="0.01"
              min={0}
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 mt-6">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

// Stock ± (PUT /inventario/updateStock/{id})
function StockModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/inventario/updateStock/${initial.id}`, {
        cantidad: Number(form.cantidad || 0),
        esAbastecer: Boolean(form.esAbastecer),
      });
      await onSaved?.();
    } catch (e) {
      alert(e.message || "No se pudo actualizar el stock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg">Actualizar stock</h3>
        <form className="grid grid-cols-1 gap-4 mt-4" onSubmit={onSubmit}>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Cantidad</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              value={form.cantidad ?? 0}
              onChange={(e) => upd("cantidad", Number(e.target.value))}
              min={0}
              required
            />
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">¿Abastecer? (si no, descuenta)</span>
              <input
                type="checkbox"
                className="toggle"
                checked={!!form.esAbastecer}
                onChange={(e) => upd("esAbastecer", e.target.checked)}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Aplicando..." : "Aplicar"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

// Pedido (solo creación; edición de estado va en EstadoPedidoModal)
function PedidoModal({
  initial,
  estadosPedido,
  estadosDet,
  provRep,
  proveedores,
  repuestos,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const prOptions = useMemo(() => {
    return provRep.map((x) => {
      const prov = proveedores.find((p) => p.id === x.id_proveedor);
      const rep = repuestos.find((r) => r.id === x.id_repuesto);
      return {
        id: x.id,
        label: `${prov?.nombre_empresa ?? "Prov"} – ${
          rep?.nombre_repuesto ?? "Repuesto"
        } ($${x.precio})`,
      };
    });
  }, [provRep, proveedores, repuestos]);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const p = await api.post("/pedido", {
        fecha_pedido: String(form.fecha_pedido || ""),
        fecha_entrega: String(form.fecha_entrega || ""),
        estado: Number(form.estado || 0),
      });
      const pedidoId = nn(p?.id);
      if (!pedidoId) throw new Error("No se obtuvo el ID del pedido creado.");

      await api.post("/pedidodetalle", {
        id_pedido: pedidoId,
        id_proveedor_repuesto: Number(form.id_proveedor_repuesto),
        estado: Number(form.estado_detalle || 0),
        cantidad_solicitada: Number(form.cantidad_solicitada || 1),
      });

      await onSaved?.();
    } catch (e) {
      alert(e.message || "No se pudo crear el pedido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">Nuevo pedido</h3>
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
          onSubmit={onSubmit}
        >
          <div className="form-control">
            <label className="label">
              <span className="label-text">Fecha pedido</span>
            </label>
            <input
              type="date"
              className="input input-bordered"
              value={form.fecha_pedido || ""}
              onChange={(e) => upd("fecha_pedido", e.target.value)}
              required
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Fecha entrega</span>
            </label>
            <input
              type="date"
              className="input input-bordered"
              value={form.fecha_entrega || ""}
              onChange={(e) => upd("fecha_entrega", e.target.value)}
              required
            />
          </div>
          <div className="form-control md:col-span-2">
            <label className="label">
              <span className="label-text">Estado del pedido</span>
            </label>
            <select
              className="select select-bordered"
              value={form.estado || 0}
              onChange={(e) => upd("estado", Number(e.target.value))}
              required
            >
              <option value={0} disabled>
                Seleccione estado
              </option>
              {estadosPedido.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control md:col-span-2">
            <label className="label">
              <span className="label-text">Proveedor – Repuesto</span>
            </label>
            <select
              className="select select-bordered"
              value={form.id_proveedor_repuesto || 0}
              onChange={(e) =>
                upd("id_proveedor_repuesto", Number(e.target.value))
              }
              required
            >
              <option value={0} disabled>
                Seleccione
              </option>
              {prOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Cantidad solicitada</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              value={form.cantidad_solicitada ?? 1}
              onChange={(e) =>
                upd("cantidad_solicitada", Number(e.target.value))
              }
              min={1}
              required
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Estado del detalle</span>
            </label>
            <select
              className="select select-bordered"
              value={form.estado_detalle || 0}
              onChange={(e) => upd("estado_detalle", Number(e.target.value))}
              required
            >
              <option value={0} disabled>
                Seleccione
              </option>
              {estadosDet.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 mt-6">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Crear pedido"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

function EstadoPedidoModal({ initial, estadosPedido, onClose, onSaved }) {
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/pedido/${initial.id}`, {
        columnName: "estado",
        value: Number(form.estado || 0),
      });
      await onSaved?.();
    } catch (e) {
      alert(e.message || "No se pudo actualizar el estado del pedido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg">
          Cambiar estado del pedido #{initial?.id}
        </h3>
        <form className="grid grid-cols-1 gap-4 mt-4" onSubmit={onSubmit}>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Estado</span>
            </label>
            <select
              className="select select-bordered"
              value={form.estado || 0}
              onChange={(e) => upd("estado", Number(e.target.value))}
              required
            >
              <option value={0} disabled>
                Seleccione
              </option>
              {estadosPedido.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
