import * as SecureStore from "expo-secure-store";
import type { User } from "./types";
import { queryClient } from "@/lib/queryClient";

const ACCESS_TOKEN_KEY = "civitness_access_token";
const REFRESH_TOKEN_KEY = "civitness_refresh_token";
const USER_KEY = "civitness_user";

// Keys used before the app was renamed: moved across on first read so an update
// doesn't sign everyone out.
const LEGACY_KEYS: Record<string, string> = {
  [ACCESS_TOKEN_KEY]: "infratrack_access_token",
  [REFRESH_TOKEN_KEY]: "infratrack_refresh_token",
  [USER_KEY]: "infratrack_user",
};

async function readKey(key: string) {
  const value = await SecureStore.getItemAsync(key);
  if (value != null) return value;
  const legacyKey = LEGACY_KEYS[key];
  const legacy = legacyKey ? await SecureStore.getItemAsync(legacyKey) : null;
  if (legacy != null) {
    await SecureStore.setItemAsync(key, legacy);
    await SecureStore.deleteItemAsync(legacyKey);
  }
  return legacy;
}

export async function setTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
}

export async function getAccessToken() {
  return readKey(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return readKey(REFRESH_TOKEN_KEY);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  for (const legacyKey of Object.values(LEGACY_KEYS)) await SecureStore.deleteItemAsync(legacyKey);
  // Drop cached API data too, or the next person to sign in on this device briefly
  // sees the previous account's projects before they refetch.
  queryClient.clear();
}

export async function setStoredUser(user: User | null) {
  if (!user) {
    await SecureStore.deleteItemAsync(USER_KEY);
    return;
  }
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser(): Promise<User | null> {
  const raw = await readKey(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}
