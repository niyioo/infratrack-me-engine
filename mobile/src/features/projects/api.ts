import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";
import type { Project } from "./types";

export async function fetchProjects(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<Project[]>(endpoints.projects, { params });
  return data;
}

export async function fetchProject(projectId: number | string) {
  // This cleanly removes any accidental trailing slash from the endpoint before adding the ID!
  const cleanEndpoint = endpoints.projects.replace(/\/$/, "");
  
  const { data } = await apiClient.get<Project>(`${cleanEndpoint}/${projectId}/`);
  return data;
}