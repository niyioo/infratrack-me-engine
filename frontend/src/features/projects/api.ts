import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeListResponse } from "@/lib/api/pagination";
import type { CreateProjectPayload, Project, ProjectAssignment } from "./types";

export async function fetchProjects(params?: Record<string, string>) {
  const { data } = await apiClient.get(endpoints.projects, { params });
  return normalizeListResponse<Project>(data);
}

export async function fetchProject(projectId: string) {
  const { data } = await apiClient.get<Project>(`${endpoints.projects}${projectId}/`);
  return data;
}

export async function fetchProjectAssignments(projectId: string) {
  const { data } = await apiClient.get<ProjectAssignment[]>(
    `${endpoints.projects}${projectId}/assignments/`
  );
  return data;
}

export async function createProject(payload: CreateProjectPayload) {
  const { data } = await apiClient.post<Project>(endpoints.projects, payload);
  return data;
}

export async function updateProject(projectId: number | string, payload: Partial<CreateProjectPayload>) {
  const { data } = await apiClient.patch<Project>(`${endpoints.projects}${projectId}/`, payload);
  return data;
}

export async function deleteProject(projectId: number | string) {
  await apiClient.delete(`${endpoints.projects}${projectId}/`);
}

export async function dispatchReportingReminder(projectId: string) {
  const { data } = await apiClient.post<{ detail: string; notifications_created: number }>(
    `${endpoints.projects}${projectId}/dispatch-reporting-reminder/`
  );
  return data;
}
