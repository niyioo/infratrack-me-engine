import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageShell } from "@/app/layouts/PageShell";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { QueryStateCard } from "@/components/ui/QueryStateCard";
import { ProjectForm } from "@/components/forms/ProjectForm";
import { useAuth } from "@/features/auth/hooks";
import { useAgencies, useContractors } from "@/features/organizations/hooks";
import { useCreateProject } from "@/features/projects/hooks";
import type { CreateProjectPayload } from "@/features/projects/types";
import { getApiErrorMessage } from "@/lib/api/errors";

export function ProjectCreatePage() {
  const navigate = useNavigate();
  const { capabilities } = useAuth();
  const createProject = useCreateProject();
  const agenciesQuery = useAgencies({});
  const contractorsQuery = useContractors({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const agencies = agenciesQuery.data ?? [];
  const contractors = contractorsQuery.data ?? [];
  const directoryLoading = agenciesQuery.isLoading || contractorsQuery.isLoading;
  const directoryError = agenciesQuery.isError || contractorsQuery.isError;
  const canManageDirectory = capabilities.includes("users.view_directory");

  async function handleSubmit(payload: CreateProjectPayload) {
    setSubmitError(null);

    try {
      const project = await createProject.mutateAsync(payload);
      navigate(`/projects/${project.id}`);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, "ProveTrack could not create the project right now."));
    }
  }

  if (directoryLoading) {
    return (
      <PageShell title="Create Project" description="Loading project directories...">
        <QueryStateCard
          state="loading"
          title="Loading project directories"
          description="Fetching active agencies and contractors for this form."
        />
      </PageShell>
    );
  }

  if (directoryError) {
    return (
      <PageShell title="Create Project" description="Project registration workspace.">
        <QueryStateCard
          state="error"
          title="Project form is missing reference data"
          description="ProveTrack could not load the active agency and contractor directories needed for project setup."
        />
      </PageShell>
    );
  }

  if (agencies.length === 0 || contractors.length === 0) {
    return (
      <PageShell title="Create Project" description="Project registration workspace.">
        <QueryStateCard
          state="empty"
          title="Reference directories are empty"
          description="Create at least one active agency and one active contractor before registering a project."
          action={
            canManageDirectory ? (
              <Link className="inline-flex text-sm font-medium text-brand" to="/vendors">
                Open Vendors Directory
              </Link>
            ) : undefined
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Create Project"
      description="Register a new project and capture the geo-verified reference data used across monitoring workflows."
    >
      {canManageDirectory ? (
        <Alert
          variant="info"
          message="Need to register a new funding agency or contractor first? Use the Vendors workspace and return here once the directory is updated."
        />
      ) : null}

      <Card className="p-6">
        <ProjectForm
          agencies={agencies}
          contractors={contractors}
          onSubmit={handleSubmit}
          loading={createProject.isPending}
          submitLabel="Create Project"
          submitError={submitError}
        />
      </Card>
    </PageShell>
  );
}
