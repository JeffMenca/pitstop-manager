import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";

const PATHS = {
  productos: ["/productoproveedor", "/productoProveedor", "/producto"],
};

async function tryGet(paths){ for(const p of paths){ try{ return {ok:true, data:await api.get(p), path:p}; }catch{} } return {ok:false,data:[],path:null}; }

export default function SupplierProductos(){
  const [rows,setRows] = useState([]);
  const [err,setErr] = useState(null);
  const [loading,setLoading] = useState(false);
  const [path,setPath] = useState(PATHS.productos[0]);

  const [nuevo, setNuevo] = useState({ nombre:"", precio:0, descripcion:"" });

  const fetchAll = useCallback(async()=>{
    setLoading(true); setErr(null);
    try{
      const r = await tryGet(PATHS.productos);
      setRows(Array.isArray(r.data)?r.data:[]);
      setPath(r.path || PATHS.productos[0]);
      if(!r.ok) setErr("No pude obtener productos (ajusta PATHS).");
    }catch(e){ setErr(e.message || "Error al cargar productos"); }
    finally{ setLoading(false); }
  },[]);
  useEffect(()=>{ fetchAll(); },[fetchAll]);

  async function actualizarPrecio(item){
    const precio = Number(prompt("Nuevo precio:", item.precio ?? item.precio_unitario ?? 0) || 0);
    try{
      await api.put(`${path}/${item.id}`, { columnName:"precio", value:String(precio) })
        .catch(()=> api.put(`${path}/${item.id}`, { columnName:"precio_unitario", value:String(precio) }));
      await fetchAll();
    }catch(e){ alert(e.message||"No se pudo actualizar el precio."); }
  }

  async function actualizarDescripcion(item){
    const descripcion = prompt("Descripción:", item.descripcion ?? "") || "";
    try{
      await api.put(`${path}/${item.id}`, { columnName:"descripcion", value:descripcion });
      await fetchAll();
    }catch(e){ alert(e.message||"No se pudo actualizar la descripción."); }
  }

  async function sugerirProducto(){
    if (!nuevo.nombre.trim()) return alert("Escribe un nombre.");
    try{
      await api.post(path, {
        nombre: nuevo.nombre,
        precio: Number(nuevo.precio||0),
        descripcion: nuevo.descripcion || "",
        sugerencia: true,
      }).catch(()=> api.post("/producto", {
        nombre: nuevo.nombre,
        precio: Number(nuevo.precio||0),
        descripcion: nuevo.descripcion || "",
        sugerencia: true,
      }));
      setNuevo({ nombre:"", precio:0, descripcion:"" });
      await fetchAll();
      alert("Sugerencia enviada.");
    }catch(e){ alert(e.message || "No se pudo registrar la sugerencia."); }
  }

  return (
    <section className="prose max-w-none px-6 md:px-10">
      <h2>Productos del proveedor</h2>
      {err && <p className="text-error">{err}</p>}
      {loading && <span className="loading loading-spinner loading-sm" />}

      {/* listado */}
      <div className="overflow-x-auto mb-8">
        <table className="table">
          <thead><tr><th>#</th><th>Producto</th><th>Precio</th><th>Descripción</th><th className="text-right">Acciones</th></tr></thead>
          <tbody>
            {rows.length===0 ? (
              <tr><td colSpan={5}>Sin productos aún.</td></tr>
            ) : rows.map(p=>(
              <tr key={p.id}>
                <td>#{p.id}</td>
                <td>{p.nombre ?? p.producto ?? "-"}</td>
                <td>{p.precio!=null ? `$${Number(p.precio).toFixed(2)}` : "—"}</td>
                <td className="max-w-md truncate" title={p.descripcion ?? ""}>{p.descripcion ?? "—"}</td>
                <td className="text-right">
                  <div className="join">
                    <button className="btn btn-sm btn-outline join-item" onClick={()=>actualizarPrecio(p)}>Actualizar precio</button>
                    <button className="btn btn-sm join-item" onClick={()=>actualizarDescripcion(p)}>Editar descripción</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      <h4 className="mt-0">Sugerir nuevo producto</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end max-w-3xl">
        <div>
          <label className="label"><span className="label-text">Nombre</span></label>
          <input className="input input-bordered w-full" value={nuevo.nombre} onChange={e=>setNuevo(n=>({...n, nombre:e.target.value}))}/>
        </div>
        <div>
          <label className="label"><span className="label-text">Precio</span></label>
          <input type="number" step="0.01" className="input input-bordered w-full" value={nuevo.precio} onChange={e=>setNuevo(n=>({...n, precio:Number(e.target.value)}))}/>
        </div>
        <div className="md:col-span-3">
          <label className="label"><span className="label-text">Descripción</span></label>
          <textarea className="textarea textarea-bordered w-full" value={nuevo.descripcion} onChange={e=>setNuevo(n=>({...n, descripcion:e.target.value}))}/>
        </div>
        <div className="md:col-span-3 flex justify-end">
          <button className="btn btn-primary" onClick={sugerirProducto}>Enviar sugerencia</button>
        </div>
      </div>
    </section>
  );
}
