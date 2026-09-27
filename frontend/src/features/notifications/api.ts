import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeListResponse } from "@/lib/api/pagination";
import type { Notification } from "./types";

export async function fetchNotifications(params?: Record<string, string | number>) {
  const { data } = await apiClient.get(endpoints.notifications, { params });
  return normalizeListResponse<Notification>(data);
}

export async function fetchUnreadNotificationCount() {
  const { data } = await apiClient.get<{ count: number }>(`${endpoints.notifications}unread-count/`);
  return data;
}

export async function markNotificationRead(notificationId: number) {
  const { data } = await apiClient.post<Notification>(`${endpoints.notifications}${notificationId}/mark-read/`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await apiClient.post<{ updated: number }>(`${endpoints.notifications}mark-all-read/`);
  return data;
}
