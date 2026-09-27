import * as SecureStore from "expo-secure-store";
import type { User } from "./types";

const ACCESS_TOKEN_KEY = "infratrack_access_token";
const REFRESH_TOKEN_KEY = "infratrack_refresh_token";
const USER_KEY = "infratrack_user";

export async function setTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function setStoredUser(user: User | null) {
  if (!user) {
    await SecureStore.deleteItemAsync(USER_KEY);
    return;
  }
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}
