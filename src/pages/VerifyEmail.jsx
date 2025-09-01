// src/pages/VerifyEmail.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { verifyEmail, getToken } from "../services/authService";

export default function VerifyEmail() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Guard: must have a token received from /login 301 flow
  useEffect(() => {
    // If there is no token, user should go back to login
    if (!getToken()) navigate("/login", { replace: true });
  }, [navigate]);

  // Helper: read a JSON message from the server if present
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
      const resp = await verifyEmail(code);

      // 200 → email verified, go to app
      if (resp.status === 200) {
        navigate("/home", { replace: true });
        return;
      }

      // Friendly mapping for common errors
      let friendly;
      switch (resp.status) {
        case 400:
        case 401:
        case 404:
          friendly = "Invalid or expired code.";
          break;
        case 429:
          friendly = "Too many attempts. Please try again later.";
          break;
        case 500:
          friendly = "Server error. Please try again later.";
          break;
        default:
          friendly = `Unexpected error (${resp.status}).`;
      }

      const serverMsg = await readServerMessage(resp);
      setError(serverMsg || friendly);
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
          <h2 className="card-title">Aun debes verificar tu correo</h2>
          <p className="text-sm opacity-80">
            Ingresa el código de verificación que te enviamos por correo.
          </p>

          {/* Optional: notice forwarded from /login */}
          {location.state?.msg && (
            <div className="alert alert-info mt-3">{location.state.msg}</div>
          )}

          <form className="mt-4 space-y-4" onSubmit={onSubmit} noValidate>
            <input
              type="text"
              placeholder="Codigo de verificación"
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
              {loading ? "Verificando..." : "Verificar"}
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
