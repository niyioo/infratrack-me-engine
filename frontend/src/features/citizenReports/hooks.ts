import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCitizenReports, triageCitizenReport } from "./api";
import type { CitizenReportTriagePayload } from "./types";

export function useCitizenReports(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ["citizen-reports", params],
    queryFn: () => fetchCitizenReports(params),
  });
}

export function useTriageCitizenReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, payload }: { reportId: number; payload: CitizenReportTriagePayload }) =>
      triageCitizenReport(reportId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["citizen-reports"] });
      // Escalation creates a fraud flag, which changes tranche eligibility and dashboards.
      queryClient.invalidateQueries({ queryKey: ["fraud-flags"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
