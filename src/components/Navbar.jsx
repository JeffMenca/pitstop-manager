import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { clearAuth } from "../services/authService";

export default function Navbar() {
  const [theme, setTheme] = useState("dark");
  const navigate = useNavigate();

  useEffect(() => {
    // Apply theme attribute to <html>
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function handleLogout() {
    // Clear token and auth stage, then redirect to login
    clearAuth();
    navigate("/login", { replace: true });
  }

  return (
    <div className="navbar bg-base-100 shadow">
      <div className="container mx-auto flex flex-row items-center justify-between gap-4 h-[100px] pl-10">
        <div className="flex items-center gap-4">
          <img src="/pitstop-logo.png" alt="PitStop Logo" className="w-20" />
          <ul className="menu menu-horizontal px-1">
            <li>
              <NavLink
                to="/home"
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                Inicio
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/about"
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                Acerca de
              </NavLink>
            </li>
          </ul>
        </div>

        <div className="flex items-center gap-2">
          {/* Simple theme toggle */}
          <select
            className="select select-bordered select-sm"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            title="Theme"
          >
            <option value="dark">dark</option>
            <option value="light">light</option>
          </select>

          {/* Logout button */}
          <button className="btn btn-sm" onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </div>
    </div>
  );
}
