import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./hooks";

export function AuthGuard() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}