import { useQuery } from "@tanstack/react-query";
import { fetchProjectMetricSnapshots } from "./api";

export function useProjectMetricSnapshots(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ["project-metric-snapshots", params],
    queryFn: () => fetchProjectMetricSnapshots(params)
  });
}