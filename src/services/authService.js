import { API_BASE_URL, TOKEN_KEY } from "../config.js";

export const setToken = (t) => t && sessionStorage.setItem(TOKEN_KEY, t);
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

// --- Auth stage flags ---
const AUTH_STAGE_KEY = "pitstop_auth_stage"; // 'full' | 'pending_email' | 'pending_mfa' | null
export const setAuthStage = (stage) => {
  sessionStorage.setItem(AUTH_STAGE_KEY, stage);
  window.dispatchEvent(new Event("auth:changed")); // notify app
};
export const getAuthStage = () => sessionStorage.getItem(AUTH_STAGE_KEY);
export const isFullyAuthenticated = () => getAuthStage() === "full";
export const clearAuth = () => {
  clearToken();
  sessionStorage.removeItem(AUTH_STAGE_KEY);
  window.dispatchEvent(new Event("auth:changed"));
};

// Read token from headers (Authorization or X-Auth-Token)
export function getHeaderTokenFrom(resp) {
  const h = resp.headers;
  const raw =
    h.get("authorization") ||
    h.get("Authorization") ||
    h.get("x-auth-token") ||
    h.get("X-Auth-Token");
  if (!raw) return null;
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : raw;
}

// Decode base64url safely
function b64urlDecode(str) {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  return atob(s);
}

// Read JWT payload claims
export function readJwtClaims() {
  const t = getToken();
  if (!t) return null;
  const parts = t.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = b64urlDecode(parts[1]);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Get user id from token (payload uses `id`)
export function getUserIdFromToken() {
  const c = readJwtClaims();
  return c?.id ?? c?.userId ?? c?.usuarioId ?? c?.sub ?? null;
}

// Minimal auth fetch
async function authFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const resp = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  const newToken = getHeaderTokenFrom(resp);
  if (newToken) setToken(newToken);

  return resp;
}

export const login = (username, password) =>
  authFetch("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const verifyEmail = (code) =>
  authFetch("/login/verificar", {
    method: "POST",
    body: JSON.stringify({ code }),
  });


export const twoFactor = (code) => {
  const usuarioId = getUserIdFromToken(); // read `id` from JWT payload
  return authFetch("/login/autenticacion", {
    method: "POST",
    body: JSON.stringify({
      usuarioId: String(usuarioId ?? ""), // server expects string
      codigo: String(code),
    }),
  });
};


// --- Role and session helpers (read from JWT) ---
export function getRoleNameFromToken() {
  const c = readJwtClaims();
  return c?.rol?.rol || null; // e.g. "Administrador" | "Cliente" | "Empleado" | "Proveedor"
}

export function isTokenExpired() {
  const c = readJwtClaims();
  if (!c?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return c.exp < now;
}

// Normalized session snapshot for UI
export function getSessionAuth() {
  const token = getToken();
  if (!token) return null;
  if (isTokenExpired()) {
    clearAuth(); // clear token if expired
    return null;
  }
  const claims = readJwtClaims();
  if (!claims) return null;
  return {
    id: claims?.id ?? null,
    username: claims?.username ?? null,
    roleName: getRoleNameFromToken(), // "Administrador" | "Cliente" | "Empleado" | "Proveedor"
    exp: claims?.exp ?? null,
  };
}
