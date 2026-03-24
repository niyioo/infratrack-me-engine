import { useQuery } from "@tanstack/react-query";
import { fetchDashboardKpis } from "./api";

export function useDashboardKpis() {
  return useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: fetchDashboardKpis
  });
}