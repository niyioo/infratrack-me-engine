import type { Role } from "@/features/auth/types";
import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeListResponse } from "@/lib/api/pagination";
import type { CreateUserPayload, DirectoryUser, UpdateUserPayload, UserListFilters } from "./types";

export async function fetchUsers(params?: UserListFilters) {
  const { data } = await apiClient.get(endpoints.users, { params });
  return normalizeListResponse<DirectoryUser>(data);
}

export async function fetchRoles() {
  const { data } = await apiClient.get<Role[]>(endpoints.roles);
  return data;
}

export async function createUser(payload: CreateUserPayload) {
  const { data } = await apiClient.post<DirectoryUser>(endpoints.users, payload);
  return data;
}

export async function updateUser(userId: number, payload: UpdateUserPayload) {
  const { data } = await apiClient.patch<DirectoryUser>(`${endpoints.users}${userId}/`, payload);
  return data;
}

export async function deleteUser(userId: number) {
  await apiClient.delete(`${endpoints.users}${userId}/`);
}
