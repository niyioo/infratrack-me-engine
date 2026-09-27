import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Banknote,
  ChevronRight,
  Clock,
  Flag,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { QueryStateCard } from "@/components/ui/QueryStateCard";
import { Spinner } from "@/components/ui/Spinner";
import { StatCard } from "@/components/ui/StatCard";
import { PageShell } from "@/app/layouts/PageShell";
import { ProjectMapLegend } from "@/components/maps/ProjectMapLegend";
import { ProjectsTable } from "@/components/tables/ProjectsTable";
import { useDashboardSummary } from "@/features/dashboard/hooks";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { toNumber } from "@/lib/utils/numbers";
import clsx from "clsx";

const NigeriaProjectsMap = lazy(() =>
  import("@/components/maps/NigeriaProjectsMap").then((m) => ({
    default: m.NigeriaProjectsMap,
  })),
);
const StatusDistributionChart = lazy(() =>
  import("@/components/charts/StatusDistributionChart").then((m) => ({
    default: m.StatusDistributionChart,
  })),
);
const BurnVsPhysicalChart = lazy(() =>
  import("@/components/charts/BurnVsPhysicalChart").then((m) => ({
    default: m.BurnVsPhysicalChart,
  })),
);

function VisualizationLoader({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[280px] items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200">
      <Spinner />
      <p className="text-sm text-slate-500">Loading {label}…</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-5 w-[3px] rounded-full bg-brand" />
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
        {children}
      </h2>
    </div>
  );
}

function SignalCard({
  count,
  label,
  description,
  icon: Icon,
  variant,
}: {
  count: number;
  label: string;
  description: string;
  icon: React.ElementType;
  variant: "warning" | "danger" | "info";
}) {
  const config = {
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      countColor: "text-amber-700",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      labelColor: "text-amber-900",
      descColor: "text-amber-700/70",
      dot: "bg-amber-400",
    },
    danger: {
      bg: "bg-red-50",
      border: "border-red-200",
      countColor: "text-red-700",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      labelColor: "text-red-900",
      descColor: "text-red-700/70",
      dot: "bg-red-400",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      countColor: "text-blue-700",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      labelColor: "text-blue-900",
      descColor: "text-blue-700/70",
      dot: "bg-blue-400",
    },
  }[variant];

  return (
    <div
      className={clsx(
        "relative flex items-start gap-4 rounded-xl border p-5",
        config.bg,
        config.border,
      )}
    >
      <div
        className={clsx(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          config.iconBg,
        )}
      >
        <Icon size={18} className={config.iconColor} />
      </div>
      <div>
        <p className={clsx("text-sm font-semibold", config.labelColor)}>
          {label}
        </p>
        <p className={clsx("mt-1 text-3xl font-bold tabular-nums", config.countColor)}>
          {count}
        </p>
        <p className={clsx("mt-1 text-xs leading-snug", config.descColor)}>
          {description}
        </p>
      </div>
      {count > 0 && (
        <span
          className={clsx(
            "absolute right-4 top-4 h-2 w-2 animate-pulse-slow rounded-full",
            config.dot,
          )}
        />
      )}
    </div>
  );
}

function getAttentionConfig(reason: string): {
  label: string;
  border: string;
  badgeBg: string;
  badgeText: string;
} {
  const r = reason.toUpperCase();
  if (r.includes("FRAUD") || r.includes("FLAG") || r.includes("STALLED"))
    return {
      label: r.includes("FRAUD") ? "Fraud Flag" : r.includes("STALLED") ? "Stalled" : "Flagged",
      border: "border-l-red-400",
      badgeBg: "bg-red-50",
      badgeText: "text-red-700",
    };
  if (r.includes("DELAY") || r.includes("OVERDUE"))
    return {
      label: "Schedule Slip",
      border: "border-l-amber-400",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-700",
    };
  if (r.includes("GEOFENCE") || r.includes("EXCEPTION") || r.includes("LOCATION"))
    return {
      label: "Location Exception",
      border: "border-l-blue-400",
      badgeBg: "bg-blue-50",
      badgeText: "text-blue-700",
    };
  return {
    label: reason.replace(/_/g, " "),
    border: "border-l-slate-300",
    badgeBg: "bg-slate-50",
    badgeText: "text-slate-700",
  };
}

