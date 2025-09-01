import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
function estadoTrabajoLabel(id, map) {
  return map.get(Number(id)) || `Estado ${id}`;
}

export default function EmployeeOrdenDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [orden, setOrden] = useState(null);
  const [lines, setLines] = useState([]);
  const [estadosTrabajo, setEstadosTrabajo] = useState([]);
  const [svc, setSvc] = useState([]);
  const [loading, setLoading] = useState(true);

  const estadoTrabajoMap = useMemo(() => {
    const m = new Map();
    estadosTrabajo.forEach((e) => m.set(Number(e.id), String(e.descripcion ?? e.estado ?? e.nombre ?? e.label)));
    return m;
  }, [estadosTrabajo]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Orden
        try {
          const o = await api.get(`/ordenreparacion/${id}`);
          setOrden(o || null);
        } catch {
          const list = await api.get("/ordenreparacion");
          setOrden((Array.isArray(list) ? list : []).find((x) => Number(x.id) === Number(id)) || null);
        }
        // Líneas
        const allLines = await api.get("/servicioordenreparacion");
        const arr = Array.isArray(allLines) ? allLines : [];
        setLines(arr.filter((r) => Number(r.id_orden_reparacion ?? r.id_orden ?? r.idOrden) === Number(id)));
        // Estados trabajo
        const et = await api.get("/estadotrabajo");
        setEstadosTrabajo(Array.isArray(et) ? et : []);
        // Catálogo servicios
        const s = await api.get("/servicio");
        setSvc(Array.isArray(s) ? s : []);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const svcMap = useMemo(() => {
    const m = new Map();
    svc.forEach((s) => m.set(Number(s.id), s));
    return m;
  }, [svc]);

  return (
    <section className="prose max-w-none px-6 md:px-10">
      <button className="btn btn-ghost mb-2" onClick={() => navigate(-1)}>← Volver</button>
      <h3>Orden #{id}</h3>

      {loading ? (
        <span className="loading loading-spinner loading-sm" />
      ) : !orden ? (
        <p className="text-error">No se encontró la orden.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="card border bg-base-100">
              <div className="card-body py-3">
                <p className="m-0 text-sm opacity-60">Vehículo</p>
                <h4 className="m-0">
                  {orden.vehiculo
                    ? `${orden.vehiculo.placas ?? ""} ${orden.vehiculo.marca ?? ""} ${orden.vehiculo.modelo ?? ""}`
                    : `ID ${orden.id_vehiculo}`}
                </h4>
              </div>
            </div>
            <div className="card border bg-base-100">
              <div className="card-body py-3">
                <p className="m-0 text-sm opacity-60">Ingreso</p>
                <h4 className="m-0">{orden.fecha_ingreso} {orden.hora_ingreso}</h4>
              </div>
            </div>
            <div className="card border bg-base-100">
              <div className="card-body py-3">
                <p className="m-0 text-sm opacity-60">Estado</p>
                <h4 className="m-0"><span className={estadoBadge(orden.estado)}>{orden.estado}</span></h4>
              </div>
            </div>
          </div>

          <h4 className="mt-0">Servicios de la orden</h4>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Servicio</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr><td colSpan={3}>Sin servicios para esta orden.</td></tr>
                ) : (
                  lines.map((l) => (
                    <tr key={l.id}>
                      <td>{l.id}</td>
                      <td>{svcMap.get(Number(l.id_servicio))?.servicio ?? l.id_servicio}</td>
                      <td>
                        <span className={estadoBadge(l.id_estado_trabajo)}>
                          {estadoTrabajoLabel(l.id_estado_trabajo, estadoTrabajoMap)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <button className="btn" onClick={() => navigate(`/empleado/facturas?ordenId=${id}`)}>
              Ver factura(s) de esta orden
            </button>
            <button className="btn btn-ghost ml-2" onClick={() => navigate(`/empleado/soporte?ordenId=${id}`)}>
              Reportar imprevisto / pedir ayuda
            </button>
          </div>
        </>
      )}
    </section>
  );
}
