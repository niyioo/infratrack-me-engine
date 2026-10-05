import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createQaReview, fetchFraudFlags, fetchQaReviews, resolveFraudFlag } from "./api";
import type { FraudFlagResolution } from "./types";

export function useResolveFraudFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flagId, resolution, note }: { flagId: number; resolution: FraudFlagResolution; note: string }) =>
      resolveFraudFlag(flagId, { resolution, note }),
    onSuccess: () => {
      // Resolution changes milestone/project status, tranche eligibility and citizen reports.
      for (const key of ["fraud-flags", "milestones", "tranches", "citizen-reports", "dashboard-summary", "project"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

export function useQaReviews(params?: Record<string, string | number>, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["qa-reviews", params],
    queryFn: () => fetchQaReviews(params),
    enabled: options?.enabled ?? true
  });
}

export function useFraudFlags(params?: Record<string, string | number>, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["fraud-flags", params],
    queryFn: () => fetchFraudFlags(params),
    enabled: options?.enabled ?? true
  });
}

export function useCreateQaReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createQaReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qa-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["fraud-flags"] });
      queryClient.invalidateQueries({ queryKey: ["evidence-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });
}
