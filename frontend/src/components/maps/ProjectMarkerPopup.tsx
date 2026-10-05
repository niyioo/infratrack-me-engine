import { Link } from "react-router-dom";
type PopupProject = {
  id: number;
  title: string;
  project_code: string;
  state: string;
  lga: string;
  current_status: string;
  risk_status: string;
};

export function ProjectMarkerPopup({ project }: { project: PopupProject }) {
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
