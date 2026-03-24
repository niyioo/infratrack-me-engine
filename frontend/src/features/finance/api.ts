import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { EligibilityResult, FundingTranche } from "./types";

export async function fetchTranches() {
  const { data } = await apiClient.get<FundingTranche[]>(endpoints.tranches);
  return data;
}

export async function evaluateTranche(trancheId: number) {
  const { data } = await apiClient.post<EligibilityResult>(`${endpoints.tranches}${trancheId}/evaluate/`);
  return data;
}

export async function disburseTranche(trancheId: number, payload: { payment_reference: string; note?: string }) {
  const { data } = await apiClient.post(`${endpoints.tranches}${trancheId}/disburse/`, payload);
  return data;
}