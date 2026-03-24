import { useAuth } from "@/features/auth/hooks";

export function useRoleAccess(requiredRoles: string[]) {
  const { roles } = useAuth();
  return requiredRoles.some((role) => roles.includes(role));
}