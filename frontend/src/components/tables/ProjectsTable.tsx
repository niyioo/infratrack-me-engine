import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProjectStatusBadge } from "@/components/status/ProjectStatusBadge";
import { RiskBadge } from "@/components/status/RiskBadge";
import type { Project } from "@/features/projects/types";

type ProjectListItemModel = Pick<
  Project,
  "id" | "title" | "project_code" | "state" | "lga" | "budget_amount" | "current_status" | "risk_status"
>;

type Props = {
  title?: string;
  projects: ProjectListItemModel[];
  loading?: boolean;
  onEditProject?: (project: ProjectListItemModel) => void;
  onDeleteProject?: (project: ProjectListItemModel) => void;
};

export function ProjectsTable({ title = "Projects", projects, loading, onEditProject, onDeleteProject }: Props) {
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
              <tr>
                <td className="px-5 py-6" colSpan={6}>
                  Loading...
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td className="px-5 py-6" colSpan={6}>
                  No projects found.
                </td>
              </tr>
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
                  <td className="px-5 py-4">NGN {Number(project.budget_amount).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <ProjectStatusBadge status={project.current_status} />
                  </td>
                  <td className="px-5 py-4">
                    <RiskBadge risk={project.risk_status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link className="px-2 py-1 text-sm font-medium text-brand" to={`/projects/${project.id}`}>
                        Open
                      </Link>
                      {onEditProject ? (
                        <Button
                          type="button"
                          className="border border-slate-300 bg-white px-3 py-1 text-slate-900 shadow-none hover:bg-slate-50"
                          onClick={() => onEditProject(project)}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {onDeleteProject ? (
                        <Button
                          type="button"
                          className="bg-red-600 px-3 py-1 shadow-none hover:bg-red-700"
                          onClick={() => onDeleteProject(project)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
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
