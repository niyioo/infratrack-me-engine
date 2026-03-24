import { fetchProjects } from "@/features/projects/api";
import type { DashboardKpis } from "./types";

export async function fetchDashboardKpis(): Promise<DashboardKpis> {
  const projects = await fetchProjects();
  return {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.current_status === "ACTIVE").length,
    flaggedProjects: projects.filter((p) => p.current_status === "FLAGGED").length,
    delayedProjects: projects.filter((p) => p.current_status === "DELAYED").length,
    totalBudget: projects.reduce((sum, p) => sum + Number(p.budget_amount), 0)
  };
}