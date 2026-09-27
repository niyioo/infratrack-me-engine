import { useQuery } from "@tanstack/react-query";
import { fetchPortfolioBreakdown, fetchPortfolioTrends, fetchProjectMetricSnapshots } from "./api";

export function useProjectMetricSnapshots(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ["project-metric-snapshots", params],
    queryFn: () => fetchProjectMetricSnapshots(params)
  });
}

export function usePortfolioBreakdown() {
  return useQuery({
    queryKey: ["portfolio-breakdown"],
    queryFn: fetchPortfolioBreakdown
  });
}

export function usePortfolioTrends(days = 30) {
  return useQuery({
    queryKey: ["portfolio-trends", days],
    queryFn: () => fetchPortfolioTrends(days)
  });
}
