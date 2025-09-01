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
import GestionOrdenes from "./pages/admin/GestionOrdenes";
import GestionInventario from "./pages/admin/GestionInventario";
import GestionFactura from "./pages/admin/GestionFactura";
import GestionPagosProveedores from "./pages/admin/GestionPagosProveedores";

//Client components
import ClientLayout from "./pages/client/ClientLayout";
import ClientOrders from "./pages/client/ClientOrders";
import ClientOrderDetail from "./pages/client/ClientOrderDetail";
import ClientInvoices from "./pages/client/ClientInvoices";

//Employee components
import EmployeeLayout from "./pages/employee/EmployeeLayout";
import EmployeeOrdenes from "./pages/employee/EmployeeOrdenes";
import EmployeeOrdenDetalle from "./pages/employee/EmployeeOrdenDetalle";
import EmployeeFacturas from "./pages/employee/EmployeeFacturas";
import EmployeeFacturaDetalle from "./pages/employee/EmployeeFacturaDetalle";
import EmployeeSoporte from "./pages/employee/EmployeeSoporte";

//Supplier components
import SupplierLayout from "./pages/supplier/SupplierLayout";
import SupplierPedidos from "./pages/supplier/SupplierPedidos";
import SupplierCotizaciones from "./pages/supplier/SupplierCotizaciones";
import SupplierProductos from "./pages/supplier/SupplierProductos";

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
          { path: "trabajos", element: <GestionOrdenes /> },
          { path: "inventario", element: <GestionInventario /> },
          { path: "facturacion", element: <GestionFactura /> },
          { path: "pagos", element: <GestionPagosProveedores /> },
        ],
      },
      {
        path: "cliente",
        element: (
          <ProtectedRoute allow={["client", "cliente"]}>
            <ClientLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <ClientHome /> },
          { path: "ordenes", element: <ClientOrders /> },
          { path: "orden/:id", element: <ClientOrderDetail /> },
          { path: "facturas", element: <ClientInvoices /> },
        ],
      },
      {
        path: "empleado",
        element: (
          <ProtectedRoute allow={["emple"]}>
            <EmployeeLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <EmployeeHome /> },
          { path: "ordenes", element: <EmployeeOrdenes /> },
          { path: "orden/:id", element: <EmployeeOrdenDetalle /> },
          { path: "facturas", element: <EmployeeFacturas /> },
          { path: "factura/:id", element: <EmployeeFacturaDetalle /> },
          { path: "soporte", element: <EmployeeSoporte /> },
        ],
      },
      {
        path: "proveedor",
        element: (
          <ProtectedRoute allow={["prove"]}>
            <SupplierLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <SupplierHome /> },
          { path: "pedidos", element: <SupplierPedidos /> },
          { path: "cotizaciones", element: <SupplierCotizaciones /> },
          { path: "productos", element: <SupplierProductos /> },
        ],
      },

      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;
