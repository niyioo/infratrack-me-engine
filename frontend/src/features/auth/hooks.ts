import { useSyncExternalStore } from "react";
import { getAuthSnapshot, subscribeToAuthStore } from "./store";

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribeToAuthStore, getAuthSnapshot, getAuthSnapshot);
  const user = snapshot.user;
  const roles = user?.roles?.map((role) => role.code) ?? [];
  const capabilities = user?.capabilities ?? [];

  return {
    user,
    roles,
    capabilities,
    isAuthenticated: !!snapshot.accessToken && !!user
  };
}
