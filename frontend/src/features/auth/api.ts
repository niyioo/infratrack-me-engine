import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { LoginResponse, User } from "./types";

export async function login(payload: { email: string; password: string }) {
  const { data } = await apiClient.post<LoginResponse>(endpoints.auth.login, payload);
  return data;
}

export async function fetchCurrentUser() {
  const { data } = await apiClient.get<User>(endpoints.auth.me);
  return data;
}
