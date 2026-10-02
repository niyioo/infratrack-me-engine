import { Navigate } from "react-router-dom";
import { useAuth } from "./hooks";

type Props = {
  allow: string[];
  children: React.ReactNode;
};

export function RoleGuard({ allow, children }: Props) {
  const { capabilities } = useAuth();
  const allowed = allow.some((capability) => capabilities.includes(capability));
  return allowed ? <>{children}</> : <Navigate to="/dashboard" replace />;
}
