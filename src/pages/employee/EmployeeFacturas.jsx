import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../services/api";

const fmt = (n) =>
  isFinite(Number(n))
    ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n;

export default function EmployeeFacturas() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const ordenId = Number(sp.get("ordenId") || 0);

  const [facturas, setFacturas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [q, setQ] = useState(ordenId ? String(ordenId) : "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const f = await api.get("/factura");
      setFacturas(Array.isArray(f) ? f : []);
      const p = await api.get("/pago");
      setPagos(Array.isArray(p) ? p : []);
    } catch (e) {
      setErr(e.message || "No se pudo cargar la información");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const pagosPorFactura = useMemo(() => {
    const m = new Map();
    pagos.forEach((p) => {
      const idf = Number(p.id_factura ?? p.factura_id ?? 0);
      const monto = Number(p.monto ?? 0);
      m.set(idf, (m.get(idf) || 0) + monto);
    });
    return m;
  }, [pagos]);

  const visibles = useMemo(() => {
    if (!q) return facturas;
    const id = Number(q) || 0;
    return facturas.filter((f) => Number(f.id_orden_reparacion) === id || Number(f.id) === id);
  }, [facturas, q]);

  return (
    <section className="prose max-w-none px-6 md:px-10">
      <h3>Facturas y pagos</h3>

      <div className="join mb-4">
        <input
          className="input input-bordered join-item w-[240px]"
          placeholder="Filtrar por #orden o #factura"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn join-item" onClick={fetchAll}>Recargar</button>
        <button className="btn join-item" onClick={() => setQ("")}>Limpiar</button>
      </div>

      {err && <p className="text-error">{err}</p>}

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Orden</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Saldo</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><span className="loading loading-spinner loading-sm" /></td></tr>
            ) : visibles.length === 0 ? (
              <tr><td colSpan={7}>No hay facturas.</td></tr>
            ) : (
              visibles.map((f) => {
                const pagado = pagosPorFactura.get(Number(f.id)) || 0;
                const saldo = Math.max(0, Number(f.total || 0) - pagado);
                return (
                  <tr key={f.id}>
                    <td>#{f.id}</td>
                    <td>#{f.id_orden_reparacion}</td>
                    <td>{String(f.fecha || "")}</td>
                    <td>${fmt(f.total)}</td>
                    <td>${fmt(pagado)}</td>
                    <td>{saldo > 0 ? <span className="badge badge-warning">${fmt(saldo)}</span> : <span className="badge badge-success">Pagada</span>}</td>
                    <td className="text-right">
                      <div className="join">
                        <button className="btn btn-sm btn-outline join-item" onClick={() => navigate(`/empleado/factura/${f.id}`)}>Ver</button>
                        <button className="btn btn-sm join-item" onClick={() => navigate(`/empleado/factura/${f.id}?pagar=1`)} disabled={saldo <= 0}>Pagar</button>
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
