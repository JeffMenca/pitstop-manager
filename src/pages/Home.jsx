import { useNavigate } from "react-router-dom";
import useAuth from "../services/useAuth";
import AdminHome from "./admin/AdminHome";
import ClientHome from "./client/ClientHome";
import EmployeeHome from "./employee/EmployeeHome";
import SupplierHome from "./supplier/SupplierHome";

function normalizeRole(roleName = "") {
  // Normalize role to a simple key
  const r = roleName.trim().toLowerCase();
  if (r.includes("admin")) return "admin";
  if (r.includes("client") || r.includes("cliente")) return "client";
  if (r.includes("emple")) return "employee";
  if (r.includes("prove")) return "supplier";
  return "unknown";
}

export default function Home() {
  const auth = useAuth();
  const navigate = useNavigate();

  function handleLogin() {
    navigate("/login", { replace: true });
  }

  if (!auth) {
    // Not logged in
    return (
      <div className="hero min-h-[60vh]">
        <div className="hero-content text-center flex flex-col">
          <img
            src="/pitstop-logo.png"
            alt="PitStop Logo"
            className="w-64 mb-4"
          />
          <h1 className="text-5xl font-bold">Bienvenido a PistopManager</h1>
          <p className="py-6">Para continuar debe iniciar sesion.</p>
          <button className="btn btn-primary" onClick={handleLogin}>
            Iniciar sesion
          </button>
        </div>
      </div>
    );
  }

  const roleKey = normalizeRole(auth.roleName);

  return (
    <section className="prose max-w-none p-6 px-10">
      <h2 className="text-4xl font-bold">Bienvenido {auth.username} !</h2>
      <p>Rol: {auth.roleName}</p>

      {roleKey === "admin" && <AdminHome />}
      {roleKey === "client" && <ClientHome />}
      {roleKey === "employee" && <EmployeeHome />}
      {roleKey === "supplier" && <SupplierHome />}

      {roleKey === "unknown" && (
        <div className="p-4 border rounded">
          Role <b>{auth.roleName}</b> is not recognized.
        </div>
      )}
    </section>
  );
}
