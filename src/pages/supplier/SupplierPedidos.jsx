import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../services/api";


const PATHS = {
  pedidos: "/pedido",
  pedidosBySupplier: (id) => `/pedido/idProveedor/${id}`,
  estadosDetalle: "/estadopedidodetalle", 
};

const getProveedorId = () => Number(localStorage.getItem("proveedorId") || 0);

function estadoBadge(id) {
  const n = Number(id);
  if (n === 1) return "badge badge-warning";
  if (n === 2) return "badge badge-error";
  if (n === 3) return "badge badge-success";
  if (n === 4) return "badge badge-info";
  if (n === 5) return "badge badge-success";
  return "badge badge-ghost";
}

export default function SupplierPedidos() {
  const [sp] = useSearchParams();
  const focusId = Number(sp.get("focus") || 0);

  const [rows, setRows] = useState([]);
  const [estados, setEstados] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const provId = getProveedorId();
      const pedidosData = provId
        ? await api.get(PATHS.pedidosBySupplier(provId))
        : await api.get(PATHS.pedidos);

      setRows(Array.isArray(pedidosData) ? pedidosData : []);

      const est = await api.get(PATHS.estadosDetalle).catch(() => []);
      setEstados(Array.isArray(est) ? est : []);
    } catch (ex) {
      setErr(ex.message || "Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);


  const estadoLabel = useCallback((id) => {
    const x = estados.find((e) => Number(e.id) === Number(id));
    return x?.estado ?? x?.nombre ?? `Estado ${id}`;
  }, [estados]);


  const ids = useMemo(() => ({
    pendiente: 1,
    rechazado: 2,
    aprobado: 3,
    enCurso: 4,
    completado: 5,
  }), []);

  async function setEstado(pedido, estadoId) {
    try {
      await api.put(`/pedido/${pedido.id}`, {
        columnName: "estado",
        value: String(estadoId),
      });
      await fetchAll();
    } catch (e) {
      alert(e.message || "No se pudo actualizar el estado.");
    }
  }

  const aceptar = (p) => setEstado(p, ids.aprobado);
  const rechazar = (p) => setEstado(p, ids.rechazado);
  const confirmarEnvio = (p) => setEstado(p, ids.enCurso);
  const confirmarEntrega = (p) => setEstado(p, ids.completado);

  async function marcarRetraso(pedido) {
    const motivo = prompt("Describe el motivo del retraso (opcional):") || "";
    try {
      await api.put(`/pedido/${pedido.id}`, {
        columnName: "nota_proveedor",
        value: motivo || "Retraso",
      }).catch(() => {}); 
      alert("Notificado.");
      await fetchAll();
    } catch (e) {
      alert(e.message || "No se pudo notificar el retraso.");
    }
  }

  return (
    <section className="prose max-w-none px-6 md:px-10">
      <h2>Pedidos</h2>
      {err && <p className="text-error">{err}</p>}
      {loading && <span className="loading loading-spinner loading-sm" />}

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
            {rows.length === 0 ? (
              <tr><td colSpan={6}>Sin pedidos.</td></tr>
            ) : rows.map((p) => (
              <tr key={p.id} className={focusId === Number(p.id) ? "bg-base-200" : ""}>
                <td>#{p.id}</td>
                <td>{p.fecha_pedido ?? ""}</td>
                <td>{p.fecha_entrega ?? "—"}</td>
                <td>
                  <span className={estadoBadge(p.estado)}>
                    {estadoLabel(p.estado)}
                  </span>
                </td>
                <td>{p.total != null ? `$${Number(p.total).toFixed(2)}` : "—"}</td>
                <td className="text-right">
                  <div className="join">
                    <button className="btn btn-sm btn-success join-item" onClick={() => aceptar(p)} title="Aceptar">Aceptar</button>
                    <button className="btn btn-sm btn-outline join-item" onClick={() => rechazar(p)} title="Rechazar">Rechazar</button>
                    <button className="btn btn-sm join-item" onClick={() => confirmarEnvio(p)} title="Confirmar envío">Envío</button>
                    <button className="btn btn-sm join-item" onClick={() => confirmarEntrega(p)} title="Confirmar entrega">Entregado</button>
                    <button className="btn btn-sm btn-ghost join-item" onClick={() => marcarRetraso(p)} title="Notificar retraso">Retraso</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
