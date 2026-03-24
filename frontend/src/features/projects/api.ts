import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { Project, ProjectAssignment } from "./types";

export async function fetchProjects(params?: Record<string, string>) {
  const { data } = await apiClient.get<Project[]>(endpoints.projects, { params });
  return data;
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

export async function createProject(payload: Record<string, unknown>) {
  const { data } = await apiClient.post<Project>(endpoints.projects, payload);
  return data;
}