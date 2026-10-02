import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { QAReview, FraudFlag, FraudFlagResolution } from "./types";

export async function resolveFraudFlag(flagId: number, payload: { resolution: FraudFlagResolution; note: string }) {
  const { data } = await apiClient.post<FraudFlag>(`${endpoints.fraudFlags}${flagId}/resolve/`, payload);
  return data;
}

export async function fetchQaReviews(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<QAReview[]>(endpoints.qaReviews, { params });
  return data;
}

export async function createQaReview(payload: Record<string, unknown>) {
  const { data } = await apiClient.post<QAReview>(endpoints.qaReviews, payload);
  return data;
}

export async function fetchFraudFlags(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<FraudFlag[]>(endpoints.fraudFlags, { params });
  return data;
}
