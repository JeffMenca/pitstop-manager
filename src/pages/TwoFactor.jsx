// src/pages/TwoFactor.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { twoFactor, getToken, setAuthStage } from "../services/authService";

export default function TwoFactor() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Guard: require a token from the previous /login 302 step
    if (!getToken()) navigate("/login", { replace: true });
  }, [navigate]);

  // Helper: try to read server message if it's JSON
  async function readServerMessage(resp) {
    const ctype = resp.headers.get("content-type") || "";
    if (ctype.includes("application/json")) {
      try {
        const data = await resp.json();
        return data?.message || null;
      } catch {}
    }
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const resp = await twoFactor(code);

      // 200 → verification passed: mark session as full and go home
      if (resp.status === 200) {
        setAuthStage("full");
        navigate("/home", { replace: true });
        return;
      }

      // Friendly error mapping based on your Swagger
      let friendly;
      switch (resp.status) {
        case 400:
        case 401:
        case 404:
          friendly = "Codigo invalido o expirado.";
          break;
        case 500:
          friendly = "Internal error while verifying the code.";
          break;
        default:
          friendly = `Unexpected error (${resp.status}).`;
      }

      const serverMsg = await readServerMessage(resp);
      setError(resp.status === 400 ? friendly : serverMsg || friendly);
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full min-h-screen flex items-center justify-center p-8">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <img
            src="/side-car.png"
            alt="Sidecar"
            className="w-[700px] my-10 transform scale-x-[-1]"
          />
          <h2 className="card-title">Verificación en dos pasos</h2>
          <p className="text-sm opacity-80">
            Se ha enviado un código de verificación a tu correo.
          </p>

          {location.state?.msg && (
            <div className="alert alert-info mt-3">{location.state.msg}</div>
          )}

          <form className="mt-4 space-y-4" onSubmit={onSubmit} noValidate>
            <input
              type="text"
              placeholder="Código de verificación"
              className="input input-bordered w-full tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              inputMode="numeric"
            />

            {error && (
              <p className="text-error text-sm" role="alert" aria-live="polite">
                {error}
              </p>
            )}

            <button className="btn btn-primary w-full" disabled={loading}>
              {loading ? "Validando..." : "Validar"}
            </button>
          </form>

          <div className="mt-3 text-right flex justify-between items-center">
            <button
              className="btn btn-link btn-sm p-0 text-pitstop-dark"
              onClick={() => navigate(-1)}
            >
              Reenviar código
            </button>
            <NavLink className="text-xs text-pitstop-red" to="/login">
              Regresar a iniciar sesión
            </NavLink>
          </div>
        </div>
      </div>
    </section>
  );
}
