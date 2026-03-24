import axios from "axios";
import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";
import type { LoginResponse, User } from "./types";

export async function login(payload: { email: string; password: string }) {
  const { data } = await axios.post<LoginResponse>(endpoints.auth.login, payload);
  return data;
}

export async function fetchUsers() {
  const { data } = await apiClient.get<User[]>(endpoints.users);
  return data;
}

export async function fetchCurrentUserByEmail(email: string) {
  const users = await fetchUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}