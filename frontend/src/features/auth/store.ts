import type { User } from "./types";

const AUTH_USER_KEY = "infratrack_user";
const AUTH_EVENT_NAME = "infratrack-auth-changed";
type AuthSnapshot = {
  user: User | null;
  accessToken: string | null;
};

let lastSnapshot: AuthSnapshot = {
  user: null,
  accessToken: null,
};

function readSnapshot(): AuthSnapshot {
  return {
    user: getStoredUser(),
    accessToken: localStorage.getItem("access_token"),
  };
}

function emitAuthChange() {
  window.dispatchEvent(new Event(AUTH_EVENT_NAME));
}

export function setStoredUser(user: User | null) {
  const existingRawUser = localStorage.getItem(AUTH_USER_KEY);
  const nextRawUser = user ? JSON.stringify(user) : null;

  if (!user) {
    if (!existingRawUser) {
      return;
    }
    localStorage.removeItem(AUTH_USER_KEY);
    emitAuthChange();
    return;
  }

  if (existingRawUser === nextRawUser) {
    return;
  }

  localStorage.setItem(AUTH_USER_KEY, nextRawUser ?? "");
  emitAuthChange();
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
  const previousSnapshot = readSnapshot();
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem(AUTH_USER_KEY);
  const hadAuthData = !!previousSnapshot.accessToken || !!previousSnapshot.user;
  if (!hadAuthData) {
    return;
  }
  emitAuthChange();
}

export function getAuthSnapshot() {
  const nextSnapshot = readSnapshot();
  const sameUser = JSON.stringify(lastSnapshot.user) === JSON.stringify(nextSnapshot.user);
  const sameAccessToken = lastSnapshot.accessToken === nextSnapshot.accessToken;

  if (sameUser && sameAccessToken) {
    return lastSnapshot;
  }

  lastSnapshot = nextSnapshot;
  return lastSnapshot;
}

export function subscribeToAuthStore(onChange: () => void) {
  const handleChange = () => onChange();
  window.addEventListener("storage", handleChange);
  window.addEventListener(AUTH_EVENT_NAME, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(AUTH_EVENT_NAME, handleChange);
  };
}
