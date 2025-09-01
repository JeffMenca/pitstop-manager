// src/pages/client/ClientSupport.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../services/api";

/* =========== helpers =========== */
const today = () => new Date().toISOString().slice(0, 10); 
const nowHMS = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export default function EmployeeSuporte() {
  const [sp] = useSearchParams();
  
  const ordenIdFromURL = Number(sp.get("ordenId") || 0);
  const empleadoOrdenIdFromURL = Number(sp.get("empleadoOrdenId") || 0);

  const [tipos, setTipos] = useState([]);
  const [loadingTipos, setLoadingTipos] = useState(false);

  const [form, setForm] = useState({
    id_tipo_reporte: 0,
    observaciones: "",
    fecha: today(),
    hora: nowHMS(),
    ordenId: ordenIdFromURL || 0,
    empleadoOrdenId: empleadoOrdenIdFromURL || 0,
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const upd = (k, v) => setForm((s) => ({ ...s, [k]: v }));



  const POST_PATHS = ["api/reporte", "/reporte"];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTipos(true);
      setErr(null);
      try {
        const data = await api.get(GET_TIPOS);
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];

          const normalized = list
            .map((t) => ({
              id: Number(t.id ?? t.ID ?? 0),
              label:
                String(
                  t.tipo_reporte ??
                    t.nombre ??
                    t.descripcion ??
                    `Tipo #${t.id}`
                ) || "",
              mostrar_mecanico:
                Number(t.mostrar_mecanico ?? t.mostrar ?? 0) === 1,
            }))
            .sort((a, b) => a.id - b.id);
          setTipos(normalized);

          if (normalized.length && !form.id_tipo_reporte) {
            upd("id_tipo_reporte", normalized[0].id);
          }
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || "No se pudieron cargar los tipos de reporte");
      } finally {
        if (!cancelled) setLoadingTipos(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const tiposCliente = useMemo(() => {
    const WHITELIST = new Set([1, 2, 3, 4]);
    const anyInWhitelist = tipos.some((t) => WHITELIST.has(t.id));
    return anyInWhitelist ? tipos.filter((t) => WHITELIST.has(t.id)) : tipos;
  }, [tipos]);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);


    const base = {
      id_tipo_reporte: Number(form.id_tipo_reporte),
      observaciones: String(form.observaciones || ""),
      solucionado: false,
      fecha: String(form.fecha || today()), // yyyy-MM-dd
      hora: String(form.hora || nowHMS()),  // HH:mm:ss
    };


    const variants = [];
    if (Number(form.empleadoOrdenId) > 0) {
      variants.push({
        ...base,
        id_empleado_orden_reparacion: Number(form.empleadoOrdenId),
      });
    }
    if (Number(form.ordenId) > 0) {
      variants.push({
        ...base,
        id_orden_reparacion: Number(form.ordenId),
      });
    }
    if (variants.length === 0) {
      setSaving(false);
      setErr(
        "Falta el identificador de la orden. Abre soporte desde una orden, o indica Orden #."
      );
      return;
    }

    try {
      let ok = false;
      for (const path of POST_PATHS) {
        for (const body of variants) {
          try {
            await api.post(path, body);
            ok = true;
            break;
          } catch (e) {
          }
        }
        if (ok) break;
      }
      if (!ok) throw new Error("No se pudo crear el reporte. Verifica los IDs requeridos por el backend.");

      setMsg("¡Reporte enviado! Te notificaremos cuando lo revisen.");
      setForm((s) => ({
        ...s,
        observaciones: "",
        fecha: today(),
        hora: nowHMS(),
      }));
    } catch (e) {
      setErr(e.message || "Error creando el reporte.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="prose max-w-none px-6 md:px-10">
      <h2>Soporte</h2>
      <p className="opacity-70 mt-3 mb-6">
        Reporta imprevistos, daños adicionales o solicita apoyo. Tu reporte será enviado para revisión.
      </p>

      <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onSubmit}>
        <div className="form-control">
          <label className="label"><span className="label-text">Tipo de reporte</span></label>
          <select
            className="select select-bordered"
            value={form.id_tipo_reporte || 0}
            onChange={(e) => upd("id_tipo_reporte", Number(e.target.value))}
            disabled={loadingTipos}
          >
            {tiposCliente.length === 0 ? (
              <option value={0}>Cargando tipos...</option>
            ) : (
              tiposCliente.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))
            )}
          </select>
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Orden #</span></label>
          <input
            type="number"
            className="input input-bordered"
            value={form.ordenId || ""}
            onChange={(e) => upd("ordenId", Number(e.target.value) || 0)}
            placeholder="Ej. 9"
          />
        </div>

        <div className="form-control md:col-span-2">
          <label className="label"><span className="label-text">Descripción</span></label>
          <textarea
            className="textarea textarea-bordered h-28"
            value={form.observaciones}
            onChange={(e) => upd("observaciones", e.target.value)}
            placeholder="Cuéntanos qué ocurrió…"
            required
          />
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Fecha</span></label>
          <input
            type="date"
            className="input input-bordered"
            value={form.fecha || ""}
            onChange={(e) => upd("fecha", e.target.value)}
            required
          />
        </div>

        <div className="form-control">
          <label className="label"><span className="label-text">Hora</span></label>
          <input
            type="time"
            step="1"
            className="input input-bordered"
            value={form.hora || ""}
            onChange={(e) => upd("hora", e.target.value)}
            required
          />
        </div>

        <div className="md:col-span-2 flex justify-end gap-2 mt-2">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Enviando..." : "Enviar reporte"}
          </button>
        </div>
      </form>

      {msg && <p className="text-success mt-4">{msg}</p>}
      {err && <p className="text-error mt-4">{err}</p>}
    </section>
  );
}
