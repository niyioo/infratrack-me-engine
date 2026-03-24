import { useQuery } from "@tanstack/react-query";
import { fetchEvidenceSubmissions } from "./api";

export function useEvidenceSubmissions(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ["evidence-submissions", params],
    queryFn: () => fetchEvidenceSubmissions(params)
  });
}