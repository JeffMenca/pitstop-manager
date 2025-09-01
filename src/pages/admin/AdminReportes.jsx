// src/pages/admin/AdminReportes.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { jsPDF } from "jspdf";

/* ===== helpers ===== */
const today = () => new Date().toISOString().slice(0, 10);
const startOfYear = () =>
  new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
const fmt = (n) =>
  isFinite(Number(n))
    ? Number(n).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : n;

async function tryPost(paths, body) {
  for (const p of paths) {
    try {
      return { ok: true, data: await api.post(p, body), path: p };
    } catch {}
  }
  return { ok: false, data: [], path: null };
}
async function tryGet(paths) {
  for (const p of paths) {
    try {
      return { ok: true, data: await api.get(p), path: p };
    } catch {}
  }
  return { ok: false, data: [], path: null };
}

/** PDF tabular simple (sin dependencias externas) */
function exportTablePDF({ title, subtitle, head, rows, widths, orientation }) {
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 12;
  let y = M + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, M, y);
  y += 8;
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, M, y);
    y += 6;
  }
  y += 3;

  const colW = widths;
  const colX = [];
  let acc = M;
  for (let i = 0; i < colW.length; i++) {
    colX[i] = acc;
    acc += colW[i];
  }

  function footer() {
    const t = `Página ${doc.getCurrentPageInfo().pageNumber}`;
    doc.setFontSize(9);
    doc.text(t, W - M - doc.getTextWidth(t), H - 6);
  }
  function headerRow() {
    doc.setFillColor(33, 150, 243);
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const h = 8;
    for (let i = 0; i < head.length; i++) {
      doc.rect(colX[i], y, colW[i], h, "F");
      doc.text(String(head[i]), colX[i] + 2, y + 5);
    }
    y += h;
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
  }
  function addRow(cells) {
    const lineH = 5;
    const splits = cells.map((c, i) =>
      doc.splitTextToSize(String(c ?? ""), colW[i] - 4)
    );
    const h = Math.max(...splits.map((s) => s.length)) * lineH + 3;
    if (y + h + 10 > H - M) {
      footer();
      doc.addPage({ orientation });
      y = M + 6;
      headerRow();
    }
    for (let i = 0; i < cells.length; i++) {
      doc.rect(colX[i], y, colW[i], h);
      const right = i === cells.length - 1;
      const tx = right ? colX[i] + colW[i] - 2 : colX[i] + 2;
      splits[i].forEach((ln, k) =>
        doc.text(String(ln), tx, y + 5 + k * lineH, right ? { align: "right" } : undefined)
      );
    }
    y += h;
  }

  headerRow();
  rows.forEach(addRow);
  footer();
  const name = title.toLowerCase().replace(/\s+/g, "_");
  doc.save(`${name}.pdf`);
}

/* ===== Página ===== */
export default function AdminReportes() {
  const [tab, setTab] = useState("trabajo"); // trabajo | vehiculo | trabajoTipo | trabajoMec | cliente

  return (
    <section className="prose max-w-none px-6 md:px-10">
      <h2 className="my-6">Reportes</h2>

      <div className="tabs tabs-boxed w-fit mb-6 flex flex-wrap">
        <button
          className={`tab ${tab === "trabajo" ? "tab-active" : ""}`}
          onClick={() => setTab("trabajo")}
        >
          Trabajos por fecha
        </button>
        <button
          className={`tab ${tab === "trabajoTipo" ? "tab-active" : ""}`}
          onClick={() => setTab("trabajoTipo")}
        >
          Trabajos por tipo
        </button>
        <button
          className={`tab ${tab === "trabajoMec" ? "tab-active" : ""}`}
          onClick={() => setTab("trabajoMec")}
        >
          Trabajos por mecánico
        </button>
        <button
          className={`tab ${tab === "vehiculo" ? "tab-active" : ""}`}
          onClick={() => setTab("vehiculo")}
        >
          Reporte por vehículo
        </button>
        <button
          className={`tab ${tab === "cliente" ? "tab-active" : ""}`}
          onClick={() => setTab("cliente")}
        >
          Reporte por cliente
        </button>
      </div>

      {tab === "trabajo" && <ReporteTrabajo />}
      {tab === "trabajoTipo" && <ReporteTrabajoPorTipo />}
      {tab === "trabajoMec" && <ReporteTrabajoPorMecanico />}
      {tab === "vehiculo" && <ReporteVehiculo />}
      {tab === "cliente" && <ReporteCliente />}
    </section>
  );
}

