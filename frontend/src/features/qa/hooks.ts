import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createQaReview, fetchFraudFlags, fetchQaReviews } from "./api";

export function useQaReviews(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ["qa-reviews", params],
    queryFn: () => fetchQaReviews(params)
  });
}

export function useFraudFlags() {
  return useQuery({
    queryKey: ["fraud-flags"],
    queryFn: fetchFraudFlags
  });
}

export function useCreateQaReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createQaReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qa-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["fraud-flags"] });
    }
  });
}