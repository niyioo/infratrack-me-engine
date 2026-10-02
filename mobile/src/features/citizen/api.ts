import axios from "axios";
import * as Crypto from "expo-crypto";
import { endpoints } from "@/services/api/endpoints";

/**
 * Client for the anonymous citizen endpoints.
 *
 * Deliberately separate from apiClient: that one attaches the signed-in staff
 * member's token, and a citizen report must never carry anyone's identity —
 * even when the phone also has a staff session.
 */
const publicClient = axios.create({
  baseURL: `${endpoints.baseUrl}/public`,
  timeout: 30000,
  withCredentials: false,
});

export type PublicProject = {
  id: number;
  project_code: string;
  title: string;
  category: string;
  state: string;
  lga: string;
  site_address: string;
  current_status: string;
  latitude: number | null;
  longitude: number | null;
};

export type ReportStatus = {
  tracking_code: string;
  project_title: string;
  category: string;
  category_label: string;
  status_label: string;
  public_response: string;
  created_at: string;
  updated_at: string;
};

type Paginated<T> = { count: number; next: string | null; results: T[] };

/** Plain-language message for a failed public request. */
export function citizenErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return "Something went wrong. Please try again.";
  if (!error.response) return "Can't reach Civitness. Check your connection and try again.";
  const { status, data } = error.response;
  if (status === 429) return "Too many requests from your connection. Please wait a while and try again.";
  if (status === 404) return "We couldn't find that. Check the code and try again.";
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const first = typeof record.detail === "string" ? record.detail : Object.values(record).flat()[0];
    if (typeof first === "string") return first;
  }
  return "Something went wrong. Please try again.";
}

export async function searchPublicProjects(search: string) {
  const { data } = await publicClient.get<Paginated<PublicProject> | PublicProject[]>("/projects/", {
    params: { search: search || undefined, page: 1 },
  });
  return Array.isArray(data) ? data : data.results;
}

/** Random key for one report form; lets a retried submit return the same report. */
export function newReportKey() {
  return Crypto.randomUUID().replace(/-/g, "");
}

const RETRY_DELAYS_MS = [1500, 4000];

/**
 * Submits a report. On a dropped connection (the report may have arrived even
 * though the reply didn't, common on patchy mobile data) it retries with the
 * same client_key, which the server answers with the original report instead
 * of creating a duplicate.
 */
export async function submitCitizenReport(form: FormData) {
  for (let attempt = 0; ; attempt++) {
    try {
      const { data } = await publicClient.post<ReportStatus>("/citizen-reports/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    } catch (error) {
      const networkFailure = axios.isAxiosError(error) && !error.response;
      if (!networkFailure || attempt >= RETRY_DELAYS_MS.length) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}

export async function trackCitizenReport(code: string) {
  const { data } = await publicClient.get<ReportStatus>(`/citizen-reports/${encodeURIComponent(code.trim())}/`);
  return data;
}