/* ===== Trabajos por FECHA (POST TrabajoFecha) ===== */
function ReporteTrabajo() {
  const [desde, setDesde] = useState(startOfYear());
  const [hasta, setHasta] = useState(today());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setRows([]);
    try {
      const body = { fecha_inicio: String(desde), fecha_final: String(hasta) };
      const r = await tryPost(
        [
          "/api/ordenreparacion/Reporte/TrabajoFecha",
          "/ordenreparacion/Reporte/TrabajoFecha",
          "/api/ordenreparacion/Reporte/Trabajo",
          "/ordenreparacion/Reporte/Trabajo",
        ],
        body
      );
      if (!r.ok) throw new Error("No se pudo generar el reporte.");
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErr(e.message || "No se pudo generar el reporte.");
    } finally {
      setLoading(false);
    }
  }, [desde, hasta]);

  const total = useMemo(
    () =>
      rows.reduce((a, r) => a + (Number(r.precio ?? r.total ?? 0) || 0), 0),
    [rows]
  );

  function onExportPDF() {
    const head = [
      "ID Orden",
      "Ingreso",
      "Egreso",
      "Servicio",
      "Descripción",
      "Estado",
      "Mecánico",
      "Precio",
    ];
    const data = rows.map((r) => [
      r.id_orden ?? r.id ?? "",
      r.fecha_ingreso ?? "",
      r.fecha_egreso ?? "",
      r.servicio ?? "",
      r.descripcion ?? "",
      r.estado_trabajo ?? "",
      [r.mecanico_nombre, r.mecanico_apellido].filter(Boolean).join(" "),
      `$${fmt(r.precio ?? r.total ?? 0)}`,
    ]);
    if (rows.length) data.push(["", "", "", "", "", "", "TOTAL", `$${fmt(total)}`]);
    exportTablePDF({
      title: "Reporte de Órdenes de Trabajo",
      subtitle: `Rango: ${desde} a ${hasta}`,
      head,
      rows: data,
      widths: [18, 30, 30, 40, 70, 28, 32, 25],
      orientation: "landscape",
    });
  }

  return (
    <>
      <div className="card bg-base-100 border shadow-sm mb-6">
        <div className="card-body grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <label className="label">
              <span className="label-text">Desde</span>
            </label>
            <input
              type="date"
              className="input input-bordered w-full"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">
              <span className="label-text">Hasta</span>
            </label>
            <input
              type="date"
              className="input input-bordered w-full"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex items-end gap-2">
            <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
              {loading ? "Generando..." : "Generar reporte"}
            </button>
            <button
              className="btn btn-outline"
              onClick={onExportPDF}
              disabled={rows.length === 0}
            >
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {err && <p className="text-error">{err}</p>}

      <TablaTrabajo rows={rows} total={total} />
    </>
  );
}

/* ===== Trabajos por TIPO (GET .../Trabajo/:id) ===== */
function ReporteTrabajoPorTipo() {
  const [tipos, setTipos] = useState([]);
  const [tipoId, setTipoId] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      const r = await tryGet(["/servicio"]);
      setTipos(
        (Array.isArray(r.data) ? r.data : []).map((s) => ({
          id: Number(s.id),
          nombre: String(s.servicio ?? s.nombre ?? `Servicio ${s.id}`),
        }))
      );
    })();
  }, []);

  const fetchData = useCallback(async () => {
    const id = Number(tipoId || 0);
    if (!id) return setErr("Selecciona un tipo de trabajo.");
    setLoading(true);
    setErr(null);
    setRows([]);
    try {
      const r = await tryGet([
        `/api/ordenreparacion/Reporte/Trabajo/${id}`,
        `/ordenreparacion/Reporte/Trabajo/${id}`,
      ]);
      if (!r.ok) throw new Error("No se pudo obtener el reporte.");
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErr(e.message || "No se pudo obtener el reporte.");
    } finally {
      setLoading(false);
    }
  }, [tipoId]);

  const total = useMemo(
    () =>
      rows.reduce((a, r) => a + (Number(r.precio ?? r.total ?? 0) || 0), 0),
    [rows]
  );

  function onExportPDF() {
    const nombre =
      tipos.find((t) => Number(t.id) === Number(tipoId))?.nombre || `#${tipoId}`;
    const head = [
      "ID Orden",
      "Ingreso",
      "Egreso",
      "Mecánico",
      "Estado",
      "Precio",
    ];
    const data = rows.map((r) => [
      r.id_orden ?? r.id ?? "",
      r.fecha_ingreso ?? "",
      r.fecha_egreso ?? "",
      [r.mecanico_nombre, r.mecanico_apellido].filter(Boolean).join(" "),
      r.estado_trabajo ?? "",
      `$${fmt(r.precio ?? r.total ?? 0)}`,
    ]);
    if (rows.length) data.push(["", "", "", "TOTAL", "", `$${fmt(total)}`]);
    exportTablePDF({
      title: "Trabajos por Tipo",
      subtitle: `Tipo: ${nombre}`,
      head,
      rows: data,
      widths: [22, 30, 30, 60, 32, 26],
      orientation: "landscape",
    });
  }

  return (
    <>
      <div className="card bg-base-100 border shadow-sm mb-6">
        <div className="card-body grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-3">
            <label className="label">
              <span className="label-text">Tipo de trabajo</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={tipoId}
              onChange={(e) => setTipoId(Number(e.target.value))}
            >
              <option value={0}>Seleccione…</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3 flex items-end gap-2">
            <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
              {loading ? "Cargando…" : "Generar reporte"}
            </button>
            <button
              className="btn btn-outline"
              onClick={onExportPDF}
              disabled={rows.length === 0}
            >
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {err && <p className="text-error">{err}</p>}
      <TablaTrabajo rows={rows} total={total} hideServicio />
    </>
  );
}

