import { useAuth } from "@/features/auth/hooks";

export function useRoleAccess(requiredCapabilities: string[]) {
  const { capabilities } = useAuth();
  return requiredCapabilities.some((capability) => capabilities.includes(capability));
}
