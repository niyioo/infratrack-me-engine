import { Link } from "react-router-dom";
import type { Project } from "@/features/projects/types";

export function ProjectMarkerPopup({ project }: { project: Project }) {
  return (
    <div className="space-y-1 text-sm">
      <p className="font-semibold">{project.title}</p>
      <p>{project.project_code}</p>
      <p>{project.state}, {project.lga}</p>
      <p>Status: {project.current_status}</p>
      <p>Risk: {project.risk_status}</p>
      <Link to={`/projects/${project.id}`} className="text-blue-600 underline">
        View project
      </Link>
    </div>
  );
}