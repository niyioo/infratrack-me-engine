import { Navigate } from "react-router-dom";
import { useAuth } from "./hooks";

type Props = {
  allow: string[];
  children: React.ReactNode;
};

export function RoleGuard({ allow, children }: Props) {
  const { roles } = useAuth();
  const allowed = allow.some((role) => roles.includes(role));
  return allowed ? <>{children}</> : <Navigate to="/dashboard" replace />;
}