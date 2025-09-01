import { useEffect, useMemo, useState, useCallback } from "react";
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

export default function EmployeeOrdenes() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const vehiculoId = Number(sp.get("vehiculoId") || 0);

  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const fetchOrdenes = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      let data;
      if (vehiculoId > 0) {
        data = await api.get(`/ordenreparacion/idVehiculo/${vehiculoId}`);
      } else if (q && /^[A-Za-z0-9-]+$/.test(q)) {
        try {
          data = await api.get(`/ordenreparacion/placas/${q}`);
        } catch {
          data = await api.get("/ordenreparacion");
        }
      } else {
        data = await api.get("/ordenreparacion");
      }
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || "No se pudieron cargar las órdenes");
    } finally {
      setLoading(false);
    }
  }, [vehiculoId, q]);

  useEffect(() => {
    fetchOrdenes();
  }, [fetchOrdenes]);

  const visibles = useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter((o) => {
      const blob = `${o.id} ${o.id_vehiculo} ${o.vehiculo?.placas || ""}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [rows, q]);

  return (
    <section className="prose max-w-none px-6 md:px-10">
      <h3>Mis órdenes</h3>
      <div className="join mb-4">
        <input
          className="input input-bordered join-item w-[240px]"
          placeholder="Buscar (id, placas)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn join-item" onClick={fetchOrdenes}>Buscar</button>
        <button className="btn join-item" onClick={() => setQ("")}>Limpiar</button>
      </div>

      {err && <p className="text-error">{err}</p>}

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
              <tr><td colSpan={6}><span className="loading loading-spinner loading-sm" /></td></tr>
            ) : visibles.length === 0 ? (
              <tr><td colSpan={6}>Sin resultados.</td></tr>
            ) : (
              visibles.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td title={`Vehículo ${o.id_vehiculo}`}>
                    {o.vehiculo
                      ? `${o.vehiculo.placas ?? ""} ${o.vehiculo.marca ?? ""} ${o.vehiculo.modelo ?? ""}`
                      : `ID ${o.id_vehiculo}`}
                  </td>
                  <td>{o.fecha_ingreso} {o.hora_ingreso}</td>
                  <td>
                    {o.fecha_egreso ? `${o.fecha_egreso} ${o.hora_egreso}` : <span className="opacity-60">—</span>}
                  </td>
                  <td>
                    <span className={estadoBadge(o.estado)}>{estadoLabel(o.estado)}</span>
                  </td>
                  <td className="text-right">
                    <button className="btn btn-sm" onClick={() => navigate(`/empleado/orden/${o.id}`)}>
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
