import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { PortfolioMap } from "./types";

export async function fetchPortfolioMap(): Promise<PortfolioMap> {
  const { data } = await apiClient.get<PortfolioMap>(`${endpoints.projectMetricSnapshots}portfolio-map/`);
  return data;
}
