// src/pages/client/ClientOrderDetail.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../services/api";

/* utils */
const today = () => new Date().toISOString().slice(0, 10);
const nowHMS = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const fmt = (n) =>
  isFinite(Number(n))
    ? Number(n).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : n;

/* mapeos helpers para aprobar/rechazar */
function findIdByLabel(states, includes) {
  const inc = includes.toLowerCase();
  for (const s of states) {
    const label = String(
      s.label || s.estado || s.descripcion || ""
    ).toLowerCase();
    if (label.includes(inc)) return Number(s.id);
  }
  return 0;
}

export default function ClientOrderDetail() {
  const { id } = useParams();
  const ordenId = Number(id);

  const [orden, setOrden] = useState(null);
  const [estadosOrden, setEstadosOrden] = useState([]);
  const [estadosTrabajo, setEstadosTrabajo] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  /* Chat usuario (comentarios) */
  const [chat, setChat] = useState([]); // mensajes filtrados por orden
  const [comentario, setComentario] = useState("");

  /* Calificación (igual que antes) */
  const [calif, setCalif] = useState(5);
  const [tiposReporte, setTiposReporte] = useState([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [o, eo, et, srv, allLines, chatAll, tipos] = await Promise.all([
        api.get(`/ordenreparacion/${ordenId}`),
        api.get("/estadoordenreparacion"),
        api.get("/estadotrabajo"),
        api.get("/servicio"),
        api.get("/servicioordenreparacion"),
        api.get("/chatusuario").catch(() => []),
        api.get("/tiporeporte").catch(() => []), // solo para calificación
      ]);

      setOrden(o);

      setEstadosOrden(
        (Array.isArray(eo) ? eo : []).map((n) => ({
          id: Number(n.id ?? n.ID ?? 0),
          label: String(
            n.estado ?? n.nombre ?? n.descripcion ?? `Estado ${n.id}`
          ),
        }))
      );

      setEstadosTrabajo(
        (Array.isArray(et) ? et : []).map((n) => ({
          id: Number(n.id ?? n.ID ?? 0),
          label: String(
            n.estado ?? n.nombre ?? n.descripcion ?? `Estado ${n.id}`
          ),
        }))
      );

      const listSrv = Array.isArray(srv) ? srv : [];
      setCatalogo(
        listSrv.map((s) => ({
          id: Number(s.id),
          nombre: String(s.servicio ?? s.nombre ?? ""),
          precio: Number(s.precio ?? 0),
        }))
      );

      const lines = (Array.isArray(allLines) ? allLines : []).filter(
        (l) =>
          Number(l.id_orden_reparacion ?? l.id_orden ?? l.idOrden) === ordenId
      );
      setLineas(lines);

      const chatFiltrado = (Array.isArray(chatAll) ? chatAll : []).filter(
        (m) =>
          Number(m.id_orden_reparacion ?? m.orden_id ?? m.idOrden) === ordenId
      );
      // Orden simple por id asc si no hay fecha
      chatFiltrado.sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0));
      setChat(chatFiltrado);

      setTiposReporte(Array.isArray(tipos) ? tipos : []);
    } catch (e) {
      setErr(e.message || "No se pudo cargar la orden.");
    } finally {
      setLoading(false);
    }
  }, [ordenId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // “tiempo real”: repite cada 10s
  useEffect(() => {
    const t = setInterval(fetchAll, 10000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const estadosTrabajoIds = useMemo(
    () => ({
      aprobado: findIdByLabel(estadosTrabajo, "aprob"),
      rechazado: findIdByLabel(estadosTrabajo, "rechaz"),
      pendiente: findIdByLabel(estadosTrabajo, "pend"),
    }),
    [estadosTrabajo]
  );

  const mapCatalogo = useMemo(() => {
    const m = new Map();
    catalogo.forEach((s) => m.set(s.id, s));
    return m;
  }, [catalogo]);

  const totalSugerido = useMemo(
    () =>
      lineas.reduce(
        (acc, l) => acc + (mapCatalogo.get(Number(l.id_servicio))?.precio ?? 0),
        0
      ),
    [lineas, mapCatalogo]
  );

  async function updateLineaEstado(linea, newEstadoId) {
    try {
      await api.put(`/servicioordenreparacion/${linea.id}`, {
        columnName: "id_estado_trabajo",
        value: String(newEstadoId),
      });
      await fetchAll();
    } catch (e) {
      alert(e.message || "No se pudo actualizar el estado del servicio.");
    }
  }

  /* === Enviar mensaje por /chatusuario === */
  async function enviarComentario() {
    const mensaje = comentario.trim();
    if (!mensaje) return;
    try {
      await api.post("/chatusuario", {
        id_orden_reparacion: ordenId,
        mensaje,
        visto: false,
      });
      setComentario("");
      // refrescar chat
      const chatAll = await api.get("/chatusuario").catch(() => []);
      const chatFiltrado = (Array.isArray(chatAll) ? chatAll : []).filter(
        (m) =>
          Number(m.id_orden_reparacion ?? m.orden_id ?? m.idOrden) === ordenId
      );
      chatFiltrado.sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0));
      setChat(chatFiltrado);
    } catch (e) {
      alert(e.message || "No se pudo enviar el mensaje.");
    }
  }

  /* === Calificación (sigue usando tiporeporte) === */
  async function enviarCalificacion() {
    try {
      const t =
        tiposReporte.find((t) =>
          String(t.tipo_reporte ?? t.nombre ?? "")
            .toLowerCase()
            .includes("calific")
        ) ||
        tiposReporte.find((t) =>
          String(t.tipo_reporte ?? t.nombre ?? "")
            .toLowerCase()
            .includes("satisf")
        ) ||
        tiposReporte[0];

      const body = {
        id_orden_reparacion: ordenId,
        id_tipo_reporte: Number(t?.id ?? 1),
        observaciones: `CALIFICACION: ${calif}/5`,
        solucionado: true,
        fecha: today(),
        hora: nowHMS(),
      };
      await api
        .post("api/reporte", body)
        .catch(() => api.post("/reporte", body));
      alert("¡Gracias por calificar!");
    } catch (e) {
      alert(e.message || "No se pudo registrar la calificación.");
    }
  }

  return (
    <section className="prose max-w-none px-6 md:px-10">
      <h2 className="mb-4">Orden #{ordenId}</h2>
      {err && <p className="text-error">{err}</p>}
      {loading && <span className="loading loading-spinner loading-sm"></span>}

      {orden && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <InfoCard
              title="Estado"
              value={String(
                estadosOrden.find((e) => Number(e.id) === Number(orden.estado))
                  ?.label || `Estado ${orden.estado}`
              )}
              hint="Actualiza automáticamente cada 10 s"
            />
            <InfoCard
              title="Ingreso"
              value={`${orden.fecha_ingreso} ${orden.hora_ingreso}`}
            />
            <InfoCard
              title="Subtotal sugerido"
              value={`$${fmt(totalSugerido)}`}
            />
          </div>

          {/* Servicios */}
          <h4 className="mt-0">Servicios de la orden</h4>
          <div className="overflow-x-auto mb-6">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Servicio</th>
                  <th>Estado</th>
                  <th>Precio</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lineas.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Aún no hay servicios listados.</td>
                  </tr>
                ) : (
                  lineas.map((l) => {
                    const s = mapCatalogo.get(Number(l.id_servicio));
                    const labelEstado =
                      estadosTrabajo.find(
                        (e) => Number(e.id) === Number(l.id_estado_trabajo)
                      )?.label || `Estado ${l.id_estado_trabajo}`;
                    const puedeAprobar =
                      estadosTrabajoIds.aprobado && estadosTrabajoIds.rechazado;
                    return (
                      <tr key={l.id}>
                        <td>#{l.id}</td>
                        <td>{s?.nombre || `Servicio #${l.id_servicio}`}</td>
                        <td>{labelEstado}</td>
                        <td>${fmt(s?.precio ?? 0)}</td>
                        <td className="text-right">
                          {puedeAprobar ? (
                            <div className="join">
                              <button
                                className="btn btn-sm btn-success join-item"
                                onClick={() =>
                                  updateLineaEstado(
                                    l,
                                    estadosTrabajoIds.aprobado
                                  )
                                }
                                title="Autorizar servicio"
                              >
                                Autorizar
                              </button>
                              <button
                                className="btn btn-sm btn-outline join-item"
                                onClick={() =>
                                  updateLineaEstado(
                                    l,
                                    estadosTrabajoIds.rechazado
                                  )
                                }
                                title="Rechazar servicio"
                              >
                                Rechazar
                              </button>
                            </div>
                          ) : (
                            <span className="opacity-60">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <h4 className="mb-4">Seguimiento / Mensajes</h4>
          <div className="border rounded-lg p-3 mb-3 max-w-2xl bg-base-100">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {chat.length === 0 ? (
                <p className="opacity-60 m-0">Aún no hay mensajes.</p>
              ) : (
                chat.map((m) => (
                  <div key={m.id} className="flex items-start gap-2">
                    <span className="badge badge-ghost">#{m.id}</span>
                    <div>
                      <p className="m-0">{String(m.mensaje ?? "")}</p>
                      {"visto" in m && (
                        <small className="opacity-60">
                          {m.visto ? "Visto" : "No visto"}
                        </small>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 mt-3">
              <input
                className="input input-bordered w-full"
                placeholder="Escribe un mensaje para el taller…"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              />
              <button className="btn btn-primary" onClick={enviarComentario}>
                Enviar
              </button>
            </div>
          </div>

        </>
      )}
    </section>
  );
}

function InfoCard({ title, value, hint }) {
  return (
    <div className="card bg-base-100 border shadow-sm">
      <div className="card-body py-4">
        <p className="m-0 text-sm opacity-60">{title}</p>
        <h3 className="m-0">{value}</h3>
        {hint && <p className="m-0 text-xs opacity-60">{hint}</p>}
      </div>
    </div>
  );
}
