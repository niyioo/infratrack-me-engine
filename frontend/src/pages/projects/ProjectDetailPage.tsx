import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Tabs } from "@/components/ui/Tabs";
import { PageShell } from "@/app/layouts/PageShell";
import { ProjectHeader } from "@/components/project/ProjectHeader";
import { ProjectSummaryCards } from "@/components/project/ProjectSummaryCards";
import { ProjectAssignmentsPanel } from "@/components/project/ProjectAssignmentsPanel";
import { ProjectEvidenceGallery } from "@/components/project/ProjectEvidenceGallery";
import { ProjectFinancePanel } from "@/components/project/ProjectFinancePanel";
import { ProjectTimeline } from "@/components/project/ProjectTimeline";
import { MilestonesTable } from "@/components/tables/MilestonesTable";
import { EvidenceTable } from "@/components/tables/EvidenceTable";
import { FraudFlagsTable } from "@/components/tables/FraudFlagsTable";
import { NigeriaProjectsMap } from "@/components/maps/NigeriaProjectsMap";
import { useProject, useProjectAssignments } from "@/features/projects/hooks";
import { useMilestones } from "@/features/milestones/hooks";
import { useEvidenceSubmissions } from "@/features/evidence/hooks";
import { useTranches } from "@/features/finance/hooks";
import { useFraudFlags } from "@/features/qa/hooks";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "milestones", label: "Milestones" },
  { key: "evidence", label: "Evidence" },
  { key: "finance", label: "Finance" },
  { key: "risk", label: "Risk & Flags" }
];

export function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: assignments = [], isLoading: assignmentsLoading } = useProjectAssignments(projectId);
  const { data: milestones = [], isLoading: milestonesLoading } = useMilestones(
    projectId ? { project: projectId } : undefined
  );
  const { data: evidenceItems = [], isLoading: evidenceLoading } = useEvidenceSubmissions(
    projectId ? { project: projectId } : undefined
  );
  const { data: tranches = [], isLoading: tranchesLoading } = useTranches();
  const { data: fraudFlags = [], isLoading: fraudFlagsLoading } = useFraudFlags();

  const projectTranches = useMemo(
    () => tranches.filter((tranche) => String(tranche.project) === String(projectId)),
    [tranches, projectId]
  );

  const projectFraudFlags = useMemo(
    () => fraudFlags,
    [fraudFlags]
  );

  const loading =
    projectLoading ||
    assignmentsLoading ||
    milestonesLoading ||
    evidenceLoading ||
    tranchesLoading ||
    fraudFlagsLoading;

  if (loading) {
    return (
      <PageShell title="Project Details" description="Loading project information...">
        <Card className="p-10">
          <div className="flex items-center gap-3">
            <Spinner />
            <p className="text-sm text-slate-500">Loading project data...</p>
          </div>
        </Card>
      </PageShell>
    );
  }

  if (!project) {
    return (
      <PageShell title="Project Details">
        <EmptyState
          title="Project not found"
          description="The requested project could not be loaded or may no longer exist."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Project Details"
      description="Detailed view of project profile, progress, verification, and finance status."
    >
      <Card className="p-6">
        <ProjectHeader project={project} />
      </Card>

      <ProjectSummaryCards project={project} />

      <Card className="p-6">
        <Tabs items={tabs} active={activeTab} onChange={setActiveTab} />
      </Card>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card className="p-6">
              <h3 className="text-base font-semibold">Project Profile</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-slate-500">Agency</p>
                  <p className="mt-1 text-sm font-medium">{project.agency.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Contractor</p>
                  <p className="mt-1 text-sm font-medium">{project.contractor.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Supervising Department</p>
                  <p className="mt-1 text-sm font-medium">{project.supervising_department}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Category / Sector</p>
                  <p className="mt-1 text-sm font-medium">
                    {project.category} / {project.sector}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Location</p>
                  <p className="mt-1 text-sm font-medium">
                    {project.state}, {project.lga}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Site Address</p>
                  <p className="mt-1 text-sm font-medium">{project.site_address}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Start Date</p>
                  <p className="mt-1 text-sm font-medium">{project.start_date}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Expected End Date</p>
                  <p className="mt-1 text-sm font-medium">{project.expected_end_date}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-base font-semibold">Project Location</h3>
              <div className="mt-4 h-[420px]">
                <NigeriaProjectsMap projects={[project]} />
              </div>
            </Card>
          </div>

          <div>
            <ProjectAssignmentsPanel assignments={assignments} />
          </div>
        </div>
      )}

      {activeTab === "milestones" && (
        <div className="space-y-6">
          <ProjectTimeline milestones={milestones} />
          <MilestonesTable milestones={milestones} />
        </div>
      )}

      {activeTab === "evidence" && (
        <div className="space-y-6">
          <ProjectEvidenceGallery items={evidenceItems} />
          <EvidenceTable items={evidenceItems} />
        </div>
      )}

      {activeTab === "finance" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ProjectFinancePanel tranches={projectTranches} />
          <Card className="p-6">
            <h3 className="text-base font-semibold">Finance Summary</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Total Tranches</span>
                <span>{projectTranches.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Eligible Tranches</span>
                <span>{projectTranches.filter((t) => t.current_status === "ELIGIBLE").length}</span>
              </div>
              <div className="flex justify-between">
                <span>Disbursed Tranches</span>
                <span>{projectTranches.filter((t) => t.current_status === "DISBURSED").length}</span>
              </div>
              <div className="flex justify-between">
                <span>Locked Tranches</span>
                <span>{projectTranches.filter((t) => t.current_status === "LOCKED").length}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "risk" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-base font-semibold">Risk Summary</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Project Risk Status</span>
                <span>{project.risk_status}</span>
              </div>
              <div className="flex justify-between">
                <span>Fraud Flags</span>
                <span>{projectFraudFlags.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Evidence Items</span>
                <span>{evidenceItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Independent Validation</span>
                <span>{project.requires_independent_validation ? "Required" : "Optional"}</span>
              </div>
            </div>
          </Card>

          <FraudFlagsTable items={projectFraudFlags} />
        </div>
      )}
    </PageShell>
  );
}