export function DashboardPage() {
  const { data: summary, isLoading, isError } = useDashboardSummary();

  const mapProjects = summary?.map_projects ?? [];
  const flaggedProjectsList = summary?.flagged_projects ?? [];
  const delayedProjectsList = summary?.delayed_projects ?? [];
  const interventionQueue = summary?.intervention_queue ?? [];
  const recentProjects = summary?.recent_projects ?? [];
  const latestSnapshots = summary?.latest_snapshots ?? [];

  const statusDistributionData = [
    { name: "Active", value: summary?.active_projects ?? 0, color: "#2563eb" },
    { name: "Delayed", value: summary?.delayed_projects_count ?? 0, color: "#f59e0b" },
    { name: "Flagged", value: summary?.flagged_projects_count ?? 0, color: "#dc2626" },
    { name: "Completed", value: summary?.completed_projects_count ?? 0, color: "#059669" },
  ].filter((item) => item.value > 0);

  const burnVsPhysicalData = latestSnapshots.map((snapshot) => ({
    name: `P${snapshot.project}`,
    physical: toNumber(snapshot.physical_completion_percent),
    financial: toNumber(snapshot.financial_disbursement_percent),
  }));

  return (
    <PageShell
      title="Dashboard"
      description="National project visibility, performance monitoring, and disbursement oversight."
    >
      {/* ── KPI Row ─────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Budget Monitored"
          value={formatCurrency(Number(summary?.total_budget ?? 0))}
          icon={<Banknote size={18} />}
          variant="info"
          subtitle="Total committed across portfolio"
        />
        <StatCard
          title="Active Projects"
          value={summary?.active_projects ?? 0}
          icon={<Activity size={18} />}
          variant="success"
          subtitle="Currently under delivery"
        />
        <StatCard
          title="Delayed Projects"
          value={summary?.delayed_projects_count ?? 0}
          icon={<Clock size={18} />}
          variant="warning"
          subtitle="Schedule slippage detected"
        />
        <StatCard
          title="Flagged Projects"
          value={summary?.flagged_projects_count ?? 0}
          icon={<AlertOctagon size={18} />}
          variant="danger"
          subtitle="Require escalation or audit"
        />
      </section>

      {isLoading ? (
        <QueryStateCard
          state="loading"
          title="Loading dashboard intelligence"
          description="Preparing portfolio signals, intervention priorities, and latest monitoring snapshots."
        />
      ) : isError || !summary ? (
        <QueryStateCard
          state="error"
          title="Dashboard unavailable"
          description="The operational summary could not be loaded. Please retry shortly."
        />
      ) : (
        <>
          {/* ── Operational Signals ─────────────────────────────────── */}
          <section className="space-y-3">
            <SectionLabel>Attention Required</SectionLabel>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SignalCard
                count={summary.alert_summary.delayed_milestones}
                label="Delayed Milestones"
                description="Active schedule slippage across visible projects."
                icon={Clock}
                variant="warning"
              />
              <SignalCard
                count={summary.alert_summary.unresolved_fraud_flags}
                label="Open Fraud Flags"
                description="Issues requiring audit or QA escalation."
                icon={ShieldAlert}
                variant="danger"
              />
              <SignalCard
                count={summary.alert_summary.geofence_exceptions_pending}
                label="Geofence Exceptions"
                description="Pending field-location exceptions awaiting review."
                icon={MapPin}
                variant="info"
              />
            </div>
          </section>

          {/* ── Snapshot + Intervention Queue ───────────────────────── */}
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Portfolio Snapshot
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {summary.summary_source === "precomputed"
                      ? `Served from the ${formatDate(summary.summary_snapshot_date)} snapshot.`
                      : "Generated live from visible projects."}
                  </p>
                </div>
                <div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                  <p className="text-2xl font-bold text-slate-900">
                    {summary.total_projects ?? 0}
                  </p>
                  <p className="text-xs text-slate-500">Total Projects</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Awaiting Verification",
                    value: summary.awaiting_verification_count ?? 0,
                    color: "text-blue-700",
                    bg: "bg-blue-50",
                  },
                  {
                    label: "Completed",
                    value: summary.completed_projects_count ?? 0,
                    color: "text-emerald-700",
                    bg: "bg-emerald-50",
                  },
                  {
                    label: "High Risk",
                    value: summary.high_risk_projects_count ?? 0,
                    color: "text-red-700",
                    bg: "bg-red-50",
                  },
                  {
                    label: "Ind. Validation Required",
                    value: summary.independent_validation_required_count ?? 0,
                    color: "text-amber-700",
                    bg: "bg-amber-50",
                  },
                ].map(({ label, value, color, bg }) => (
                  <div
                    key={label}
                    className={clsx(
                      "flex items-center justify-between rounded-lg px-3 py-2.5",
                      bg,
                    )}
                  >
                    <p className="text-sm text-slate-600">{label}</p>
                    <p className={clsx("text-base font-bold tabular-nums", color)}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex flex-col p-5">
              <h3 className="text-base font-semibold text-slate-900">
                Intervention Queue
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Highest-priority projects — click to open.
              </p>
              <div className="mt-4 flex flex-1 flex-col gap-2 overflow-hidden">
                {interventionQueue.length > 0 ? (
                  interventionQueue.slice(0, 6).map((project) => {
                    const att = getAttentionConfig(project.attention_reason ?? "");
                    return (
                      <Link
                        key={project.id}
                        to={`/projects/${project.id}`}
                        className={clsx(
                          "group flex items-start justify-between gap-3 rounded-lg border border-slate-200 border-l-[3px] p-3 transition-colors hover:bg-slate-50",
                          att.border,
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-brand">
                            {project.title}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <span>{project.project_code}</span>
                            <span>·</span>
                            <span>
                              {project.state}, {project.lga}
                            </span>
                          </p>
                          <p className="mt-1.5 text-xs text-slate-500">
                            Due {formatDate(project.expected_end_date)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span
                            className={clsx(
                              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              att.badgeBg,
                              att.badgeText,
                            )}
                          >
                            {att.label}
                          </span>
                          <ChevronRight
                            size={14}
                            className="text-slate-400 group-hover:text-brand"
                          />
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <EmptyState
                    title="No immediate interventions"
                    description="Projects needing escalation will appear here as risk signals emerge."
                  />
                )}
              </div>
            </Card>
          </section>

          {/* ── Map + Portfolio Chart ────────────────────────────────── */}
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">
                  National Project Visibility
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Geo-distribution of monitored projects across locations.
                </p>
              </div>
              <div className="space-y-4 p-5">
                <ProjectMapLegend />
                <div className="h-[420px]">
                  {mapProjects.length > 0 ? (
                    <Suspense fallback={<VisualizationLoader label="map" />}>
                      <NigeriaProjectsMap projects={mapProjects} />
                    </Suspense>
                  ) : (
                    <EmptyState
                      title="No mapped projects"
                      description="Project markers appear once records with coordinates are available."
                    />
                  )}
                </div>
              </div>
            </Card>

            <div className="flex flex-col gap-6">
              <Card className="p-5">
                <h3 className="text-base font-semibold text-slate-900">
                  Status Distribution
                </h3>
                <div className="mt-4">
                  {statusDistributionData.length > 0 ? (
                    <Suspense fallback={<VisualizationLoader label="status chart" />}>
                      <StatusDistributionChart data={statusDistributionData} />
                    </Suspense>
                  ) : (
                    <EmptyState
                      title="No status data"
                      description="Status distribution appears once projects are available."
                    />
                  )}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-base font-semibold text-slate-900">
                  Exception Summary
                </h3>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Flag size={14} className="text-red-600" />
                      <span className="text-sm text-red-800">Flagged Projects</span>
                    </div>
                    <span className="text-base font-bold text-red-700">
                      {summary.flagged_projects_count ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-600" />
                      <span className="text-sm text-amber-800">Compliance Queue</span>
                    </div>
                    <span className="text-base font-bold text-amber-700">
                      {summary.compliance_queue?.length ?? 0}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* ── Burn Rate Chart ──────────────────────────────────────── */}
          <section>
            <Card className="p-5">
              <h3 className="text-base font-semibold text-slate-900">
                Burn Rate vs Physical Completion
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Financial disbursement against verified physical progress — divergence signals risk.
              </p>
              <div className="mt-4">
                {burnVsPhysicalData.length > 0 ? (
                  <Suspense fallback={<VisualizationLoader label="burn chart" />}>
                    <BurnVsPhysicalChart data={burnVsPhysicalData} />
                  </Suspense>
                ) : (
                  <EmptyState
                    title="No metric snapshots"
                    description="Generate project metric snapshots to populate this chart."
                  />
                )}
              </div>
            </Card>
          </section>

          {/* ── Flagged / Delayed ────────────────────────────────────── */}
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <AlertOctagon size={15} className="text-red-500" />
                <h3 className="text-base font-semibold text-slate-900">
                  Flagged Projects
                </h3>
              </div>
              <div className="mt-4 space-y-2">
                {flaggedProjectsList.length > 0 ? (
                  flaggedProjectsList.map((project) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="group flex items-center justify-between rounded-lg border border-red-100 bg-red-50/60 px-3 py-2.5 transition-colors hover:border-red-200 hover:bg-red-50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-brand">
                          {project.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {project.project_code} · {project.state}, {project.lga}
                        </p>
                      </div>
                      <ChevronRight size={14} className="shrink-0 text-slate-400 group-hover:text-brand" />
                    </Link>
                  ))
                ) : (
                  <EmptyState
                    title="No flagged projects"
                    description="Flagged items appear when exceptions are detected."
                  />
                )}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-amber-500" />
                <h3 className="text-base font-semibold text-slate-900">
                  Delayed Projects
                </h3>
              </div>
              <div className="mt-4 space-y-2">
                {delayedProjectsList.length > 0 ? (
                  delayedProjectsList.map((project) => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="group flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2.5 transition-colors hover:border-amber-200 hover:bg-amber-50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-brand">
                          {project.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {project.project_code} · {project.state}, {project.lga}
                        </p>
                      </div>
                      <ChevronRight size={14} className="shrink-0 text-slate-400 group-hover:text-brand" />
                    </Link>
                  ))
                ) : (
                  <EmptyState
                    title="No delayed projects"
                    description="Delayed projects appear once schedule slippage is recorded."
                  />
                )}
              </div>
            </Card>
          </section>

          {/* ── Recent Projects Table ────────────────────────────────── */}
          <section>
            <ProjectsTable
              title="Recent Projects"
              projects={recentProjects}
              loading={false}
            />
          </section>
        </>
      )}
    </PageShell>
  );
}
