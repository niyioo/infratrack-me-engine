import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";
import type { DashboardSummary } from "./types";

export async function fetchDashboardSummary() {
  const { data } = await apiClient.get<DashboardSummary>(
    `${endpoints.projectMetricSnapshots}dashboard-summary/`
  );
  return data;
}
