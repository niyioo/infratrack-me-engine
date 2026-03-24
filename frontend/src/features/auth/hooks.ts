import { getStoredUser } from "./store";

export function useAuth() {
  const user = getStoredUser();
  const roles = user?.roles?.map((role) => role.code) ?? [];

  return {
    user,
    roles,
    isAuthenticated: !!localStorage.getItem("access_token")
  };
}