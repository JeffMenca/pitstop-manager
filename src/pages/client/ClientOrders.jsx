// src/pages/client/ClientOrders.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../services/api";

function estadoBadge(id) {
  const n = Number(id);
  if (n === 1) return "badge badge-warning";
  if (n === 2) return "badge badge-error";
  if (n === 3) return "badge badge-success";
  if (n === 4) return "badge badge-info";
  if (n === 5) return "badge badge-success";
  return "badge badge-ghost";
}
function estadoLabel(id) {
  const n = Number(id);
  if (n === 1) return "Pendiente";
  if (n === 2) return "Cancelado";
  if (n === 3) return "Aprobado";
  if (n === 4) return "En curso";
  if (n === 5) return "Completado";
  return `Estado ${id}`;
}

export default function ClientOrders() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const vehiculoIdFromURL = Number(sp.get("vehiculoId") || 0);

  const [q, setQ] = useState("");
  const [vehiculoId, setVehiculoId] = useState(vehiculoIdFromURL || 0);
  const [estadoFilter, setEstadoFilter] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const fetchOrdenes = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      let data;
      if (vehiculoId > 0) data = await api.get(`/ordenreparacion/idVehiculo/${vehiculoId}`);
      else if (estadoFilter > 0) data = await api.get(`/ordenreparacion/estado/${estadoFilter}`);
      else if (q && /^[A-Za-z0-9-]+$/.test(q)) {
        try { data = await api.get(`/ordenreparacion/placas/${q}`); }
        catch { data = await api.get("/ordenreparacion"); }
      } else data = await api.get("/ordenreparacion");

      const list = Array.isArray(data) ? data : [];
      const filtered = list.filter((o) => {
        if (!q) return true;
        const blob = `${o.id} ${o.id_vehiculo} ${o.fecha_ingreso} ${o.hora_ingreso} ${(o.vehiculo?.placas ?? "")}`.toLowerCase();
        return blob.includes(q.toLowerCase());
      });
      setRows(filtered);
    } catch (e) {
      setErr(e.message || "No se pudieron cargar las órdenes");
    } finally {
      setLoading(false);
    }
  }, [vehiculoId, estadoFilter, q]);

  useEffect(() => { fetchOrdenes(); }, [fetchOrdenes]);

  return (
    <section className="prose max-w-none px-6 md:px-10">
      <h2>Mis órdenes</h2>
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div className="join">
          <input className="input input-bordered join-item w-[220px]" placeholder="Placas o texto" value={q} onChange={(e)=>setQ(e.target.value)} />
          <button className="btn join-item" onClick={fetchOrdenes}>Buscar</button>
          <button className="btn join-item" onClick={()=>setQ("")}>Limpiar</button>
        </div>
        <input type="number" className="input input-bordered" placeholder="ID Vehículo" value={vehiculoId || ""} onChange={(e)=>setVehiculoId(Number(e.target.value)||0)} />
        <select className="select select-bordered" value={estadoFilter} onChange={(e)=>setEstadoFilter(Number(e.target.value))}>
          <option value={0}>Todos</option>
          <option value={1}>Pendiente</option>
          <option value={2}>Cancelado</option>
          <option value={3}>Aprobado</option>
          <option value={4}>En curso</option>
          <option value={5}>Completado</option>
        </select>
        <button className="btn btn-ghost" onClick={fetchOrdenes}>Recargar</button>
      </div>

      {err && <p className="text-error">{err}</p>}

      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>#</th><th>Vehículo</th><th>Ingreso</th><th>Estado</th><th className="text-right">Acciones</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><span className="loading loading-spinner loading-sm"></span></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5}>Sin registros.</td></tr>
            ) : rows.map((o)=>(
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{o.vehiculo ? `${o.vehiculo.placas ?? ""} ${o.vehiculo.marca ?? ""} ${o.vehiculo.modelo ?? ""}` : `ID ${o.id_vehiculo}`}</td>
                <td>{o.fecha_ingreso} {o.hora_ingreso}</td>
                <td><span className={estadoBadge(o.estado)}>{estadoLabel(o.estado)}</span></td>
                <td className="text-right">
                  <button className="btn btn-sm" onClick={()=>navigate(`/cliente/orden/${o.id}`)}>Seguimiento</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
