import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";

// --- Roles for filtering clients from /usuario ---
const ROLE_CLIENTE_ID = 2;

// --- Normalize server vehicle to a consistent shape ---
function normalizeVehicle(v) {
  const idCliente =
    typeof v?.id_cliente === "number"
      ? v.id_cliente
      : typeof v?.cliente?.id === "number"
      ? v.cliente.id
      : null;

  return {
    id: v.id,
    id_cliente: idCliente,
    marca: v.marca ?? "",
    modelo: v.modelo ?? "",
    placas: v.placas ?? "",
    raw: v,
  };
}

// --- Badge style for estado id (basic heuristic) ---
function estadoBadgeClass(id) {
  switch (Number(id)) {
    case 1:
      return "badge badge-warning"; // Pendiente
    case 2:
      return "badge badge-error"; // Cancelado
    case 3:
      return "badge badge-success"; // Aprobado
    case 4:
      return "badge badge-info"; // En curso
    case 5:
      return "badge badge-success"; // Completado
    default:
      return "badge badge-ghost";
  }
}

export default function GestionVehiculos() {
  // Filters/UI state
  const [q, setQ] = useState("");
  const [clienteId, setClienteId] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Clients
  const [clientes, setClientes] = useState([]);
  const clientesMap = useMemo(() => {
    const m = new Map();
    clientes.forEach((c) =>
      m.set(Number(c.id), `${c.nombre || ""} ${c.apellido || ""}`.trim())
    );
    return m;
  }, [clientes]);

  // Modal state
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // Orders modal state
  const [openOrders, setOpenOrders] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersErr, setOrdersErr] = useState(null);
  const [ordersVehiculo, setOrdersVehiculo] = useState(null);
  const [estadoCache, setEstadoCache] = useState(() => new Map()); // id -> label

  // --- Load clients (role = Cliente) ---
  const fetchClientes = useCallback(async () => {
    try {
      const data = await api.get("/usuario");
      const list = Array.isArray(data) ? data : [];
      const onlyClients = list
        .filter((u) => {
          const rid =
            typeof u?.rol === "number"
              ? u.rol
              : typeof u?.rol?.id === "number"
              ? u.rol.id
              : null;
          return Number(rid) === ROLE_CLIENTE_ID;
        })
        .map((u) => ({
          id: u.id,
          nombre: u.nombre ?? "",
          apellido: u.apellido ?? "",
        }));
      setClientes(onlyClients);
    } catch (e) {
      console.warn("[Vehiculos] Cannot load clients:", e);
    }
  }, []);

  // --- Load vehicles (all or by client) ---
  const fetchVehiculos = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      let data;
      if (Number(clienteId) > 0) {
        data = await api.get(`/vehiculo/idUser/${clienteId}`);
      } else {
        data = await api.get("/vehiculo");
      }
      const list = Array.isArray(data) ? data : [];
      const normalized = list.map(normalizeVehicle);

      // Text search on placas/marca/modelo and client display name
      const filtered = normalized.filter((v) => {
        if (!q) return true;
        const texto = `${v.placas} ${v.marca} ${v.modelo} ${
          clientesMap.get(Number(v.id_cliente)) || ""
        }`
          .trim()
          .toLowerCase();
        return texto.includes(q.toLowerCase());
      });

      setRows(filtered);
    } catch (e) {
      setErr(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }, [clienteId, q, clientesMap]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  useEffect(() => {
    fetchVehiculos();
  }, [fetchVehiculos]);

  // --- Handlers ---
  function openCreate() {
    setEditing({
      id: null,
      id_cliente: Number(clienteId) || 0,
      marca: "",
      modelo: "",
      placas: "",
    });
    setOpenModal(true);
  }

  function openEdit(v) {
    setEditing({
      id: v.id,
      id_cliente: Number(v.id_cliente) || 0,
      marca: v.marca,
      modelo: v.modelo,
      placas: v.placas,
    });
    setOpenModal(true);
  }

  function onDeleteRequest(vehiculo) {
    setConfirmDelete(vehiculo);
  }

  async function confirmDeleteVehiculo() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.del(`/vehiculo/${confirmDelete.id}`);
      await fetchVehiculos();
    } catch (e) {
      alert(e.message || "No se pudo eliminar");
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  // --- Show Orders modal for a vehicle ---
  async function showOrdersForVehicle(v) {
    setOrdersVehiculo(v);
    setOpenOrders(true);
    setOrders([]);
    setOrdersErr(null);
    setOrdersLoading(true);

    try {
      const data = await api.get(`/ordenreparacion/idVehiculo/${v.id}`);
      const list = Array.isArray(data) ? data : [];

      let map = estadoCache;
      if (!map || map.size === 0) {
        try {
          const estados = await api.get("/estadoordenreparacion");
          const m = new Map();
          (Array.isArray(estados) ? estados : []).forEach((e) => {
            const id = Number(e.id ?? e.ID ?? e.codigo ?? e.estado_id ?? 0);
            const label = String(
              e.estado ?? e.nombre ?? e.descripcion ?? `Estado ${id}`
            );
            m.set(id, label);
          });
          setEstadoCache(m);
          map = m;
        } catch {
          map = estadoCache;
        }
      }

      // 3) Adjuntar label al resultado
      const withLabels = list.map((o) => ({
        ...o,
        estadoLabel: map.get(Number(o.estado)) || `Estado ${o.estado}`,
      }));
      setOrders(withLabels);
    } catch (e) {
      setOrdersErr(e.message || "No se pudieron cargar las órdenes");
    } finally {
      setOrdersLoading(false);
    }
  }

  return (
    <section className="prose max-w-none px-10">
      <h2>Vehículos</h2>
      <p className="opacity-70 mb-10">
        Visualiza vehículos registrados, su cliente y gestiona
        marca/modelo/placas.
      </p>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="join mr-10">
          <input
            className="input input-bordered join-item min-w-[280px]"
            placeholder="Buscar (placas, marca, modelo, cliente)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select
          className="select select-bordered"
          value={clienteId}
          onChange={(e) => setClienteId(Number(e.target.value))}
        >
          <option value={0}>Todos los clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} {c.apellido}
            </option>
          ))}
        </select>

        <button className="btn btn-primary" onClick={openCreate}>
          Nuevo vehículo
        </button>
        <button className="btn btn-ghost" onClick={fetchVehiculos}>
          Recargar
        </button>
      </div>

      {/* Errors */}
      {err && <p className="text-error">{err}</p>}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Placas</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Cliente</th>
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
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5}>Sin registros.</td>
              </tr>
            ) : (
              rows.map((v) => (
                <tr key={v.id}>
                  <td>{v.placas}</td>
                  <td>{v.marca}</td>
                  <td>{v.modelo}</td>
                  <td>{clientesMap.get(Number(v.id_cliente)) || "-"}</td>
                  <td className="text-right">
                    <div className="join">
                      <button
                        className="btn btn-outline btn-sm join-item"
                        onClick={() => showOrdersForVehicle(v)}
                      >
                        Ver órdenes
                      </button>
                      <button
                        className="btn btn-ghost btn-sm join-item"
                        onClick={() => openEdit(v)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-ghost btn-sm text-error join-item"
                        onClick={() => onDeleteRequest(v)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {openModal && (
        <VehiculoModal
          initial={editing}
          clientes={clientes}
          onClose={() => setOpenModal(false)}
          onSaved={async () => {
            setOpenModal(false);
            await fetchVehiculos();
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error">
              Confirmar eliminación
            </h3>
            <p className="py-4">
              ¿Seguro que deseas eliminar el vehículo{" "}
              <strong>{confirmDelete.placas}</strong> ({confirmDelete.marca}{" "}
              {confirmDelete.modelo})?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="btn"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className={`btn btn-error ${deleting ? "btn-disabled" : ""}`}
                onClick={confirmDeleteVehiculo}
                disabled={deleting}
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => !deleting && setConfirmDelete(null)}
          ></div>
        </div>
      )}

      {/* Orders Modal */}
      {openOrders && (
        <OrdersModal
          vehiculo={ordersVehiculo}
          orders={orders}
          loading={ordersLoading}
          error={ordersErr}
          close={() => setOpenOrders(false)}
          refresh={() => showOrdersForVehicle(ordersVehiculo)}
        />
      )}
    </section>
  );
}

/* --------------------- Orders Modal --------------------- */
function OrdersModal({ vehiculo, orders, loading, error, close, refresh }) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  async function crearOrden() {
    if (!vehiculo?.id || creating) return;
    setCreating(true);
    try {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const fecha = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate()
      )}`;
      const hora = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
        now.getSeconds()
      )}`;

      await api.post("/ordenreparacion", {
        id_vehiculo: Number(vehiculo.id),
        fecha_ingreso: fecha,
        hora_ingreso: hora,
      });

      await refresh?.();
    } catch (e) {
      alert(e.message || "No se pudo crear la orden");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-5xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">
            Órdenes de reparación – {vehiculo?.placas} ({vehiculo?.marca}{" "}
            {vehiculo?.modelo})
          </h3>
          <button
            className="btn btn-primary btn-sm"
            onClick={crearOrden}
            disabled={creating || loading}
            title="Crear una nueva orden para este vehículo"
          >
            {creating ? "Creando..." : "Agregar orden"}
          </button>
        </div>

        {loading ? (
          <div className="py-6">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        ) : error ? (
          <p className="text-error">{error}</p>
        ) : orders.length === 0 ? (
          <p className="py-4">Sin órdenes asociadas.</p>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ingreso</th>
                  <th>Egreso</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>
                      {o.fecha_ingreso} {o.hora_ingreso}
                    </td>
                    <td>
                      {o.fecha_egreso ? (
                        <>
                          {o.fecha_egreso} {o.hora_egreso}
                        </>
                      ) : (
                        <span className="opacity-60">—</span>
                      )}
                    </td>
                    <td>
                      <span className={estadoBadgeClass(o.estado)}>
                        {o.estadoLabel || `Estado ${o.estado}`}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() =>
                          navigate(`/admin/trabajos?vehiculoId=${vehiculo.id}`)
                        }
                      >
                        Ver en módulo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-action">
          <button className="btn" onClick={close}>
            Cerrar
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={close}></div>
    </div>
  );
}

/* --------------------- Modal create/edit --------------------- */
function VehiculoModal({ initial, clientes, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({ ...initial }));
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial?.id);

  function upd(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        // PUT /vehiculo/{id} one field at a time
        const diffs = diffVehiculo(initial, form);
        for (const [col, value] of Object.entries(diffs)) {
          await api.put(`/vehiculo/${initial.id}`, { columnName: col, value });
        }
      } else {
        // POST /vehiculo
        const body = {
          id_cliente: Number(form.id_cliente),
          marca: String(form.marca || ""),
          modelo: String(form.modelo || ""),
          placas: String(form.placas || ""),
        };
        await api.post("/vehiculo", body);
      }
      await onSaved?.();
    } catch (e) {
      alert(e.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-xl">
        <h3 className="font-bold text-lg">
          {isEdit ? "Editar vehículo" : "Nuevo vehículo"}
        </h3>

        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
          onSubmit={onSubmit}
        >
          {/* Client */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Cliente</span>
            </label>
            <select
              className="select select-bordered"
              value={form.id_cliente}
              onChange={(e) => upd("id_cliente", Number(e.target.value))}
              required
            >
              <option value={0} disabled>
                Seleccione un cliente
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido}
                </option>
              ))}
            </select>
          </div>

          {/* Marca */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Marca</span>
            </label>
            <input
              className="input input-bordered"
              value={form.marca}
              onChange={(e) => upd("marca", e.target.value)}
              required
            />
          </div>

          {/* Modelo */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Modelo</span>
            </label>
            <input
              className="input input-bordered"
              value={form.modelo}
              onChange={(e) => upd("modelo", e.target.value)}
              required
            />
          </div>

          {/* Placas */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Placas</span>
            </label>
            <input
              className="input input-bordered"
              value={form.placas}
              onChange={(e) => upd("placas", e.target.value)}
              required
            />
          </div>

          {/* Actions */}
          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}

/* --------------------- helpers --------------------- */
// Compute shallow diffs between initial and next vehicle to build PUTs
function diffVehiculo(initial, next) {
  // Backend PUT expects columnName one-by-one: id_cliente | marca | modelo | placas
  const keys = ["id_cliente", "marca", "modelo", "placas"];
  const diffs = {};
  keys.forEach((k) => {
    const a = initial?.[k];
    const b = next?.[k];
    if (String(a ?? "") !== String(b ?? "")) {
      diffs[k] = k === "id_cliente" ? Number(b) : b;
    }
  });
  return diffs;
}
