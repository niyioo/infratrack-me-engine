import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { disburseTranche, evaluateTranche, fetchDisbursements, fetchTranches } from "./api";

export function useTranches(
  params?: Record<string, string | number>,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["tranches", params],
    queryFn: () => fetchTranches(params),
    enabled: options?.enabled ?? true
  });
}

export function useEvaluateTranche() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trancheId: number) => evaluateTranche(trancheId),
    // Evaluation writes the tranche's status (LOCKED/ELIGIBLE) server-side.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tranches"] });
    }
  });
}

export function useDisburseTranche() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ trancheId, payload }: { trancheId: number; payload: { payment_reference: string; note?: string } }) =>
      disburseTranche(trancheId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tranches"] });
    }
  });
}

export function useDisbursements(
  params?: Record<string, string | number>,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["disbursements", params],
    queryFn: () => fetchDisbursements(params),
    enabled: options?.enabled ?? true
  });
}
