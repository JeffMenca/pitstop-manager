import { Navigate } from "react-router-dom";
import useAuth from "./useAuth";

export default function ProtectedRoute({ allow = [], children, redirectTo = "/login" }) {
  const auth = useAuth();

  // Block if user is not logged in
  if (!auth) return <Navigate to={redirectTo} replace />;

  // Normalize role name to lowercase
  const role = (auth.roleName || "").toLowerCase();

  // Check if role is in the allow list
  const isAllowed = allow.some(r => role.includes(r));

  // If allowed → render children, else redirect
  return isAllowed ? children : <Navigate to="/home" replace />;
}
