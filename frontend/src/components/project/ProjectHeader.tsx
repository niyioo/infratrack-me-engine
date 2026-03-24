import type { Project } from "@/features/projects/types";
import { ProjectStatusBadge } from "@/components/status/ProjectStatusBadge";
import { RiskBadge } from "@/components/status/RiskBadge";

export function ProjectHeader({ project }: { project: Project }) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <p className="text-sm text-slate-500">{project.project_code}</p>
        <h1 className="mt-1 text-2xl font-semibold">{project.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{project.description}</p>
      </div>
      <div className="flex gap-2">
        <ProjectStatusBadge status={project.current_status} />
        <RiskBadge risk={project.risk_status} />
      </div>
    </div>
  );
}