import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";
import type { ProjectMilestone } from "./types";

export async function fetchMilestones(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<ProjectMilestone[]>(endpoints.milestones, { params });
  return data;
}