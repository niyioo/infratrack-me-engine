import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createProject, fetchProject, fetchProjectAssignments, fetchProjects } from "./api";

export function useProjects(params?: Record<string, string>) {
  return useQuery({
    queryKey: ["projects", params],
    queryFn: () => fetchProjects(params)
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject(projectId),
    enabled: !!projectId
  });
}

export function useProjectAssignments(projectId: string) {
  return useQuery({
    queryKey: ["project-assignments", projectId],
    queryFn: () => fetchProjectAssignments(projectId),
    enabled: !!projectId
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  });
}