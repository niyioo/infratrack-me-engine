import { useQuery } from "@tanstack/react-query";
import { fetchAuditEvents, fetchSuspiciousActivities } from "./api";

export function useAuditEvents(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ["audit-events", params],
    queryFn: () => fetchAuditEvents(params)
  });
}

export function useSuspiciousActivities(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ["suspicious-activities", params],
    queryFn: () => fetchSuspiciousActivities(params)
  });
}