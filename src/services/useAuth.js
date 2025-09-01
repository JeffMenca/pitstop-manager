import { useEffect, useState } from "react";
import { getSessionAuth } from "./authService";

export default function useAuth() {
  const [auth, setAuth] = useState(() => getSessionAuth());

  useEffect(() => {
    // Listen for custom auth events
    const onAuthChanged = () => setAuth(getSessionAuth());
    window.addEventListener("auth:changed", onAuthChanged);

    // Refresh every 30s to detect expiration
    const i = setInterval(() => setAuth(getSessionAuth()), 1000 * 30);

    return () => {
      window.removeEventListener("auth:changed", onAuthChanged);
      clearInterval(i);
    };
  }, []);

  return auth; // { id, username, roleName, ... } | null
}
