import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Recovery from "./pages/Recovery";
import TwoFactor from "./pages/TwoFactor";
import VerifyEmail from "./pages/VerifyEmail";

// Role-based modules
import AdminHome from "./pages/admin/AdminHome";
import ClientHome from "./pages/client/ClientHome";
import EmployeeHome from "./pages/employee/EmployeeHome";
import SupplierHome from "./pages/supplier/SupplierHome";

import ProtectedRoute from "./services/ProtectedRoute";

//Admin components
import GestionUsuarios from "./pages/admin/GestionUsuarios";
import AdminLayout from "./pages/admin/AdminLayout";
import GestionVehiculos from "./pages/admin/GestionVehiculos";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/login" /> },
      { path: "login", element: <Login /> },
      { path: "home", element: <Home /> },
      { path: "about", element: <About /> },
      { path: "recovery", element: <Recovery /> },
      { path: "two-factor", element: <TwoFactor /> },
      { path: "verify-email", element: <VerifyEmail /> },

      // Protected routes by role
      {
        path: "admin",
        element: (
          <ProtectedRoute allow={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <AdminHome /> },
          { path: "usuarios", element: <GestionUsuarios /> },
          { path: "vehiculos", element: <GestionVehiculos /> },
        ],
      },
      {
        path: "cliente",
        element: (
          <ProtectedRoute allow={["client", "cliente"]}>
            <ClientHome />
          </ProtectedRoute>
        ),
      },
      {
        path: "empleado",
        element: (
          <ProtectedRoute allow={["emple"]}>
            <EmployeeHome />
          </ProtectedRoute>
        ),
      },
      {
        path: "proveedor",
        element: (
          <ProtectedRoute allow={["prove"]}>
            <SupplierHome />
          </ProtectedRoute>
        ),
      },

      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;
