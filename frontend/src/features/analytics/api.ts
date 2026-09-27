import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { PortfolioMetricSnapshot, ProjectMetricSnapshot } from "./types";

export async function fetchProjectMetricSnapshots(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<ProjectMetricSnapshot[]>(endpoints.projectMetricSnapshots, { params });
  return data;
}

export async function fetchPortfolioBreakdown() {
  const { data } = await apiClient.get<PortfolioMetricSnapshot[]>(
    `${endpoints.projectMetricSnapshots}portfolio-breakdown/`
  );
  return data;
}

export async function fetchPortfolioTrends(days = 30) {
  const { data } = await apiClient.get<PortfolioMetricSnapshot[]>(
    `${endpoints.projectMetricSnapshots}portfolio-trends/`,
    { params: { days } }
  );
  return data;
}
