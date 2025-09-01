import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";

// Admin roles list
const ROLES = [
  { id: 1, label: "Administrador", key: "admin" },
  { id: 2, label: "Cliente", key: "cliente" },
  { id: 3, label: "Empleado", key: "empleado" },
  { id: 4, label: "Proveedor", key: "proveedor" },
];

function roleIdToLabel(id) {
  return ROLES.find((r) => r.id === Number(id))?.label ?? `Rol ${id}`;
}

export default function GestionUsuarios() {
  // UI state
  const [tab, setTab] = useState("cliente");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // Create/Edit modal state
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // Derived role filter for the active tab
  const activeRoleId = useMemo(() => {
    const r = ROLES.find((r) => r.key === tab);
    return r?.id ?? null;
  }, [tab]);

  // --- Normalize API user to a consistent shape for the UI ---
  function normalizeUser(u) {
    const rolId =
      typeof u?.rol === "number"
        ? u.rol
        : typeof u?.rol?.id === "number"
        ? u.rol.id
        : null;

    return {
      id: u.id,
      nombre: u.nombre ?? "",
      apellido: u.apellido ?? "",
      username: u.username ?? "",
      email: u.email ?? "",
      telefono: u.telefono ?? "",
      rolId: rolId,
      raw: u,
    };
  }

  //Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      let data;
      try {
        data = await api.get("/usuario");
      } catch (e1) {
        console.warn("[GestionUsuarios] /usuario failed, trying /usuarios", e1);
        data = await api.get("/usuarios");
      }

      const list = Array.isArray(data) ? data : [];
      const normalized = list.map(normalizeUser);

      // Role filter + text search
      const filtered = normalized.filter((u) => {
        const matchesRole =
          !activeRoleId || Number(u.rolId) === Number(activeRoleId);
        const matchesQ =
          !q ||
          [u.nombre, u.apellido, u.username, u.email, u.telefono]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q.toLowerCase()));
        return matchesRole && matchesQ;
      });

      if (filtered.length === 0) {
        console.info("[GestionUsuarios] No rows after filter", {
          activeRoleId,
          q,
          sample: normalized.slice(0, 3),
        });
      }

      setRows(filtered);
    } catch (e) {
      setErr(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }, [activeRoleId, q]);

  // Load users on mount and when filters change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handlers
  function openCreate() {
    // Prepare empty user for creation
    setEditing({
      id: null,
      nombre: "",
      apellido: "",
      username: "",
      password: "",
      email: "",
      telefono: "",
      rol: activeRoleId ?? 2,
      correo_verificado: true,
      verificacion_activa: true,
    });
    setOpenModal(true);
  }

  function openEdit(user) {
    // Map normalized shape back to form fields
    setEditing({
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      username: user.username,
      password: "",
      email: user.email,
      telefono: user.telefono,
      rol: Number(user.rolId ?? 0),
      correo_verificado: Boolean(user.raw?.correo_verificado ?? true),
      verificacion_activa: Boolean(user.raw?.verificacion_activa ?? true),
    });
    setOpenModal(true);
  }

  async function onDelete(id) {
    if (!confirm("¿Eliminar este usuario?")) return;
    try {
      await api.del(`/usuario/${id}`);
      await fetchUsers();
    } catch (e) {
      alert(e.message || "No se pudo eliminar");
    }
  }

  return (
    <section className="prose max-w-none px-10">
      <h2>Registro y gestión</h2>
      <p className="opacity-70">
        Administra clientes, empleados, proveedores y administradores.
      </p>

      {/* Tabs for role selection */}
      <div role="tablist" className="tabs tabs-bordered my-4">
        {ROLES.map((r) => (
          <button
            key={r.key}
            role="tab"
            className={`tab ${tab === r.key ? "tab-active" : ""}`}
            onClick={() => setTab(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="join mr-10">
          <input
            className="input input-bordered join-item min-w-[280px]"
            placeholder="Buscar (nombre, usuario, email, teléfono)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn join-item" onClick={() => setQ("")}>
            Limpiar
          </button>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          Nuevo {tab}
        </button>
        <button className="btn btn-ghost" onClick={fetchUsers}>
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
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Rol</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <span className="loading loading-spinner loading-sm"></span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6}>Sin registros.</td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.nombre} {u.apellido}
                  </td>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>{u.telefono || "-"}</td>
                  <td>
                    <span className="badge">{roleIdToLabel(u.rolId)}</span>
                  </td>
                  <td className="text-right">
                    <div className="join">
                      <button
                        className="btn btn-ghost btn-sm join-item"
                        onClick={() => openEdit(u)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-ghost btn-sm text-error join-item"
                        onClick={() => onDelete(u.id)}
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

      {/* Modal for create/edit */}
      {openModal && (
        <UserModal
          initial={editing}
          onClose={() => setOpenModal(false)}
          onSaved={async () => {
            setOpenModal(false);
            await fetchUsers();
          }}
        />
      )}
    </section>
  );
}

/* --------------------- User Modal (Create/Edit) --------------------- */
function UserModal({ initial, onClose, onSaved }) {
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
        const diffs = diffUser(initial, form);
        for (const [col, value] of Object.entries(diffs)) {
          if (col === "password" && !value) continue; // avoid empty password overwrite
          await api.put(`/usuario/${initial.id}`, { columnName: col, value });
        }
      } else {
        // Create mode: POST /usuario with full body
        const body = {
          nombre: form.nombre,
          apellido: form.apellido,
          username: form.username,
          password: form.password,
          rol: Number(form.rol),
          email: form.email,
          telefono: form.telefono,
          correo_verificado: Boolean(form.correo_verificado),
          verificacion_activa: Boolean(form.verificacion_activa),
        };
        await api.post("/usuario", body);
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
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">
          {isEdit ? "Editar usuario" : "Nuevo usuario"}
        </h3>

        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
          onSubmit={onSubmit}
        >
          {/* Name */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Nombre</span>
            </label>
            <input
              className="input input-bordered"
              value={form.nombre}
              onChange={(e) => upd("nombre", e.target.value)}
              required
            />
          </div>

          {/* Lastname */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Apellido</span>
            </label>
            <input
              className="input input-bordered"
              value={form.apellido}
              onChange={(e) => upd("apellido", e.target.value)}
              required
            />
          </div>

          {/* Username */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Usuario</span>
            </label>
            <input
              className="input input-bordered"
              value={form.username}
              onChange={(e) => upd("username", e.target.value)}
              required
            />
          </div>

          {/* Email */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              type="email"
              className="input input-bordered"
              value={form.email}
              onChange={(e) => upd("email", e.target.value)}
              required
            />
          </div>

          {/* Phone */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Teléfono</span>
            </label>
            <input
              className="input input-bordered"
              value={form.telefono}
              onChange={(e) => upd("telefono", e.target.value)}
            />
          </div>

          {/* Role */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Rol</span>
            </label>
            <select
              className="select select-bordered"
              value={form.rol}
              onChange={(e) => upd("rol", Number(e.target.value))}
              required
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Password (only for create, optional for edit) */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">
                Contraseña {isEdit ? "(opcional si no cambia)" : ""}
              </span>
            </label>
            <input
              type="password"
              className="input input-bordered"
              value={form.password}
              onChange={(e) => upd("password", e.target.value)}
              required={!isEdit}
            />
          </div>

          {/* Flags */}
          <div className="flex flex-col justify-end items-start gap-4">
            <div className="form-control w-full">
              <label className="label cursor-pointer flex justify-between">
                <span className="label-text">Correo verificado</span>
                <input
                  type="checkbox"
                  className="toggle"
                  checked={!!form.correo_verificado}
                  onChange={(e) => upd("correo_verificado", e.target.checked)}
                />
              </label>
            </div>
            <div className="form-control w-full">
              <label className="label cursor-pointer flex justify-between">
                <span className="label-text">Verificación activa</span>
                <input
                  type="checkbox"
                  className="toggle"
                  checked={!!form.verificacion_activa}
                  onChange={(e) => upd("verificacion_activa", e.target.checked)}
                />
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="md:col-span-2 flex justify-end gap-2 mt-10">
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

/* --------------------- small helpers --------------------- */
// Compute shallow diffs between initial user and new form state (maps UI keys to PUT columns)
function diffUser(initial, next) {
  const map = {
    nombre: "nombre",
    apellido: "apellido",
    username: "username",
    password: "password",
    email: "email",
    telefono: "telefono",
    rol: "rol",
    correo_verificado: "correo_verificado",
    verificacion_activa: "verificacion_activa",
  };

  const diffs = {};
  Object.keys(map).forEach((uiKey) => {
    const col = map[uiKey];

    // Normalize role comparison
    const initialVal =
      uiKey === "rol"
        ? Number(initial?.rol ?? initial?.rolId ?? initial?.rol?.id ?? 0)
        : initial?.[uiKey];

    const nextVal = uiKey === "rol" ? Number(next?.rol ?? 0) : next?.[uiKey];

    if (String(initialVal ?? "") !== String(nextVal ?? "")) {
      diffs[col] = nextVal;
    }
  });
  return diffs;
}
