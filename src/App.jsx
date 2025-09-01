import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import { isFullyAuthenticated } from "./services/authService";

export default function App() {
  const [showNav, setShowNav] = useState(isFullyAuthenticated());

  useEffect(() => {
    // Update when auth state changes (login/verify/2FA/logout)
    const update = () => setShowNav(isFullyAuthenticated());
    window.addEventListener("auth:changed", update);
    window.addEventListener("storage", update); // cross-tab
    return () => {
      window.removeEventListener("auth:changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <div className="bg-base-200 min-h-screen">
      {showNav && <Navbar />}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
