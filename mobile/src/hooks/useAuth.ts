import { useStoredUser } from "@/features/auth/hooks";

export function useAuth() {
  const { data: user, isLoading } = useStoredUser();

  return {
    user: user ?? null,
    roles: user?.roles?.map((r) => r.code) ?? [],
    isAuthenticated: !!user,
    isLoading
  };
}