import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveGeoFenceException,
  fetchEvidenceSubmissions,
  fetchGeoFenceExceptions,
  rejectGeoFenceException
} from "./api";

export function useEvidenceSubmissions(
  params?: Record<string, string | number>,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["evidence-submissions", params],
    queryFn: () => fetchEvidenceSubmissions(params),
    enabled: options?.enabled ?? true
  });
}

export function useGeoFenceExceptions(
  params?: Record<string, string | number>,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["geofence-exceptions", params],
    queryFn: () => fetchGeoFenceExceptions(params),
    enabled: options?.enabled ?? true
  });
}

export function useApproveGeoFenceException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exceptionId, payload }: { exceptionId: number; payload: { decision_note?: string } }) =>
      approveGeoFenceException(exceptionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofence-exceptions"] });
      queryClient.invalidateQueries({ queryKey: ["evidence-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });
}

export function useRejectGeoFenceException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exceptionId, payload }: { exceptionId: number; payload: { decision_note?: string } }) =>
      rejectGeoFenceException(exceptionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofence-exceptions"] });
      queryClient.invalidateQueries({ queryKey: ["evidence-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });
}
