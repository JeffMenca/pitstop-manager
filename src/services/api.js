// Generic authenticated HTTP helpers for the whole app
import { API_BASE_URL } from "../config";
import {
  getToken,
  clearAuth,
  getHeaderTokenFrom,
  setToken,
} from "./authService";

async function apiFetch(path, options = {}) {
  // 1) Build URL
  const url = `${API_BASE_URL}${path}`;

  // 2) Build headers with Authorization
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  // Auto set Content-Type when sending a JSON string body
  if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Inject token if available
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // 3) Do the request
  const resp = await fetch(url, { ...options, headers });

  // 4) Rotate token if server sends a fresh one in headers
  const newToken = getHeaderTokenFrom(resp);
  if (newToken) setToken(newToken);

  // 5) Handle 401 globally
  if (resp.status === 401) {
    // Clear session and notify the app
    clearAuth();
    throw new Error("Unauthorized");
  }

  // 6) Throw other non-2xx with server message if JSON
  if (!resp.ok) {
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        const data = await resp.json();
        throw new Error(data?.message || `HTTP ${resp.status}`);
      } catch {
        throw new Error(`HTTP ${resp.status}`);
      }
    } else {
      const text = await resp.text().catch(() => "");
      throw new Error(text || `HTTP ${resp.status}`);
    }
  }

  // 7) Return JSON if available
  const ct = resp.headers.get("content-type") || "";
  return ct.includes("application/json") ? resp.json() : undefined;
}

// Public, simple helpers
export const api = {
  get: (p) => apiFetch(p),
  post: (p, data) => apiFetch(p, { method: "POST", body: JSON.stringify(data) }),
  put: (p, data) => apiFetch(p, { method: "PUT", body: JSON.stringify(data) }),
  patch: (p, data) => apiFetch(p, { method: "PATCH", body: JSON.stringify(data) }),
  del: (p) => apiFetch(p, { method: "DELETE" }),
};
