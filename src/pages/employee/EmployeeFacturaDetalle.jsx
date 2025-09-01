import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../services/api";

const fmt = (n) =>
  isFinite(Number(n))
    ? Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n;

const todayYYYYMMDD = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export default function EmployeeFacturaDetalle() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const [factura, setFactura] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(todayYYYYMMDD());
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      let f;
      try {
        f = await api.get(`/factura/${id}`);
      } catch {
        const list = await api.get("/factura");
        f = (Array.isArray(list) ? list : []).find((x) => Number(x.id) === Number(id));
      }
      setFactura(f || null);
      const p = await api.get("/pago");
      setPagos((Array.isArray(p) ? p : []).filter((x) => Number(x.id_factura ?? x.factura_id) === Number(id)));
    } catch (e) {
      setErr(e.message || "No se pudo cargar la factura");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const pagado = useMemo(
    () => pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0),
    [pagos]
  );
  const saldo = Math.max(0, Number(factura?.total || 0) - pagado);

  async function crearPago(e) {
    e.preventDefault();
    if (!factura) return;
    setGuardando(true);
    try {
      await api.post("/pago", {
        id_factura: Number(factura.id),
        monto: Number(monto || 0),
        fecha: String(fecha || todayYYYYMMDD())
      });
      setMonto("");
      setFecha(todayYYYYMMDD());
      await cargar();
    } catch (e) {
      alert(e.message || "No se pudo registrar el pago");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarPago(idPago) {
    if (!confirm("¿Eliminar este pago?")) return;
    try {
      await api.del(`/pago/${idPago}`);
      await cargar();
    } catch (e) {
      alert(e.message || "No se pudo eliminar");
    }
  }

  return (
    <section className="prose max-w-none px-6 md:px-10">
      <button className="btn btn-ghost mb-2" onClick={() => navigate(-1)}>← Volver</button>
      <h3>Factura #{id}</h3>

      {loading ? (
        <span className="loading loading-spinner loading-sm" />
      ) : err ? (
        <p className="text-error">{err}</p>
      ) : !factura ? (
        <p className="text-error">No se encontró la factura.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
            <Card label="Orden" value={`#${factura.id_orden_reparacion}`} />
            <Card label="Fecha" value={String(factura.fecha || "")} />
            <Card label="Total" value={`$${fmt(factura.total)}`} />
            <Card label="Saldo" value={saldo > 0 ? `$${fmt(saldo)}` : "Pagada"} badge={saldo <= 0 ? "badge-success" : "badge-warning"} />
          </div>

          {/* Historial de pagos */}
          <h4 className="mt-0">Pagos</h4>
          <div className="overflow-x-auto mb-4">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagos.length === 0 ? (
                  <tr><td colSpan={4}>No hay pagos registrados.</td></tr>
                ) : (
                  pagos.map((p) => (
                    <tr key={p.id}>
                      <td>#{p.id}</td>
                      <td>{String(p.fecha || "")}</td>
                      <td>${fmt(p.monto)}</td>
                      <td className="text-right">
                        <button className="btn btn-ghost btn-sm text-error" onClick={() => eliminarPago(p.id)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Registrar pago */}
          <div className="card border bg-base-100">
            <div className="card-body">
              <h4 className="m-0">Registrar pago</h4>
              <form className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2" onSubmit={crearPago}>
                <div className="form-control">
                  <label className="label"><span className="label-text">Monto</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input input-bordered"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    required
                    disabled={saldo <= 0}
                  />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Fecha</span></label>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                    disabled={saldo <= 0}
                  />
                </div>
                <div className="form-control flex justify-end">
                  <button className="btn btn-primary mt-8" type="submit" disabled={guardando || saldo <= 0}>
                    {guardando ? "Guardando..." : "Agregar pago"}
                  </button>
                </div>
              </form>
              {saldo <= 0 && <p className="m-0 opacity-60 text-sm">Esta factura ya está pagada.</p>}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Card({ label, value, badge }) {
  return (
    <div className="card border bg-base-100">
      <div className="card-body py-3">
        <p className="m-0 text-sm opacity-60">{label}</p>
        {badge ? <span className={`badge ${badge}`}>{value}</span> : <h4 className="m-0">{value}</h4>}
      </div>
    </div>
  );
}
