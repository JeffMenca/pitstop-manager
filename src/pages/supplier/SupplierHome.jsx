import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";

const PATHS = {
  pedidos: "/pedido",
  pedidosBySupplier: (id) => `/pedido/idProveedor/${id}`,
  estadosDetalle: "/estadopedidodetalle", 
};

/* ====== helpers ====== */
const getProveedorId = () => Number(localStorage.getItem("proveedorId") || 0);

function estadoBadge(id) {
  const n = Number(id);
  if (n === 1) return "badge badge-warning"; // Pendiente
  if (n === 2) return "badge badge-error";   // Rechazado
  if (n === 3) return "badge badge-success"; // Aprobado/Confirmado
  if (n === 4) return "badge badge-info";    // En curso/Envío
  if (n === 5) return "badge badge-success"; // Completado
  return "badge badge-ghost";
}
const fmt = (n) =>
  isFinite(Number(n))
    ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n;

export default function SupplierHome() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [pedidos, setPedidos] = useState([]);
  const [estadosDetalle, setEstadosDetalle] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const provId = getProveedorId();
      const pedidosData = provId
        ? await api.get(PATHS.pedidosBySupplier(provId))
        : await api.get(PATHS.pedidos);

      setPedidos(Array.isArray(pedidosData) ? pedidosData : []);


      const estados = await api.get(PATHS.estadosDetalle).catch(() => []);
      setEstadosDetalle(Array.isArray(estados) ? estados : []);
    } catch (e) {
      setErr(e.message || "No se pudo cargar la información.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const pedidosActivos = useMemo(
    () => pedidos.filter((p) => ![2, 5].includes(Number(p.estado))),
    [pedidos]
  );

  const estadoLabel = (id) => {
    const x = estadosDetalle.find((e) => Number(e.id) === Number(id));
    return x?.estado ?? x?.nombre ?? `Estado ${id}`;
  };

  return (
    <section className="prose max-w-none px-6 md:px-10">
      <h2 className="my-6">Panel del proveedor</h2>
      <p className="opacity-70 -mt-2">Gestione cotizaciones, pedidos y su catálogo.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <CardStat label="Pedidos activos" value={pedidosActivos.length} hint="En curso o pendientes" />
        <CardStat label="Pedidos totales" value={pedidos.length} />
        <CardStat label="Entrega próxima" value={pedidos.filter(p => p.fecha_entrega).length} hint="Con fecha de entrega" />
      </div>

      {err && <p className="text-error">{err}</p>}
      {loading && <span className="loading loading-spinner loading-sm" />}

      <div className="flex gap-2 mb-6">
        <button className="btn btn-outline" onClick={() => nav("/proveedor/pedidos")}>Ver pedidos</button>
        <button className="btn btn-outline" onClick={() => nav("/proveedor/productos")}>Mis productos</button>
      </div>

      <h4 className="mt-0">Últimos pedidos</h4>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha pedido</th>
              <th>Entrega</th>
              <th>Estado</th>
              <th>Total</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(pedidos.slice(0, 5)).map((p) => (
              <tr key={p.id}>
                <td>#{p.id}</td>
                <td>{p.fecha_pedido ?? ""}</td>
                <td>{p.fecha_entrega ?? "—"}</td>
                <td>
                  <span className={estadoBadge(p.estado)}>
                    {estadoLabel(p.estado)}
                  </span>
                </td>
                <td>{p.total != null ? `$${fmt(p.total)}` : "—"}</td>
                <td className="text-right">
                  <button className="btn btn-sm btn-outline" onClick={() => nav(`/proveedor/pedidos?focus=${p.id}`)}>
                    Abrir
                  </button>
                </td>
              </tr>
            ))}
            {pedidos.length === 0 && (
              <tr><td colSpan={6}>Sin pedidos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CardStat({ label, value, hint }) {
  return (
    <div className="card bg-base-100 border shadow-sm">
      <div className="card-body py-4">
        <p className="m-0 text-sm opacity-60">{label}</p>
        <h3 className="m-0">{value}</h3>
        {hint && <p className="m-0 text-xs opacity-60">{hint}</p>}
      </div>
    </div>
  );
}
