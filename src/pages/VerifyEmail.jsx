// src/pages/VerifyEmail.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { getToken, setAuthStage } from "../services/authService";
import { api } from "../services/api";

function decodeJwt(token) {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

export default function VerifyEmail() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) navigate("/login", { replace: true });
  }, [navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = getToken();
      const payload = decodeJwt(token || "");
      const usuarioId =
        Number(
          payload?.usuarioId ??
            payload?.userId ??
            payload?.id ??
            payload?.uid ??
            payload?.sub ??
            0
        ) || 0;

      if (!usuarioId) {
        setError("Sesión inválida. Inicia sesión de nuevo.");
        setLoading(false);
        return;
      }

      const body = { usuarioId, codigo: String(code || "").trim() };
      const resp = await api.post("/api/login/verificar", body).catch(() =>
        api.post("/login/verificar", body)
      );

      if (resp?.success) {
        setAuthStage("full");
        navigate("/home", { replace: true });
      } else {
        setError(resp?.mensaje || resp?.message || "Código inválido o vencido.");
      }
    } catch (e) {
      setError(e.message || "No se pudo verificar el código.");
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
          <h2 className="card-title">Aún debes verificar tu correo</h2>
          <p className="text-sm opacity-80">
            Ingresa el código de verificación que te enviamos por correo.
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
