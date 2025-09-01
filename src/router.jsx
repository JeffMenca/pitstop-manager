import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Recovery from "./pages/Recovery";
import TwoFactor from "./pages/TwoFactor";
import VerifyEmail from "./pages/VerifyEmail";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/login" /> },
      { path: "login", element: <Login /> },
      { path: "home", element: <Home /> },
      { path: "about", element: <About /> },
      { path: "*", element: <NotFound /> },
      { path: "recovery", element: <Recovery /> },
      { path: "two-factor", element: <TwoFactor /> },
      { path: "verify-email", element: <VerifyEmail /> },
    ],
  },
]);

export default router;
