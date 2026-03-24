import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ProjectMetricSnapshot } from "./types";

export async function fetchProjectMetricSnapshots(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<ProjectMetricSnapshot[]>(endpoints.projectMetricSnapshots, { params });
  return data;
}