import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../../services/api";

/* ========= helpers ========= */
function estadoBadge(id) {
  const n = Number(id);
  if (n === 1) return "badge badge-warning"; // Pendiente
  if (n === 2) return "badge badge-error"; // Cancelado
  if (n === 3) return "badge badge-success"; // Aprobado
  if (n === 4) return "badge badge-info"; // En curso
  if (n === 5) return "badge badge-success"; // Completado
  return "badge badge-ghost";
}
const fmt = (n) =>
  isFinite(Number(n))
    ? Number(n).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : n;

/* ========= página ========= */
export default function EmployeeHome() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const vehiculoId = Number(sp.get("vehiculoId") || 0);

  // Estado
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [ordenes, setOrdenes] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [pagos, setPagos] = useState([]);

  const fetchTodo = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      let o;
      if (vehiculoId > 0) {
        o = await api.get(`/ordenreparacion/idVehiculo/${vehiculoId}`);
      } else if (q && /^[A-Za-z0-9-]+$/.test(q)) {
        try {
          o = await api.get(`/ordenreparacion/placas/${q}`);
        } catch {
          o = await api.get("/ordenreparacion");
        }
      } else {
        o = await api.get("/ordenreparacion");
      }
      setOrdenes(Array.isArray(o) ? o : []);

      // Facturas y pagos (para calcular pendientes)
      const f = await api.get("/factura");
      setFacturas(Array.isArray(f) ? f : []);
      const p = await api.get("/pago");
      setPagos(Array.isArray(p) ? p : []);
    } catch (e) {
      setErr(e.message || "No se pudo cargar la información");
    } finally {
      setLoading(false);
    }
  }, [vehiculoId, q]);

  useEffect(() => {
    fetchTodo();
  }, [fetchTodo]);


  const pagosPorFactura = useMemo(() => {
    const m = new Map();
    pagos.forEach((p) => {
      const idf = Number(p.id_factura ?? p.factura_id ?? 0);
      const monto = Number(p.monto ?? 0);
      m.set(idf, (m.get(idf) || 0) + monto);
    });
    return m;
  }, [pagos]);


  const facturasPendientes = useMemo(() => {
    return facturas.filter((f) => {
      const pagado = pagosPorFactura.get(Number(f.id)) || 0;
      return Number(f.total ?? 0) - pagado > 0.0001;
    });
  }, [facturas, pagosPorFactura]);


  const ordenesActivas = useMemo(() => {
    return ordenes.filter(
      (o) => Number(o.estado) !== 2 && Number(o.estado) !== 5
    );
  }, [ordenes]);


  const ultimasOrdenes = useMemo(() => ordenes.slice(0, 5), [ordenes]);
  const ultimasFacturas = useMemo(() => facturas.slice(0, 5), [facturas]);

  // === UI ===
  return (
    <section className="prose max-w-none px-6 md:px-10">
      <p className="opacity-70 mt-10 mb-4">
        Aquí puedes dar seguimiento a tus órdenes, ver el detalle de facturas y
        registrar pagos.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="join">
          <input
            className="input input-bordered join-item w-[220px]"
            placeholder="Buscar (orden o placas)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn join-item" onClick={fetchTodo}>
            Buscar
          </button>
          <button className="btn join-item" onClick={() => setQ("")}>
            Limpiar
          </button>
        </div>

        <div className="divider divider-horizontal mx-2 hidden md:block"></div>

        <div className="flex gap-2 items-center">
          <button
            className="btn btn-outline"
            onClick={() => navigate("/empleado/ordenes")}
            title="Ver todas las órdenes"
          >
            Mis órdenes
          </button>
          <button
            className="btn btn-outline"
            onClick={() => navigate("/empleado/facturas")}
            title="Ver facturas"
          >
            Facturas y pagos
          </button>
          <button
            className="btn btn-outline"
            onClick={() => navigate("/empleado/soporte")}
            title="Reportar imprevisto o solicitar ayuda"
          >
            Soporte
          </button>
          <img
            src="/back-car.gif"
            alt="Sidecar"
            className="w-[400px] ml-20 -scale-x-100"
          />
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <CardStat
          label="Órdenes activas"
          value={ordenesActivas.length}
          hint="En curso o pendientes"
        />
        <CardStat
          label="Facturas pendientes"
          value={facturasPendientes.length}
          hint="Con saldo por pagar"
        />
        <CardStat
          label="Pagos registrados"
          value={pagos.length}
          hint="En el histórico"
        />
      </div>

      {err && <p className="text-error">{err}</p>}

      {/* Últimas órdenes */}
      <h4 className="mt-0">Últimas órdenes</h4>
      <div className="overflow-x-auto mb-6">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Vehículo</th>
              <th>Ingreso</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <span className="loading loading-spinner loading-sm"></span>
                </td>
              </tr>
            ) : ultimasOrdenes.length === 0 ? (
              <tr>
                <td colSpan={5}>No hay órdenes para mostrar.</td>
              </tr>
            ) : (
              ultimasOrdenes.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td title={`Vehículo ${o.id_vehiculo}`}>
                    {o.vehiculo
                      ? `${o.vehiculo.placas ?? ""} ${o.vehiculo.marca ?? ""} ${
                          o.vehiculo.modelo ?? ""
                        }`
                      : `ID ${o.id_vehiculo}`}
                  </td>
                  <td>
                    {o.fecha_ingreso} {o.hora_ingreso}
                  </td>
                  <td>
                    <span className={estadoBadge(o.estado)}>
                      {estadoLabel(o.estado)}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="join">
                      <button
                        className="btn btn-sm btn-outline join-item"
                        onClick={() => navigate(`/empleado/orden/${o.id}`)}
                      >
                        Ver detalle
                      </button>
                      <button
                        className="btn btn-sm join-item"
                        onClick={() =>
                          navigate(`/empleado/facturas?ordenId=${o.id}`)
                        }
                      >
                        Ver factura
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Últimas facturas */}
      <h4>Últimas facturas</h4>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Orden</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Saldo</th>
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
            ) : ultimasFacturas.length === 0 ? (
              <tr>
                <td colSpan={6}>No hay facturas para mostrar.</td>
              </tr>
            ) : (
              ultimasFacturas.map((f) => {
                const pagado = pagosPorFactura.get(Number(f.id)) || 0;
                const saldo = Math.max(0, Number(f.total || 0) - pagado);
                return (
                  <tr key={f.id}>
                    <td>#{f.id}</td>
                    <td>#{f.id_orden_reparacion}</td>
                    <td>{String(f.fecha || "")}</td>
                    <td>${fmt(f.total)}</td>
                    <td>
                      {saldo > 0 ? (
                        <span className="badge badge-warning">
                          ${fmt(saldo)}
                        </span>
                      ) : (
                        <span className="badge badge-success">Pagada</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="join">
                        <button
                          className="btn btn-sm btn-outline join-item"
                          onClick={() => navigate(`/empleado/factura/${f.id}`)}
                        >
                          Ver
                        </button>
                        <button
                          className="btn btn-sm join-item"
                          onClick={() =>
                            navigate(
                              `/empleado/pagos?nueva=1&facturaId=${f.id}`
                            )
                          }
                          disabled={saldo <= 0}
                          title={
                            saldo <= 0 ? "Factura pagada" : "Registrar pago"
                          }
                        >
                          Pagar
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
    </section>
  );
}

/* ========= subcomponentes UI ========= */
function CardStat({ label, value, hint }) {
  return (
    <div className="card bg-base-100 border shadow-sm">
      <div className="card-body py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="m-0 text-sm opacity-60">{label}</p>
            <h3 className="m-0">{value}</h3>
          </div>
          <span className="text-2xl"></span>
        </div>
        {hint && <p className="m-0 text-xs opacity-60">{hint}</p>}
      </div>
    </div>
  );
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
