import { useQuery } from "@tanstack/react-query";
import { fetchPortfolioMap } from "./api";

export function usePortfolioMap() {
  return useQuery({ queryKey: ["portfolio-map"], queryFn: fetchPortfolioMap });
}
