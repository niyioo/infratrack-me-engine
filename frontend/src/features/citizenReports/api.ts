import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { CitizenReport, CitizenReportTriagePayload } from "./types";

export async function fetchCitizenReports(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<CitizenReport[]>(endpoints.citizenReports, { params });
  return data;
}

export async function triageCitizenReport(reportId: number, payload: CitizenReportTriagePayload) {
  const { data } = await apiClient.post<CitizenReport>(`${endpoints.citizenReports}${reportId}/triage/`, payload);
  return data;
}
