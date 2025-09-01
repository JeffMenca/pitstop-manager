// src/pages/supplier/SupplierPedidos.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../services/api";

const PATHS = {
  pedidos: ["/pedido"],
  estados: ["/estadopedido", "/estadoPedido", "/estadoordenreparacion"],
  pedidoDetalle: ["/pedidodetalle", "/pedidoDetalle"],
  proveedorRepuesto: ["/proveedorrepuesto", "/proveedorRepuesto"],
  repuesto: ["/repuesto"],
  aceptarPedido: [
    "/api/pedido/aprovedPedido",
    "/pedido/aprovedPedido",
    "/api/pedido/idPedido",
    "/pedido/idPedido",
  ],
};

function estadoBadge(id) {
  const n = Number(id);
  if (n === 1) return "badge badge-warning";
  if (n === 2) return "badge badge-error";
  if (n === 3) return "badge badge-success";
  if (n === 4) return "badge badge-info";
  if (n === 5) return "badge badge-info";
  if (n === 6) return "badge badge-success";
  if (n === 7) return "badge badge-success";
  return "badge";
}

function estadoTexto(id) {
  const n = Number(id);
  if (n === 1) return "Pendiente";
  if (n === 2) return "Rechazado";
  if (n === 3) return "Confirmado";
  if (n === 4) return "En curso";
  if (n === 5) return "En tránsito";
  if (n === 6) return "Entregado";
  if (n === 7) return "Aprobado"; 
  return `Estado ${n}`;
}

async function tryGet(paths) {
  for (const p of paths) {
    try {
      return { ok: true, data: await api.get(p), path: p };
    } catch {}
  }
  return { ok: false, data: [], path: null };
}
async function tryPost(paths, body) {
  for (const p of paths) {
    try {
      return { ok: true, data: await api.post(p, body), path: p };
    } catch {}
  }
  return { ok: false, data: null, path: null };
}

async function tryAcceptPedido(id) {
  for (const base of PATHS.aceptarPedido) {
    const url = `${base}/${id}`;
    try {
      await api.post(url, {});
      return true;
    } catch {}
    try {
      await api.put(url, {});
      return true;
    } catch {}
    try {
      await api.get(url);
      return true;
    } catch {}
  }
  return false;
}

