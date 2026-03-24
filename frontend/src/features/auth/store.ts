import type { User } from "./types";

const AUTH_USER_KEY = "infratrack_user";

export function setStoredUser(user: User | null) {
  if (!user) {
    localStorage.removeItem(AUTH_USER_KEY);
    return;
  }
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearAuthStorage() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem(AUTH_USER_KEY);
}