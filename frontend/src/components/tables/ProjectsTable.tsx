import { Link } from "react-router-dom";
import type { Project } from "@/features/projects/types";
import { ProjectStatusBadge } from "@/components/status/ProjectStatusBadge";
import { RiskBadge } from "@/components/status/RiskBadge";
import { Card } from "@/components/ui/Card";

type Props = {
  title?: string;
  projects: Project[];
  loading?: boolean;
};

export function ProjectsTable({ title = "Projects", projects, loading }: Props) {
  return (
    <Card>
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-base font-semibold">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-5 py-3">Project</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Budget</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Risk</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-5 py-6" colSpan={6}>Loading...</td></tr>
            ) : projects.length === 0 ? (
              <tr><td className="px-5 py-6" colSpan={6}>No projects found.</td></tr>
            ) : (
              projects.map((project) => (
                <tr key={project.id} className="border-t border-slate-100">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-slate-900">{project.title}</p>
                      <p className="text-slate-500">{project.project_code}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">{project.state}, {project.lga}</td>
                  <td className="px-5 py-4">₦{Number(project.budget_amount).toLocaleString()}</td>
                  <td className="px-5 py-4"><ProjectStatusBadge status={project.current_status} /></td>
                  <td className="px-5 py-4"><RiskBadge risk={project.risk_status} /></td>
                  <td className="px-5 py-4 text-right">
                    <Link className="text-blue-600" to={`/projects/${project.id}`}>Open</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}