import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { Disbursement, EligibilityResult, FundingTranche } from "./types";

export async function fetchTranches(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<FundingTranche[]>(endpoints.tranches, { params });
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

export async function fetchDisbursements(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<Disbursement[]>(endpoints.disbursements, { params });
  return data;
}
