import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { StatCard } from "@/components/ui/StatCard";
import { PageShell } from "@/app/layouts/PageShell";
import { NigeriaProjectsMap } from "@/components/maps/NigeriaProjectsMap";
import { ProjectMapLegend } from "@/components/maps/ProjectMapLegend";
import { ProjectsTable } from "@/components/tables/ProjectsTable";
import { StatusDistributionChart } from "@/components/charts/StatusDistributionChart";
import { BurnVsPhysicalChart } from "@/components/charts/BurnVsPhysicalChart";
import { useProjects } from "@/features/projects/hooks";
import { useProjectMetricSnapshots } from "@/features/analytics/hooks";
import { formatCurrency } from "@/lib/utils/format";
import { toNumber } from "@/lib/utils/numbers";

export function DashboardPage() {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: snapshots = [], isLoading: snapshotsLoading } = useProjectMetricSnapshots();

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.current_status === "ACTIVE").length;
  const flaggedProjects = projects.filter((p) => p.current_status === "FLAGGED").length;
  const delayedProjects = projects.filter((p) => p.current_status === "DELAYED").length;
  const totalBudget = projects.reduce((sum, p) => sum + Number(p.budget_amount), 0);

  const statusDistributionData = [
    {
      name: "Active",
      value: activeProjects,
      color: "#2563eb"
    },
    {
      name: "Delayed",
      value: delayedProjects,
      color: "#f59e0b"
    },
    {
      name: "Flagged",
      value: flaggedProjects,
      color: "#dc2626"
    },
    {
      name: "Completed",
      value: projects.filter((p) => p.current_status === "COMPLETED").length,
      color: "#059669"
    }
  ].filter((item) => item.value > 0);

  const burnVsPhysicalData = snapshots.slice(0, 8).map((snapshot) => ({
    name: `P${snapshot.project}`,
    physical: toNumber(snapshot.physical_completion_percent),
    financial: toNumber(snapshot.financial_disbursement_percent)
  }));

  const flaggedProjectsList = projects.filter((p) => p.current_status === "FLAGGED").slice(0, 5);
  const delayedProjectsList = projects.filter((p) => p.current_status === "DELAYED").slice(0, 5);
  const recentProjects = projects.slice(0, 10);

  const loading = projectsLoading || snapshotsLoading;

  return (
    <PageShell
      title="Dashboard"
      description="National project visibility, performance monitoring, and disbursement oversight."
    >
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Projects" value={totalProjects} />
        <StatCard title="Active Projects" value={activeProjects} />
        <StatCard title="Flagged Projects" value={flaggedProjects} />
        <StatCard title="Total Budget Monitored" value={formatCurrency(totalBudget)} />
      </section>

      {loading ? (
        <Card className="p-10">
          <div className="flex items-center gap-3">
            <Spinner />
            <p className="text-sm text-slate-500">Loading dashboard data...</p>
          </div>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-base font-semibold">National Project Visibility</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Geo-distribution of monitored projects across locations.
                </p>
              </div>

              <div className="space-y-4 p-5">
                <ProjectMapLegend />
                <div className="h-[460px]">
                  {projects.length > 0 ? (
                    <NigeriaProjectsMap projects={projects} />
                  ) : (
                    <EmptyState
                      title="No mapped projects yet"
                      description="Project markers will appear here once project records with coordinates are available."
                    />
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-base font-semibold">Portfolio Snapshot</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Awaiting Verification</span>
                  <span>{projects.filter((p) => p.current_status === "AWAITING_VERIFICATION").length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed</span>
                  <span>{projects.filter((p) => p.current_status === "COMPLETED").length}</span>
                </div>
                <div className="flex justify-between">
                  <span>High Risk</span>
                  <span>
                    {
                      projects.filter(
                        (p) => p.risk_status === "HIGH" || p.risk_status === "CRITICAL"
                      ).length
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Independent Validation Required</span>
                  <span>{projects.filter((p) => p.requires_independent_validation).length}</span>
                </div>
              </div>

              <div className="mt-6">
                {statusDistributionData.length > 0 ? (
                  <StatusDistributionChart data={statusDistributionData} />
                ) : (
                  <EmptyState
                    title="No status data"
                    description="Status distribution will appear once projects are available."
                  />
                )}
              </div>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-base font-semibold">Burn Rate vs Physical Completion</h3>
              <p className="mt-1 text-sm text-slate-500">
                Comparison of financial disbursement against verified physical progress.
              </p>

              <div className="mt-4">
                {burnVsPhysicalData.length > 0 ? (
                  <BurnVsPhysicalChart data={burnVsPhysicalData} />
                ) : (
                  <EmptyState
                    title="No metric snapshots yet"
                    description="Generate project metric snapshots to populate this chart."
                  />
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-base font-semibold">Exception Overview</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-800">Flagged Projects</p>
                  <p className="mt-2 text-3xl font-semibold text-red-600">{flaggedProjects}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Projects currently requiring escalation or forensic review.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-800">Delayed Projects</p>
                  <p className="mt-2 text-3xl font-semibold text-amber-600">{delayedProjects}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Projects behind expected delivery timeline.
                  </p>
                </div>
              </div>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-base font-semibold">Flagged Projects</h3>
              <div className="mt-4 space-y-3">
                {flaggedProjectsList.length > 0 ? (
                  flaggedProjectsList.map((project) => (
                    <div key={project.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900">{project.title}</p>
                      <p className="text-xs text-slate-500">
                        {project.project_code} • {project.state}, {project.lga}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No flagged projects"
                    description="Flagged items will appear here when exceptions are detected."
                  />
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-base font-semibold">Delayed Projects</h3>
              <div className="mt-4 space-y-3">
                {delayedProjectsList.length > 0 ? (
                  delayedProjectsList.map((project) => (
                    <div key={project.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900">{project.title}</p>
                      <p className="text-xs text-slate-500">
                        {project.project_code} • {project.state}, {project.lga}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No delayed projects"
                    description="Delayed projects will appear here once schedule slippage is recorded."
                  />
                )}
              </div>
            </Card>
          </section>

          <section>
            <ProjectsTable title="Recent Projects" projects={recentProjects} loading={false} />
          </section>
        </>
      )}
    </PageShell>
  );
}