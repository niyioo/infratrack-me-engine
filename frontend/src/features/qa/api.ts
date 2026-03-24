import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { QAReview, FraudFlag } from "./types";

export async function fetchQaReviews(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<QAReview[]>(endpoints.qaReviews, { params });
  return data;
}

export async function createQaReview(payload: Record<string, unknown>) {
  const { data } = await apiClient.post<QAReview>(endpoints.qaReviews, payload);
  return data;
}

export async function fetchFraudFlags() {
  const { data } = await apiClient.get<FraudFlag[]>(endpoints.fraudFlags);
  return data;
}