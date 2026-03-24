import { useQuery } from "@tanstack/react-query";
import { fetchMilestones } from "./api";

export function useMilestones(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ["milestones", params],
    queryFn: () => fetchMilestones(params)
  });
}