import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "@/app/layouts/PageShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { QueryStateCard } from "@/components/ui/QueryStateCard";
import { Select } from "@/components/ui/Select";
import { ProjectsTable } from "@/components/tables/ProjectsTable";
import { useAuth } from "@/features/auth/hooks";
import { useDeleteProject, useProjects } from "@/features/projects/hooks";
import type { Project } from "@/features/projects/types";
import { useDebounce } from "@/hooks/useDebounce";
import { useQueryParams } from "@/hooks/useQueryParams";
import { getApiErrorMessage } from "@/lib/api/errors";

export function ProjectsPage() {
  const navigate = useNavigate();
  const { capabilities } = useAuth();
  const { get, set } = useQueryParams();
  const deleteProject = useDeleteProject();

  const [search, setSearchInput] = useState(get("search"));
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [projectPendingDelete, setProjectPendingDelete] = useState<Project | null>(null);
  const debouncedSearch = useDebounce(search, 400);
  const canManageProjects = capabilities.includes("projects.manage");

  const status = get("status");

  const projectsQuery = useProjects({
    search: debouncedSearch,
    current_status: status,
    page: String(page),
    page_size: "12"
  });
  const projects = projectsQuery.data?.items ?? [];
  const totalProjects = projectsQuery.data?.count ?? 0;
  const hasNextPage = Boolean(projectsQuery.data?.next);
  const hasPreviousPage = Boolean(projectsQuery.data?.previous);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    set("search", value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    set("status", value);
    setPage(1);
  }

  async function handleDeleteProject() {
    if (!projectPendingDelete) {
      return;
    }

    try {
      await deleteProject.mutateAsync(projectPendingDelete.id);
      setFeedback({ message: `${projectPendingDelete.title} was removed from the registry.`, variant: "success" });
      setProjectPendingDelete(null);
    } catch (error) {
      setFeedback({
        message: getApiErrorMessage(error, "InfraTrack could not delete this project right now."),
        variant: "error"
      });
    }
  }

  return (
    <PageShell
      title="Projects"
      description="Manage and monitor all registered infrastructure projects."
      actions={canManageProjects ? <Button onClick={() => navigate("/projects/new")}>+ New Project</Button> : null}
    >
      {feedback ? <Alert message={feedback.message} variant={feedback.variant} /> : null}
      {!canManageProjects ? (
        <Alert
          variant="info"
          title="Read-only project access"
          message="This account can review project records, but only project managers can create, edit, or delete them."
        />
      ) : null}

      <div className="flex flex-col gap-4 md:flex-row">
        <Input placeholder="Search projects..." value={search} onChange={(event) => handleSearchChange(event.target.value)} />

        <Select value={status} onChange={(event) => handleStatusChange(event.target.value)}>
          <option value="">All Status</option>
          <option value="NOT_STARTED">Not Started</option>
          <option value="ACTIVE">Active</option>
          <option value="AWAITING_VERIFICATION">Awaiting Verification</option>
          <option value="APPROVED_FOR_FUNDING">Approved for Funding</option>
          <option value="DELAYED">Delayed</option>
          <option value="FLAGGED">Flagged</option>
          <option value="COMPLETED">Completed</option>
        </Select>
      </div>

      {projectsQuery.isLoading ? (
        <QueryStateCard
          state="loading"
          title="Loading projects"
          description="Preparing filtered project records and operational status signals."
        />
      ) : projectsQuery.isError ? (
        <QueryStateCard
          state="error"
          title="Projects unavailable"
          description="The project registry could not be loaded right now."
        />
      ) : projects.length === 0 ? (
        <QueryStateCard
          state="empty"
          title="No projects match this filter"
          description="Try clearing the search, broadening the status filter, or creating a new project."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="p-4">
              <p className="text-sm text-slate-500">Visible Projects</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{totalProjects}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-slate-500">Delayed</p>
              <p className="mt-2 text-3xl font-semibold text-amber-700">
                {projects.filter((project) => project.current_status === "DELAYED").length}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-slate-500">Flagged</p>
              <p className="mt-2 text-3xl font-semibold text-red-700">
                {projects.filter((project) => project.current_status === "FLAGGED").length}
              </p>
            </Card>
          </div>

          <ProjectsTable
            title="All Projects"
            projects={projects}
            onEditProject={canManageProjects ? (project) => navigate(`/projects/${project.id}/edit`) : undefined}
            onDeleteProject={canManageProjects ? (project) => setProjectPendingDelete(project as Project) : undefined}
          />

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm text-slate-500">
              Showing page {page} of {Math.max(1, Math.ceil(totalProjects / 12))}
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                className="border border-slate-300 bg-white text-slate-900"
                disabled={!hasPreviousPage}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button type="button" disabled={!hasNextPage} onClick={() => setPage((current) => current + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={!!projectPendingDelete}
        title="Delete Project"
        onClose={() => {
          if (!deleteProject.isPending) {
            setProjectPendingDelete(null);
          }
        }}
      >
        {projectPendingDelete ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Delete <span className="font-semibold text-slate-900">{projectPendingDelete.title}</span> from the project
              registry? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                className="border border-slate-300 bg-white text-slate-900 shadow-none hover:bg-slate-50"
                onClick={() => setProjectPendingDelete(null)}
                disabled={deleteProject.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDeleteProject}
                disabled={deleteProject.isPending}
              >
                {deleteProject.isPending ? "Deleting..." : "Delete Project"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </PageShell>
  );
}
