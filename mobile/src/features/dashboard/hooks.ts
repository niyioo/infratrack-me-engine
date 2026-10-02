import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "./api";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["mobile-dashboard-summary"],
    queryFn: fetchDashboardSummary,
  });
}
