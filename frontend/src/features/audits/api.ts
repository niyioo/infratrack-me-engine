import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeListResponse } from "@/lib/api/pagination";
import type { AuditEvent, SuspiciousActivity } from "./types";

export async function fetchAuditEvents(params?: Record<string, string | number>) {
  const { data } = await apiClient.get(endpoints.auditEvents, { params });
  return normalizeListResponse<AuditEvent>(data);
}

export async function fetchSuspiciousActivities(params?: Record<string, string | number>) {
  const { data } = await apiClient.get(endpoints.suspiciousActivities, { params });
  return normalizeListResponse<SuspiciousActivity>(data);
}
