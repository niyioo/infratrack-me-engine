import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { EvidenceSubmission, GeoFenceExceptionRequest } from "./types";

export async function fetchEvidenceSubmissions(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<EvidenceSubmission[]>(endpoints.evidenceSubmissions, { params });
  return data;
}

export async function fetchGeoFenceExceptions(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<GeoFenceExceptionRequest[]>(endpoints.geofenceExceptions, { params });
  return data;
}

export async function approveGeoFenceException(exceptionId: number, payload: { decision_note?: string }) {
  const { data } = await apiClient.post<GeoFenceExceptionRequest>(
    `${endpoints.geofenceExceptions}${exceptionId}/approve/`,
    payload
  );
  return data;
}

export async function rejectGeoFenceException(exceptionId: number, payload: { decision_note?: string }) {
  const { data } = await apiClient.post<GeoFenceExceptionRequest>(
    `${endpoints.geofenceExceptions}${exceptionId}/reject/`,
    payload
  );
  return data;
}
