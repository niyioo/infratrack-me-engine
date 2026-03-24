import { useQuery } from "@tanstack/react-query";
import { fetchProject, fetchProjects } from "./api";

export function useProjects(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ["mobile-projects", params],
    queryFn: () => fetchProjects(params)
  });
}

export function useProject(projectId: number | string) {
  return useQuery({
    queryKey: ["mobile-project", projectId],
    queryFn: () => fetchProject(projectId),
    enabled: !!projectId
  });
}