/* ===== Trabajos por MECÁNICO (GET .../Trabajador/:id) ===== */
function ReporteTrabajoPorMecanico() {
  const [mecs, setMecs] = useState([]);
  const [mecId, setMecId] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      const r = await tryGet(["/empleado", "/empleados"]);
      const list = Array.isArray(r.data) ? r.data : [];
      setMecs(
        list.map((e) => ({
          id: Number(e.id ?? e.ID ?? 0),
          nombre: [e.nombre, e.apellido].filter(Boolean).join(" ") || `Empleado #${e.id}`,
        }))
      );
    })();
  }, []);

  const fetchData = useCallback(async () => {
    const id = Number(mecId || 0);
    if (!id) return setErr("Selecciona un mecánico.");
    setLoading(true);
    setErr(null);
    setRows([]);
    try {
      const r = await tryGet([
        `/api/ordenreparacion/Reporte/Trabajador/${id}`,
        `/ordenreparacion/Reporte/Trabajador/${id}`,
      ]);
      if (!r.ok) throw new Error("No se pudo obtener el reporte.");
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErr(e.message || "No se pudo obtener el reporte.");
    } finally {
      setLoading(false);
    }
  }, [mecId]);

  const total = useMemo(
    () =>
      rows.reduce((a, r) => a + (Number(r.precio ?? r.total ?? 0) || 0), 0),
    [rows]
  );

  function onExportPDF() {
    const nom =
      mecs.find((m) => Number(m.id) === Number(mecId))?.nombre || `#${mecId}`;
    const head = [
      "ID Orden",
      "Ingreso",
      "Egreso",
      "Servicio",
      "Estado",
      "Precio",
    ];
    const data = rows.map((r) => [
      r.id_orden ?? r.id ?? "",
      r.fecha_ingreso ?? "",
      r.fecha_egreso ?? "",
      r.servicio ?? "",
      r.estado_trabajo ?? "",
      `$${fmt(r.precio ?? r.total ?? 0)}`,
    ]);
    if (rows.length) data.push(["", "", "", "TOTAL", "", `$${fmt(total)}`]);
    exportTablePDF({
      title: "Trabajos por Mecánico",
      subtitle: `Mecánico: ${nom}`,
      head,
      rows: data,
      widths: [22, 30, 30, 60, 32, 26],
      orientation: "landscape",
    });
  }

  return (
    <>
      <div className="card bg-base-100 border shadow-sm mb-6">
        <div className="card-body grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-3">
            <label className="label">
              <span className="label-text">Mecánico</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={mecId}
              onChange={(e) => setMecId(Number(e.target.value))}
            >
              <option value={0}>Seleccione…</option>
              {mecs.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3 flex items-end gap-2">
            <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
              {loading ? "Cargando…" : "Generar reporte"}
            </button>
            <button
              className="btn btn-outline"
              onClick={onExportPDF}
              disabled={rows.length === 0}
            >
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {err && <p className="text-error">{err}</p>}
      <TablaTrabajo rows={rows} total={total} />
    </>
  );
}

