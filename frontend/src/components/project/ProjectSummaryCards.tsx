import { StatCard } from "@/components/ui/StatCard";
import type { Project } from "@/features/projects/types";

export function ProjectSummaryCards({ project }: { project: Project }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Budget" value={`₦${Number(project.budget_amount).toLocaleString()}`} />
      <StatCard title="State / LGA" value={`${project.state} / ${project.lga}`} />
      <StatCard title="Geo-fence Radius" value={`${project.geo_fence_radius_meters}m`} />
      <StatCard title="Validation" value={project.requires_independent_validation ? "Required" : "Optional"} />
    </div>
  );
}