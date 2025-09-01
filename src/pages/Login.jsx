import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  login,
  setToken,
  getHeaderTokenFrom,
  setAuthStage,
} from "../services/authService";
import { isFullyAuthenticated } from "../services/authService";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // If already fully authenticated, do not allow staying on /login
    if (isFullyAuthenticated()) {
      navigate("/home", { replace: true });
    }

    // Listen for auth state changes (e.g., after verify/2FA completes)
    const onAuth = () => {
      if (isFullyAuthenticated()) navigate("/home", { replace: true });
    };

    window.addEventListener("auth:changed", onAuth);
    window.addEventListener("storage", onAuth); // cross-tab logout/login

    return () => {
      window.removeEventListener("auth:changed", onAuth);
      window.removeEventListener("storage", onAuth);
    };
  }, [navigate]);

  // Read server JSON error if present
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
      const resp = await login(username, password);

      // Always store header token if present
      const headerToken = getHeaderTokenFrom(resp);
      if (headerToken) setToken(headerToken);

      // 200 → fully authenticated
      if (resp.status === 200) {
        try {
          const data = await resp.clone().json();
          if (data?.token) setToken(data.token);
        } catch {}
        setAuthStage("full");
        navigate("/home");
        return;
      }

      // 301 → pending email verification
      if (resp.status === 301) {
        setAuthStage("pending_email");
        navigate("/verify-email");
        return;
      }

      // 302 → pending 2FA
      if (resp.status === 302) {
        setAuthStage("pending_mfa");
        navigate("/two-factor");
        return;
      }

      let friendly;
      switch (resp.status) {
        case 400:
        case 401:
        case 404:
          friendly = "Invalid username or password.";
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
    <section className="w-full">
      <div className="flex flex-row min-h-screen">
        <div className="bg-pitstop-red w-3/5 relative">
          <img
            src="/login-banner.png"
            alt="PitStop Background"
            className="w-[1200px] max-w-[2000px] absolute top-1/5 right-1/4"
          />
        </div>

        <div className="flex flex-col justify-center items-center w-2/5 p-8">
          <img
            src="/pitstop-logo.png"
            alt="PitStop Logo"
            className="w-64 mb-4"
          />

          <form className="space-y-4 w-2/3" onSubmit={onSubmit} noValidate>
            <div className="form-control">
              <label className="label mb-2">
                <span className="label-text">Usuario</span>
              </label>
              <input
                type="text"
                placeholder="Ingresa tu usuario"
                className="input input-bordered w-full"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-control mb-2">
              <label className="label mb-2">
                <span className="label-text">Contraseña</span>
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="input input-bordered w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="text-error text-sm" role="alert" aria-live="polite">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn w-full bg-pitstop-red border-pitstop-red mt-4"
              disabled={loading}
            >
              {loading ? "Iniciando sesion..." : "Iniciar sesion"}
            </button>

            <NavLink to="/recovery" className="text-pitstop-red text-xs">
            ¿Se te olvidó tu contraseña?
            </NavLink>
          </form>
        </div>
      </div>
    </section>
  );
}
