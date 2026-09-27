import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageShell } from "@/app/layouts/PageShell";
import { ProjectForm, getProjectFormValues } from "@/components/forms/ProjectForm";
import { Card } from "@/components/ui/Card";
import { QueryStateCard } from "@/components/ui/QueryStateCard";
import { useAgencies, useContractors } from "@/features/organizations/hooks";
import { useProject, useUpdateProject } from "@/features/projects/hooks";
import type { CreateProjectPayload } from "@/features/projects/types";
import { getApiErrorMessage } from "@/lib/api/errors";

export function ProjectEditPage() {
  const navigate = useNavigate();
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const agenciesQuery = useAgencies({});
  const contractorsQuery = useContractors({});
  const updateProject = useUpdateProject();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const project = projectQuery.data;
  const agencies = agenciesQuery.data ?? [];
  const contractors = contractorsQuery.data ?? [];
  const initialValues = useMemo(() => (project ? getProjectFormValues(project) : undefined), [project]);

  async function handleSubmit(payload: CreateProjectPayload) {
    setSubmitError(null);

    try {
      await updateProject.mutateAsync({ projectId, payload });
      navigate(`/projects/${projectId}`);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, "InfraTrack could not update the project right now."));
    }
  }

  if (projectQuery.isLoading || agenciesQuery.isLoading || contractorsQuery.isLoading) {
    return (
      <PageShell title="Edit Project" description="Loading project record...">
        <QueryStateCard
          state="loading"
          title="Loading project"
          description="Preparing the project record and supporting directory references."
        />
      </PageShell>
    );
  }

  if (projectQuery.isError || agenciesQuery.isError || contractorsQuery.isError || !project || !initialValues) {
    return (
      <PageShell title="Edit Project" description="Project maintenance workspace.">
        <QueryStateCard
          state="error"
          title="Project unavailable"
          description="InfraTrack could not load this project for editing right now."
        />
      </PageShell>
    );
  }

  return (
    <PageShell title="Edit Project" description="Update the registry details that drive monitoring, reporting, and geofenced evidence.">
      <Card className="p-6">
        <ProjectForm
          agencies={agencies}
          contractors={contractors}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          loading={updateProject.isPending}
          submitLabel="Save Changes"
          submitError={submitError}
        />
      </Card>
    </PageShell>
  );
}