export default function SupplierPedidos() {
  const [sp] = useSearchParams();
  const focusId = Number(sp.get("focus") || 0);

  const [rows, setRows] = useState([]);
  const [estados, setEstados] = useState([]);
  const [provRep, setProvRep] = useState([]);
  const [repuestos, setRepuestos] = useState([]);

  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);

  const [acceptModal, setAcceptModal] = useState(null);
  const [delayModal, setDelayModal] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [p, e, pr, rep] = await Promise.all([
        tryGet(PATHS.pedidos),
        tryGet(PATHS.estados),
        tryGet(PATHS.proveedorRepuesto),
        tryGet(PATHS.repuesto),
      ]);
      setRows(Array.isArray(p.data) ? p.data : []);
      setEstados(Array.isArray(e.data) ? e.data : []);
      setProvRep(Array.isArray(pr.data) ? pr.data : []);
      setRepuestos(Array.isArray(rep.data) ? rep.data : []);
      if (!p.ok) setErr("No pude obtener pedidos (ajusta PATHS.pedidos).");
    } catch (ex) {
      setErr(ex.message || "Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const findAny = useCallback(
    (tokens) => {
      const toks = tokens.map((t) => t.toLowerCase());
      const it = estados.find((s) => {
        const label = String(
          s.estado ?? s.nombre ?? s.descripcion ?? ""
        ).toLowerCase();
        return toks.some((t) => label.includes(t));
      });
      return Number(it?.id || 0);
    },
    [estados]
  );

  const ids = useMemo(
    () => ({
      pendiente: findAny(["pend"]),
      rechazado: findAny(["rech"]),
      aprobado: findAny(["aprob", "conf"]),
      enCurso: findAny(["curso", "envio", "envío"]),
      enTransito: findAny(["transit", "transito", "tránsito"]) || 5,
      completado: findAny(["complet", "entreg"]) || 6,
      retrasado: findAny(["retras", "delay"]) || 0,
    }),
    [findAny]
  );

  const repMap = useMemo(() => {
    const m = new Map();
    repuestos.forEach((r) => m.set(Number(r.id), r));
    return m;
  }, [repuestos]);
  function labelProvRepuesto(pr) {
    const rid = Number(pr.id_repuesto ?? pr.repuesto_id);
    const rep = repMap.get(rid);
    const name = rep?.repuesto ?? rep?.nombre ?? `Repuesto #${rid}`;
    const precio = pr.precio ?? pr.precio_unitario ?? pr.precioUnitario;
    return `${name} — $${Number(precio || 0).toFixed(2)} (PR#${pr.id})`;
  }

  async function setEstado(pedido, estadoId) {
    try {
      await api.put(`${PATHS.pedidos[0]}/${pedido.id}`, {
        columnName: "estado",
        value: String(estadoId),
      });
      await fetchAll();
    } catch (e) {
      setFlash({
        type: "error",
        msg: e.message || "No se pudo actualizar el estado.",
      });
    }
  }

  async function confirmarAceptar() {
    if (!acceptModal) return;
    const { pedido, provRepId, cantidad } = acceptModal;
    if (!provRepId || !cantidad) {
      setFlash({ type: "error", msg: "Selecciona repuesto y cantidad." });
      return;
    }
    try {
      const bodyDetalle = {
        id_pedido: Number(pedido.id),
        id_proveedor_repuesto: Number(provRepId),
        estado: 3,
        cantidad_solicitada: Number(cantidad),
      };
      const det = await tryPost(PATHS.pedidoDetalle, bodyDetalle);
      if (!det.ok) {
        setFlash({ type: "error", msg: "No pude crear el detalle de pedido." });
        return;
      }

      const ok = await tryAcceptPedido(pedido.id);
      if (!ok) {
        await setEstado(pedido, ids.enTransito);
      } else {
        await fetchAll();
      }

      setAcceptModal(null);
      setFlash({
        type: "success",
        msg: "Pedido aceptado y movido a En tránsito.",
      });
    } catch (e) {
      setFlash({ type: "error", msg: e.message || "Error al aceptar pedido." });
    }
  }

  async function confirmarRetraso() {
    if (!delayModal) return;
    const { pedido, motivo } = delayModal;
    try {
      if (ids.retrasado) {
        await setEstado(pedido, ids.retrasado);
      } else {
        await api
          .put(`${PATHS.pedidos[0]}/${pedido.id}`, {
            columnName: "nota_proveedor",
            value: motivo || "Retraso",
          })
          .catch(() => {});
        await fetchAll();
      }
      setDelayModal(null);
      setFlash({ type: "success", msg: "Retraso notificado." });
    } catch (e) {
      setFlash({
        type: "error",
        msg: e.message || "No se pudo notificar el retraso.",
      });
    }
  }

  return (
    <section className="prose max-w-none px-6 md:px-10">
      <h2>Pedidos</h2>

      {flash && (
        <div
          className={`alert ${
            flash.type === "error" ? "alert-error" : "alert-success"
          } mb-4`}
        >
          <span>{flash.msg}</span>
          <button className="btn btn-sm ml-auto" onClick={() => setFlash(null)}>
            Cerrar
          </button>
        </div>
      )}
      {err && <p className="text-error">{err}</p>}
      {loading && <span className="loading loading-spinner loading-sm" />}

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Total</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>Sin pedidos.</td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr
                  key={p.id}
                  className={focusId === Number(p.id) ? "bg-base-200" : ""}
                >
                  <td>#{p.id}</td>
                  <td>{p.fecha ?? p.fecha_creacion ?? ""}</td>
                  <td>
                    <span className={estadoBadge(p.estado)}>
                      {estadoTexto(p.estado)}
                    </span>
                  </td>
                  <td>
                    {p.total != null ? `$${Number(p.total).toFixed(2)}` : "—"}
                  </td>
                  <td className="text-right">
                    <div className="join">
                      <button
                        className="btn btn-sm btn-success join-item"
                        onClick={() =>
                          setAcceptModal({
                            pedido: p,
                            provRepId: 0,
                            cantidad: 1,
                          })
                        }
                        title="Aceptar (crea detalle y pasa a En tránsito)"
                      >
                        Aceptar
                      </button>
                      <button
                        className="btn btn-sm btn-outline join-item"
                        onClick={() => setEstado(p, ids.rechazado)}
                        title="Rechazar"
                      >
                        Rechazar
                      </button>
                      <button
                        className="btn btn-sm join-item"
                        onClick={() => setEstado(p, ids.enCurso)}
                        title="Confirmar envío"
                      >
                        Envío
                      </button>
                      <button
                        className="btn btn-sm join-item"
                        onClick={() => setEstado(p, ids.completado)}
                        title="Confirmar entrega"
                      >
                        Entregado
                      </button>
                      <button
                        className="btn btn-sm btn-ghost join-item"
                        onClick={() => setDelayModal({ pedido: p, motivo: "" })}
                        title="Notificar retraso"
                      >
                        Retraso
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {acceptModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg">
              Aceptar pedido #{acceptModal.pedido.id}
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <div>
                <label className="label">
                  <span className="label-text">Proveedor-Repuesto</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={acceptModal.provRepId || 0}
                  onChange={(e) =>
                    setAcceptModal((m) => ({
                      ...m,
                      provRepId: Number(e.target.value),
                    }))
                  }
                >
                  <option value={0} disabled>
                    Seleccione…
                  </option>
                  {provRep.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {labelProvRepuesto(pr)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Cantidad</span>
                </label>
                <input
                  type="number"
                  min={1}
                  className="input input-bordered w-full"
                  value={acceptModal.cantidad}
                  onChange={(e) =>
                    setAcceptModal((m) => ({
                      ...m,
                      cantidad: Number(e.target.value) || 1,
                    }))
                  }
                />
              </div>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setAcceptModal(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={confirmarAceptar}>
                Confirmar
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setAcceptModal(null)}
          />
        </div>
      )}

      {delayModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg">
              Notificar retraso del pedido #{delayModal.pedido.id}
            </h3>
            <div className="mt-4">
              <label className="label">
                <span className="label-text">Motivo (opcional)</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full h-28"
                value={delayModal.motivo}
                onChange={(e) =>
                  setDelayModal((m) => ({ ...m, motivo: e.target.value }))
                }
              />
            </div>
            <div className="modal-action">
              <button className="btn" onClick={() => setDelayModal(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={confirmarRetraso}>
                Notificar
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDelayModal(null)} />
        </div>
      )}
    </section>
  );
}
