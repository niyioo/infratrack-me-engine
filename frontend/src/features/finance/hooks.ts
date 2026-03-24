import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { disburseTranche, evaluateTranche, fetchTranches } from "./api";

export function useTranches() {
  return useQuery({
    queryKey: ["tranches"],
    queryFn: fetchTranches
  });
}

export function useEvaluateTranche() {
  return useMutation({
    mutationFn: (trancheId: number) => evaluateTranche(trancheId)
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