/* ===== Reporte por VEHÍCULO (igual que tenías) ===== */
function ReporteVehiculo() {
  const [vehiculoId, setVehiculoId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const header = useMemo(() => {
    const f = rows[0] || {};
    return {
      id: f.id_vehiculo ?? "",
      marca: f.marca ?? "",
      modelo: f.modelo ?? "",
      placas: f.placas ?? "",
    };
  }, [rows]);

  const fetchData = useCallback(async () => {
    const id = Number(vehiculoId || 0);
    if (!id) return setErr("Escribe un ID de vehículo válido.");
    setLoading(true);
    setErr(null);
    setRows([]);
    try {
      const r = await tryGet([`/api/vehiculo/Reporte/${id}`, `/vehiculo/Reporte/${id}`]);
      if (!r.ok) throw new Error("No se pudo obtener el reporte del vehículo.");
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErr(e.message || "No se pudo obtener el reporte.");
    } finally {
      setLoading(false);
    }
  }, [vehiculoId]);

  function onExportPDF() {
    const head = ["ID Orden", "Estado", "Ingreso", "Egreso", "Servicio", "Descripción", "Precio"];
    const data = rows.map((r) => [
      r.id_orden ?? "",
      r.estado_orden ?? r.estado_trabajo ?? "",
      r.fecha_ingreso ?? "",
      r.fecha_egreso ?? "",
      r.servicio ?? "",
      r.descripcion ?? "",
      `$${fmt(r.precio ?? r.total ?? 0)}`,
    ]);
    exportTablePDF({
      title: "Reporte por Vehículo",
      subtitle: `Vehículo #${header.id} — ${header.marca} ${header.modelo} (${header.placas})`,
      head,
      rows: data,
      widths: [18, 26, 28, 28, 36, 34, 16],
      orientation: "portrait",
    });
  }

  return (
    <>
      <div className="card bg-base-100 border shadow-sm mb-6">
        <div className="card-body grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <label className="label">
              <span className="label-text">ID Vehículo</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={vehiculoId}
              onChange={(e) => setVehiculoId(e.target.value)}
              placeholder="e.g. 12"
            />
          </div>
          <div className="md:col-span-4 flex items-end gap-2">
            <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
              {loading ? "Cargando..." : "Generar reporte"}
            </button>
            <button
              className="btn btn-outline"
              onClick={onExportPDF}
              disabled={rows.length === 0}
            >
              Exportar PDF
            </button>
          </div>

          {rows.length > 0 && (
            <div className="md:col-span-6">
              <div className="alert">
                <span>
                  <strong>Vehículo:</strong> #{header.id} — {header.marca} {header.modelo} (
                  {header.placas})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {err && <p className="text-error">{err}</p>}

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>ID Orden</th>
              <th>Estado</th>
              <th>Ingreso</th>
              <th>Egreso</th>
              <th>Servicio</th>
              <th>Descripción</th>
              <th className="text-right">Precio</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}>Sin resultados. Ingresa un ID y genera el reporte.</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.id_orden ?? "-"}</td>
                  <td>{r.estado_orden ?? r.estado_trabajo ?? "-"}</td>
                  <td>{r.fecha_ingreso ?? "-"}</td>
                  <td>{r.fecha_egreso ?? "-"}</td>
                  <td>{r.servicio ?? "-"}</td>
                  <td>{r.descripcion ?? "-"}</td>
                  <td className="text-right">${fmt(r.precio ?? r.total ?? 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ===== Reporte por CLIENTE (GET /api/cliente/reporte/:id) ===== */
function ReporteCliente() {
  const [clientes, setClientes] = useState([]); // {id, nombre}
  const [clienteId, setClienteId] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      const r = await tryGet(["/api/cliente", "/cliente"]);
      const list = Array.isArray(r.data) ? r.data : [];
      setClientes(
        list.map((c) => ({
          id: Number(c.id ?? c.ID ?? 0),
          nombre:
            [c.nombre, c.apellido].filter(Boolean).join(" ") ||
            c.cliente ||
            `Cliente #${c.id}`,
        }))
      );
    })();
  }, []);

  const header = useMemo(() => {
    const f = rows[0] || {};
    return {
      id_cliente: Number(clienteId || f.id_cliente || f.id || 0),
      nombre:
        [f.cliente_nombre, f.cliente_apellido].filter(Boolean).join(" ") ||
        clientes.find((x) => x.id === Number(clienteId))?.nombre ||
        "",
    };
  }, [rows, clienteId, clientes]);

  const fetchData = useCallback(async () => {
    const id = Number(clienteId || 0);
    if (!id) return setErr("Selecciona un cliente.");
    setLoading(true);
    setErr(null);
    setRows([]);
    try {
      const r = await tryGet([
        `/api/cliente/reporte/${id}`,
        `/cliente/reporte/${id}`,
      ]);
      if (!r.ok) throw new Error("No se pudo obtener el reporte del cliente.");
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErr(e.message || "No se pudo obtener el reporte.");
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  const total = useMemo(
    () =>
      rows.reduce((a, r) => a + (Number(r.precio ?? r.total ?? 0) || 0), 0),
    [rows]
  );

  function onExportPDF() {
    const head = [
      "ID Orden",
      "Vehículo",
      "Ingreso",
      "Egreso",
      "Servicio",
      "Estado",
      "Precio",
    ];
    const data = rows.map((r) => [
      r.id_orden ?? r.orden_id ?? "",
      r.placas ??
        r.vehiculo ??
        [r.marca, r.modelo].filter(Boolean).join(" ") ??
        "",
      r.fecha_ingreso ?? "",
      r.fecha_egreso ?? "",
      r.servicio ?? "",
      r.estado_orden ?? r.estado_trabajo ?? "",
      `$${fmt(r.precio ?? r.total ?? 0)}`,
    ]);
    if (rows.length) data.push(["", "", "", "", "TOTAL", "", `$${fmt(total)}`]);
    exportTablePDF({
      title: "Reporte por Cliente",
      subtitle: `Cliente #${header.id_cliente} — ${header.nombre}`,
      head,
      rows: data,
      widths: [18, 36, 28, 28, 40, 30, 20],
      orientation: "landscape",
    });
  }

  return (
    <>
      <div className="card bg-base-100 border shadow-sm mb-6">
        <div className="card-body grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-3">
            <label className="label">
              <span className="label-text">Cliente</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={clienteId}
              onChange={(e) => setClienteId(Number(e.target.value))}
            >
              <option value={0}>Seleccione…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3 flex items-end gap-2">
            <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
              {loading ? "Cargando…" : "Generar reporte"}
            </button>
            <button
              className="btn btn-outline"
              onClick={onExportPDF}
              disabled={rows.length === 0}
            >
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {err && <p className="text-error">{err}</p>}

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>ID Orden</th>
              <th>Vehículo</th>
              <th>Ingreso</th>
              <th>Egreso</th>
              <th>Servicio</th>
              <th>Estado</th>
              <th className="text-right">Precio</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}>Sin resultados.</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.id_orden ?? r.orden_id ?? "-"}</td>
                  <td>
                    {r.placas ??
                      r.vehiculo ??
                      [r.marca, r.modelo].filter(Boolean).join(" ") ??
                      "-"}
                  </td>
                  <td>{r.fecha_ingreso ?? "-"}</td>
                  <td>{r.fecha_egreso ?? "-"}</td>
                  <td>{r.servicio ?? "-"}</td>
                  <td>{r.estado_orden ?? r.estado_trabajo ?? "-"}</td>
                  <td className="text-right">
                    ${fmt(r.precio ?? r.total ?? 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={6} className="text-right">
                  TOTAL
                </td>
                <td className="text-right">${fmt(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}

/* ===== Tabla reutilizable para trabajos ===== */
function TablaTrabajo({ rows, total, hideServicio = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>ID Orden</th>
            <th>Ingreso</th>
            <th>Egreso</th>
            {!hideServicio && <th>Servicio</th>}
            <th>Descripción</th>
            <th>Estado</th>
            <th>Mecánico</th>
            <th className="text-right">Precio</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={hideServicio ? 7 : 8}>
                Sin resultados. Genera el reporte para ver datos.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i}>
                <td>{r.id_orden ?? r.id ?? "-"}</td>
                <td>{r.fecha_ingreso ?? "-"}</td>
                <td>{r.fecha_egreso ?? "-"}</td>
                {!hideServicio && <td>{r.servicio ?? "-"}</td>}
                <td>{r.descripcion ?? "-"}</td>
                <td>{r.estado_trabajo ?? "-"}</td>
                <td>
                  {[r.mecanico_nombre, r.mecanico_apellido]
                    .filter(Boolean)
                    .join(" ") || "-"}
                </td>
                <td className="text-right">${fmt(r.precio ?? r.total ?? 0)}</td>
              </tr>
            ))
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={hideServicio ? 6 : 7} className="text-right">
                TOTAL
              </td>
              <td className="text-right">${fmt(total)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
