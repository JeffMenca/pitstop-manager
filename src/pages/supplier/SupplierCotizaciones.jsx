import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";

const PATHS = {
  cotizaciones: ["/cotizacion", "/cotizaciones", "/cotizacionproveedor"],
};

async function tryGet(paths){ for(const p of paths){ try{ return {ok:true, data:await api.get(p), path:p}; }catch{} } return {ok:false,data:[],path:null}; }

export default function SupplierCotizaciones(){
  const [rows,setRows] = useState([]);
  const [err,setErr] = useState(null);
  const [loading,setLoading] = useState(false);
  const [path,setPath] = useState(PATHS.cotizaciones[0]);

  const fetchAll = useCallback(async()=>{
    setLoading(true); setErr(null);
    try{
      const r = await tryGet(PATHS.cotizaciones);
      setRows(Array.isArray(r.data)?r.data:[]);
      setPath(r.path || PATHS.cotizaciones[0]);
      if(!r.ok) setErr("No pude obtener cotizaciones (ajusta PATHS).");
    }catch(e){ setErr(e.message||"Error al cargar cotizaciones"); }
    finally{ setLoading(false); }
  },[]);
  useEffect(()=>{ fetchAll(); },[fetchAll]);

  async function confirmar(c){
    const precio = Number(prompt("Precio cotizado:", c.precio_unitario ?? 0) || 0);
    const dias   = Number(prompt("Tiempo de entrega (días):", c.tiempo_entrega ?? 1) || 1);
    const validez= Number(prompt("Validez (días):", c.validez_dias ?? 7) || 7);
    const notas  = prompt("Comentarios (opcional):", c.comentarios ?? "") || "";
    try{
      const id = c.id;
      const put = (columnName, value)=> api.put(`${path}/${id}`, { columnName, value:String(value) });
      await put("precio_unitario", precio);
      await put("tiempo_entrega", dias);
      await put("validez_dias", validez);
      await put("comentarios", notas);
      await put("confirmada", true);
      alert("Cotización confirmada.");
      await fetchAll();
    }catch(e){ alert(e.message || "No se pudo confirmar la cotización."); }
  }

  return(
    <section className="prose max-w-none px-6 md:px-10">
      <h2>Cotizaciones</h2>
      {err && <p className="text-error">{err}</p>}
      {loading && <span className="loading loading-spinner loading-sm" />}

      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>#</th><th>Producto/Servicio</th><th>Precio</th><th>Tiempo</th><th>Validez</th><th>Estado</th><th className="text-right">Acciones</th></tr></thead>
        <tbody>
          {rows.length===0 ? (
            <tr><td colSpan={7}>Sin cotizaciones.</td></tr>
          ) : rows.map(c=>(
            <tr key={c.id}>
              <td>#{c.id}</td>
              <td>{c.item ?? c.producto ?? c.servicio ?? "-"}</td>
              <td>{c.precio_unitario!=null ? `$${Number(c.precio_unitario).toFixed(2)}` : "—"}</td>
              <td>{c.tiempo_entrega ?? "—"} d</td>
              <td>{c.validez_dias ?? "—"} d</td>
              <td>{(c.confirmada ?? c.aprobada) ? <span className="badge badge-success">Confirmada</span> : <span className="badge badge-warning">Pendiente</span>}</td>
              <td className="text-right">
                <button className="btn btn-sm btn-primary" onClick={()=>confirmar(c)} disabled={Boolean(c.confirmada ?? c.aprobada)}>Confirmar</button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </section>
  );
}
