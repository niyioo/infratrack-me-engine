import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { EvidenceSubmission } from "./types";

export async function fetchEvidenceSubmissions(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<EvidenceSubmission[]>(endpoints.evidenceSubmissions, { params });
  return data;
}