import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { AuditEvent, SuspiciousActivity } from "./types";

export async function fetchAuditEvents(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<AuditEvent[]>(endpoints.auditEvents, { params });
  return data;
}

export async function fetchSuspiciousActivities(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<SuspiciousActivity[]>(endpoints.suspiciousActivities, { params });
  return data;
}