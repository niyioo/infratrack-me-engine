const API_BASE = (import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/public").replace(/\/$/, "");

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

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
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

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // credentials: "omit": the portal never sends cookies, so reports stay anonymous.
  const response = await fetch(`${API_BASE}${path}`, { credentials: "omit", ...init });
  if (response.ok) return response.json() as Promise<T>;

  let message = "Something went wrong. Please try again.";
  if (response.status === 429) message = "Too many requests from your connection. Please wait a while and try again.";
  else if (response.status === 404) message = "We couldn't find that.";
  else {
    try {
      const data = (await response.json()) as Record<string, unknown>;
      const first = typeof data.detail === "string" ? data.detail : Object.values(data).flat()[0];
      if (typeof first === "string") message = first;
    } catch {
      /* keep default */
    }
  }
  throw new ApiError(message, response.status);
}

export function searchProjects(params: { search?: string; state?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.state) query.set("state", params.state);
  query.set("page", String(params.page ?? 1));
  return request<Paginated<PublicProject>>(`/projects/?${query}`);
}

export function getProject(id: string | number) {
  return request<PublicProject>(`/projects/${id}/`);
}

/** Random key for one report form; lets a retried submit return the same report. */
export function newReportKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const RETRY_DELAYS_MS = [1500, 4000];

/**
 * Submits a report. If the connection drops (the report may have arrived even
 * though the reply didn't), it retries with the same client_key, which the
 * server answers with the original report instead of a duplicate.
 */
export async function submitReport(form: FormData) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request<ReportStatus>("/citizen-reports/", { method: "POST", body: form });
    } catch (error) {
      const networkFailure = !(error instanceof ApiError);
      if (!networkFailure || attempt >= RETRY_DELAYS_MS.length) {
        if (networkFailure) throw new ApiError("Couldn't reach the server. Check your connection and try again.", 0);
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}

export function trackReport(code: string) {
  return request<ReportStatus>(`/citizen-reports/${encodeURIComponent(code.trim())}/`);
}
