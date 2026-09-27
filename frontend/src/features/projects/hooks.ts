import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createProject,
  deleteProject,
  dispatchReportingReminder,
  fetchProject,
  fetchProjectAssignments,
  fetchProjects,
  updateProject
} from "./api";

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

export function useProjectAssignments(projectId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["project-assignments", projectId],
    queryFn: () => fetchProjectAssignments(projectId),
    enabled: !!projectId && (options?.enabled ?? true)
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

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, payload }: { projectId: number | string; payload: Parameters<typeof updateProject>[1] }) =>
      updateProject(projectId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", String(variables.projectId)] });
    }
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: number | string) => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    }
  });
}

export function useDispatchReportingReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => dispatchReportingReminder(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
    }
  });
}
