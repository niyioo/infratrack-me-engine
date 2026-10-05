import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";
import type { Project } from "./types";

type RawProject = Omit<Project, "physical_completion_percent" | "financial_disbursement_percent"> & {
  physical_completion_percent?: number | string | null;
  financial_disbursement_percent?: number | string | null;
};

function toNumber(value: number | string | null | undefined) {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

// The API sends stored decimals as strings ("50.00"); screens do maths and
// formatting on these, so hand them numbers.
function normalizeProject(raw: RawProject): Project {
  return {
    ...raw,
    physical_completion_percent: toNumber(raw.physical_completion_percent),
    financial_disbursement_percent: toNumber(raw.financial_disbursement_percent),
  } as Project;
}

export async function fetchProjects(params?: Record<string, string | number>) {
  const { data } = await apiClient.get<RawProject[] | { results: RawProject[] }>(endpoints.projects, { params });
  const rows = Array.isArray(data) ? data : data.results;
  return rows.map(normalizeProject);
}

export async function fetchProject(projectId: number | string) {
  // This cleanly removes any accidental trailing slash from the endpoint before adding the ID!
  const cleanEndpoint = endpoints.projects.replace(/\/$/, "");

  const { data } = await apiClient.get<RawProject>(`${cleanEndpoint}/${projectId}/`);
  return normalizeProject(data);
}
