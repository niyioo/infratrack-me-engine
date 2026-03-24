import { apiClient } from "@/services/api/client";
import type { Assignment } from "./types";

export async function fetchAssignments() {
  const { data } = await apiClient.get<Assignment[]>("/projects/");
  return data;
}