// src/pages/client/ClientInvoices.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../services/api";
import { jsPDF } from "jspdf";

const fmt = (n)=>
  isFinite(Number(n)) ? Number(n).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) : n;
const today = () => new Date().toISOString().slice(0, 10);

export default function ClientInvoices() {
  const [sp] = useSearchParams();
  const focusId = Number(sp.get("focus") || 0);
  const facturaIdForPayment = Number(sp.get("facturaId") || 0);
  const startPay = sp.get("pagar") === "1";

  const [facturas, setFacturas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [payModal, setPayModal] = useState(null); // {factura, monto, fecha}

  const fetchAll = useCallback(async ()=>{
    setLoading(true); setErr(null);
    try {
      const [f, p, s, l] = await Promise.all([
        api.get("/factura"),
        api.get("/pago"),
        api.get("/servicio"),
        api.get("/servicioordenreparacion"),
      ]);
      setFacturas(Array.isArray(f)?f:[]);
      setPagos(Array.isArray(p)?p:[]);
      setServicios(Array.isArray(s)?s:[]);
      setLineas(Array.isArray(l)?l:[]);
    } catch(e) {
      setErr(e.message || "No se pudo cargar la información.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{ fetchAll(); }, [fetchAll]);

  const pagosPorFactura = useMemo(()=>{
    const m = new Map();
    pagos.forEach(p=>{
      const idf = Number(p.id_factura ?? p.factura_id ?? 0);
      m.set(idf, (m.get(idf)||0) + Number(p.monto ?? 0));
    });
    return m;
  }, [pagos]);

  useEffect(()=>{
    if (startPay && facturaIdForPayment) {
      const f = facturas.find(x=>Number(x.id)===facturaIdForPayment);
      if (f) openPay(f);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPay, facturaIdForPayment, facturas]);

  function openPay(f) {
    const pagado = pagosPorFactura.get(Number(f.id)) || 0;
    const saldo = Math.max(0, Number(f.total || 0) - pagado);
    setPayModal({ factura: f, monto: saldo, fecha: today() });
  }
  function closePay() { setPayModal(null); }

  async function confirmPay() {
    if (!payModal) return;
    try {
      await api.post("/pago", {
        id_factura: Number(payModal.factura.id),
        monto: Number(payModal.monto),
        fecha: String(payModal.fecha || today()),
      });
      setPayModal(null);
      await fetchAll();
      alert("Pago registrado.");
    } catch (e) {
      alert(e.message || "No se pudo registrar el pago.");
    }
  }

  /* PDF simple sin html2canvas */
  function descargarPDF(f) {
    try {
      const doc = new jsPDF();
      const margin = 14; let y = 16;
      const pagado = pagosPorFactura.get(Number(f.id)) || 0;
      const saldo = Math.max(0, Number(f.total || 0) - pagado);

      doc.setFontSize(14);
      doc.text("PitStop Manager - Factura", margin, y); y+=8;
      doc.setFontSize(11);
      doc.text(`Factura #${f.id}`, margin, y); y+=6;
      doc.text(`Fecha: ${String(f.fecha || "")}`, margin, y); y+=6;
      doc.text(`Orden: #${f.id_orden_reparacion}`, margin, y); y+=10;

      // detalle de servicios (buscamos líneas de esa orden)
      doc.setFont(undefined, "bold"); doc.text("Detalle", margin, y); doc.setFont(undefined, "normal"); y+=6;
      const serviciosMap = new Map(servicios.map(s => [Number(s.id), String(s.servicio ?? s.nombre ?? "")]));
      const lines = lineas.filter(l => Number(l.id_orden_reparacion ?? l.id_orden ?? l.idOrden) === Number(f.id_orden_reparacion));
      if (lines.length === 0) {
        doc.text("Sin servicios asociados.", margin, y); y+=6;
      } else {
        lines.forEach((ln, i) => {
          const nombre = serviciosMap.get(Number(ln.id_servicio)) || `Servicio #${ln.id_servicio}`;
          doc.text(`${i+1}. ${nombre}`, margin, y);
          y += 6;
        });
      }

      y += 6;
      doc.line(margin, y, 200, y); y += 8;
      doc.text(`Total:  $${fmt(f.total)}`, margin, y); y+=6;
      doc.text(`Pagado: $${fmt(pagado)}`, margin, y); y+=6;
      doc.text(`Saldo:  $${fmt(saldo)}`, margin, y);

      doc.save(`Factura_${f.id}.pdf`);
    } catch (e) {
      alert(e.message || "No se pudo generar el PDF.");
    }
  }

  return (
    <section className="prose max-w-none px-6 md:px-10">
      <h2>Facturas y pagos</h2>
      {err && <p className="text-error">{err}</p>}

      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>#</th><th>Orden</th><th>Fecha</th><th>Total</th><th>Pagado</th><th>Saldo</th><th className="text-right">Acciones</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><span className="loading loading-spinner loading-sm"></span></td></tr>
            ) : facturas.length === 0 ? (
              <tr><td colSpan={7}>Sin facturas.</td></tr>
            ) : facturas.map((f)=> {
              const pagado = pagosPorFactura.get(Number(f.id)) || 0;
              const saldo = Math.max(0, Number(f.total || 0) - pagado);
              const highlight = focusId === Number(f.id);
              return (
                <tr key={f.id} className={highlight ? "bg-base-200" : ""}>
                  <td>#{f.id}</td>
                  <td>#{f.id_orden_reparacion}</td>
                  <td>{String(f.fecha || "")}</td>
                  <td>${fmt(f.total)}</td>
                  <td>${fmt(pagado)}</td>
                  <td>{saldo > 0 ? <span className="badge badge-warning">${fmt(saldo)}</span> : <span className="badge badge-success">Pagada</span>}</td>
                  <td className="text-right">
                    <div className="join">
                      <button className="btn btn-sm btn-outline join-item" onClick={()=>descargarPDF(f)}>Descargar PDF</button>
                      <button className="btn btn-sm join-item" onClick={()=>openPay(f)} disabled={saldo<=0}>Pagar</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal pago */}
      {payModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Registrar pago — Factura #{payModal.factura.id}</h3>
            <div className="form-control mt-4">
              <label className="label"><span className="label-text">Monto</span></label>
              <input type="number" step="0.01" min="0" className="input input-bordered"
                value={payModal.monto} onChange={(e)=>setPayModal({...payModal, monto: Number(e.target.value)})}/>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Fecha</span></label>
              <input type="date" className="input input-bordered"
                value={payModal.fecha} onChange={(e)=>setPayModal({...payModal, fecha: e.target.value})}/>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={closePay}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmPay}>Confirmar</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={closePay}></div>
        </div>
      )}
    </section>
  );
}
