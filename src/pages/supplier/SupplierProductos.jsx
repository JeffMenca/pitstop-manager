import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../../services/api";

const PATHS = {
  proveedorRepuesto: ["/proveedorrepuesto", "/proveedorRepuesto"],
  repuesto: ["/repuesto"],
};

async function tryGet(paths) {
  for (const p of paths) {
    try {
      const data = await api.get(p);
      return { ok: true, data, path: p };
    } catch {}
  }
  return { ok: false, data: [], path: null };
}

export default function SupplierProductos() {
  const [rows, setRows] = useState([]);              
  const [repuestos, setRepuestos] = useState([]);    
  const [loading, setLoading] = useState(false);
  const [provRepPath, setProvRepPath] = useState(PATHS.proveedorRepuesto[0]);

  const [flash, setFlash] = useState(null); 

  const [nuevo, setNuevo] = useState({ nombre: "", precio: 0, descripcion: "" });

  // modales
  const [editPrice, setEditPrice] = useState(null); 
  const [editDesc, setEditDesc] = useState(null);   

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [pr, rep] = await Promise.all([
        tryGet(PATHS.proveedorRepuesto),
        tryGet(PATHS.repuesto),
      ]);
      setRows(Array.isArray(pr.data) ? pr.data : []);
      setRepuestos(Array.isArray(rep.data) ? rep.data : []);
      setProvRepPath(pr.path || PATHS.proveedorRepuesto[0]);
      if (!pr.ok) setErr("No pude obtener proveedor-repuesto (ajusta PATHS).");
    } catch (e) {
      setErr(e.message || "Error al cargar productos del proveedor");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const repMap = useMemo(() => {
    const m = new Map();
    repuestos.forEach(r => m.set(Number(r.id), r));
    return m;
  }, [repuestos]);

  async function guardarPrecio() {
    if (!editPrice) return;
    const { item, price } = editPrice;
    try {
      await api.put(`${provRepPath}/${item.id}`, { columnName: "precio", value: String(price) })
        .catch(() => api.put(`${provRepPath}/${item.id}`, { columnName: "precio_unitario", value: String(price) }))
        .catch(() => api.put(`${provRepPath}/${item.id}`, { columnName: "precioUnitario", value: String(price) }));
      setEditPrice(null);
      setFlash({ type: "success", msg: "Precio actualizado." });
      await fetchAll();
    } catch (e) {
      setFlash({ type: "error", msg: e.message || "No se pudo actualizar el precio." });
    }
  }

  async function guardarDescripcion() {
    if (!editDesc) return;
    const { item, descripcion } = editDesc;
    try {
      await api.put(`${provRepPath}/${item.id}`, { columnName: "descripcion", value: descripcion });
      setEditDesc(null);
      setFlash({ type: "success", msg: "Descripción actualizada." });
      await fetchAll();
    } catch (e) {
      setFlash({ type: "error", msg: e.message || "No se pudo actualizar la descripción." });
    }
  }

  async function sugerirRepuesto() {
    if (!nuevo.nombre.trim()) return setFlash({ type: "error", msg: "Escribe un nombre de repuesto." });
    try {
      await api.post(PATHS.repuesto[0], {
        repuesto: nuevo.nombre,
        descripcion: nuevo.descripcion || "",
        precio: Number(nuevo.precio || 0),
      });
      setNuevo({ nombre: "", precio: 0, descripcion: "" });
      setFlash({ type: "success", msg: "Sugerencia enviada." });
      await fetchAll();
    } catch (e) {
      setFlash({ type: "error", msg: e.message || "No se pudo registrar la sugerencia." });
    }
  }

  return (
    <section className="prose max-w-none px-6 md:px-10">
      <h2>Repuestos ofrecidos por el proveedor</h2>

      {flash && (
        <div className={`alert ${flash.type === "error" ? "alert-error" : "alert-success"} mb-4`}>
          <span>{flash.msg}</span>
          <button className="btn btn-sm ml-auto" onClick={() => setFlash(null)}>Cerrar</button>
        </div>
      )}
      {err && <p className="text-error">{err}</p>}
      {loading && <span className="loading loading-spinner loading-sm" />}

      <div className="overflow-x-auto mb-8">
        <table className="table">
          <thead>
            <tr><th>#</th><th>Repuesto</th><th>Precio</th><th>Descripción</th><th className="text-right">Acciones</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5}>Sin repuestos aún.</td></tr>
            ) : rows.map(pr => {
              const rep = repMap.get(Number(pr.id_repuesto ?? pr.repuesto_id));
              const nombre = rep?.repuesto ?? rep?.nombre ?? pr.repuesto ?? "-";
              const precio = pr.precio ?? pr.precio_unitario ?? pr.precioUnitario;
              const descripcion = pr.descripcion ?? rep?.descripcion ?? "—";
              return (
                <tr key={pr.id}>
                  <td>#{pr.id}</td>
                  <td>{nombre}</td>
                  <td>{precio != null ? `$${Number(precio).toFixed(2)}` : "—"}</td>
                  <td className="max-w-md truncate" title={descripcion}>{descripcion}</td>
                  <td className="text-right">
                    <div className="join">
                      <button
                        className="btn btn-sm btn-outline join-item"
                        onClick={() => setEditPrice({ item: pr, price: Number(precio || 0) })}
                      >
                        Actualizar precio
                      </button>
                      <button
                        className="btn btn-sm join-item"
                        onClick={() => setEditDesc({ item: pr, descripcion: descripcion === "—" ? "" : descripcion })}
                      >
                        Editar descripción
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h4 className="mt-0">Sugerir nuevo repuesto</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end max-w-3xl">
        <div>
          <label className="label"><span className="label-text">Nombre de repuesto</span></label>
          <input className="input input-bordered w-full"
                 value={nuevo.nombre}
                 onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))}/>
        </div>
        <div>
          <label className="label"><span className="label-text">Precio (opcional)</span></label>
          <input type="number" step="0.01" className="input input-bordered w-full"
                 value={nuevo.precio}
                 onChange={e => setNuevo(n => ({ ...n, precio: Number(e.target.value) }))}/>
        </div>
        <div className="md:col-span-3">
          <label className="label"><span className="label-text">Descripción</span></label>
          <textarea className="textarea textarea-bordered w-full"
                    value={nuevo.descripcion}
                    onChange={e => setNuevo(n => ({ ...n, descripcion: e.target.value }))}/>
        </div>
        <div className="md:col-span-3 flex justify-end">
          <button className="btn btn-primary" onClick={sugerirRepuesto}>Enviar sugerencia</button>
        </div>
      </div>

      {editPrice && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Actualizar precio</h3>
            <div className="mt-4">
              <label className="label"><span className="label-text">Precio</span></label>
              <input type="number" step="0.01"
                     className="input input-bordered w-full"
                     value={editPrice.price}
                     onChange={e => setEditPrice(p => ({ ...p, price: Number(e.target.value) }))}/>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setEditPrice(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarPrecio}>Guardar</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setEditPrice(null)} />
        </div>
      )}

      {editDesc && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Editar descripción</h3>
            <div className="mt-4">
              <textarea className="textarea textarea-bordered w-full h-32"
                        value={editDesc.descripcion}
                        onChange={e => setEditDesc(d => ({ ...d, descripcion: e.target.value }))}/>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setEditDesc(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarDescripcion}>Guardar</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setEditDesc(null)} />
        </div>
      )}
    </section>
  );
}
