import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  MapPin,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { QueryStateCard } from "@/components/ui/QueryStateCard";
import { Spinner } from "@/components/ui/Spinner";
import { Tabs } from "@/components/ui/Tabs";
import { PageShell } from "@/app/layouts/PageShell";
import { useAuth } from "@/features/auth/hooks";
import { ProjectHeader } from "@/components/project/ProjectHeader";
import { ProjectSummaryCards } from "@/components/project/ProjectSummaryCards";
import { ProjectAssignmentsPanel } from "@/components/project/ProjectAssignmentsPanel";
import { ProjectEvidenceGallery } from "@/components/project/ProjectEvidenceGallery";
import { ProjectFinancePanel } from "@/components/project/ProjectFinancePanel";
import { GeoFenceExceptionsPanel } from "@/components/project/GeoFenceExceptionsPanel";
import { ProjectTimeline } from "@/components/project/ProjectTimeline";
import { MilestonesTable } from "@/components/tables/MilestonesTable";
import { EvidenceTable } from "@/components/tables/EvidenceTable";
import { FraudFlagsTable } from "@/components/tables/FraudFlagsTable";
import { NigeriaProjectsMap } from "@/components/maps/NigeriaProjectsMap";
import { useProject, useProjectAssignments } from "@/features/projects/hooks";
import { useMilestones } from "@/features/milestones/hooks";
import { useEvidenceSubmissions, useGeoFenceExceptions } from "@/features/evidence/hooks";
import { useTranches } from "@/features/finance/hooks";
import { useFraudFlags } from "@/features/qa/hooks";
import {
  FRAUD_FLAG_RESOLVE_CAPABILITIES,
  GEOFENCE_EXCEPTION_REVIEW_CAPABILITIES,
} from "@/lib/constants/capabilityPolicies";
import { useDispatchReportingReminder } from "@/features/projects/hooks";
import { Button } from "@/components/ui/Button";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "milestones", label: "Milestones" },
  { key: "evidence", label: "Evidence" },
  { key: "finance", label: "Finance" },
  { key: "risk", label: "Risk & Flags" },
];

function ProgressBar({
  value,
  variant = "default",
}: {
  value: number;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const colors = {
    default: "bg-brand",
    success: "bg-emerald-500",
    warning: "bg-amber-400",
    danger: "bg-red-500",
  };
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div
        className={clsx("h-1.5 rounded-full transition-all duration-500", colors[variant])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function RiskChip({ risk }: { risk: string | undefined }) {
  if (!risk) return null;
  const config: Record<string, { bg: string; text: string; icon: string }> = {
    CRITICAL: { bg: "bg-red-100", text: "text-red-800", icon: "●" },
    HIGH: { bg: "bg-red-100", text: "text-red-700", icon: "●" },
    MEDIUM: { bg: "bg-amber-100", text: "text-amber-700", icon: "●" },
    LOW: { bg: "bg-emerald-100", text: "text-emerald-700", icon: "●" },
    STANDARD: { bg: "bg-slate-100", text: "text-slate-700", icon: "●" },
  };
  const c = config[risk] ?? config["STANDARD"];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        c.bg,
        c.text,
      )}
    >
      <span className="text-[8px]">{c.icon}</span>
      {risk} Risk
    </span>
  );
}

export function ProjectDetailPage() {
  const { projectId = "" } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const { capabilities } = useAuth();
  const dispatchReminder = useDispatchReportingReminder();

  const overviewActive = activeTab === "overview";
  const milestonesActive = activeTab === "milestones";
  const evidenceActive = activeTab === "evidence";
  const financeActive = activeTab === "finance";
  const riskActive = activeTab === "risk";

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const assignmentsQuery = useProjectAssignments(projectId, { enabled: overviewActive });
  const milestonesQuery = useMilestones(
    projectId ? { project: projectId } : undefined,
    { enabled: milestonesActive },
  );
  const evidenceQuery = useEvidenceSubmissions(
    projectId ? { project: projectId } : undefined,
    { enabled: evidenceActive || riskActive },
  );
  const tranchesQuery = useTranches(
    projectId ? { project: projectId } : undefined,
    { enabled: financeActive },
  );
  const fraudFlagsQuery = useFraudFlags(
    projectId ? { project: projectId } : undefined,
    { enabled: riskActive },
  );
  const geoFenceExceptionsQuery = useGeoFenceExceptions(
    projectId ? { project: projectId } : undefined,
    { enabled: riskActive },
  );

  const assignments = assignmentsQuery.data ?? [];
  const milestones = milestonesQuery.data ?? [];
  const evidenceItems = evidenceQuery.data ?? [];
  const tranches = tranchesQuery.data ?? [];
  const fraudFlags = fraudFlagsQuery.data ?? [];
  const geoFenceExceptions = geoFenceExceptionsQuery.data ?? [];

  const projectTranches = useMemo(() => tranches, [tranches]);
  const projectFraudFlags = useMemo(() => fraudFlags, [fraudFlags]);
  const openFraudFlagCount = useMemo(
    () => fraudFlags.filter((flag) => flag.status === "OPEN").length,
    [fraudFlags],
  );
  const canResolveFraudFlags = capabilities.some((cap) =>
    FRAUD_FLAG_RESOLVE_CAPABILITIES.some((allowed) => allowed === cap),
  );
  const pendingGeoFenceExceptions = useMemo(
    () => geoFenceExceptions.filter((item) => item.status === "PENDING"),
    [geoFenceExceptions],
  );
  const canReviewGeoFenceExceptions = capabilities.some((cap) =>
    GEOFENCE_EXCEPTION_REVIEW_CAPABILITIES.some((allowed) => allowed === cap),
  );

  if (projectLoading) {
    return (
      <PageShell title="Project Details" description="Loading project information…">
        <Card className="p-10">
          <div className="flex items-center gap-3">
            <Spinner />
            <p className="text-sm text-slate-500">Loading project data…</p>
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

  const progress = project.physical_completion_percent ?? 0;
  const progressVariant =
    progress >= 70 ? "success" : progress >= 30 ? "default" : "warning";

  return (
    <PageShell
      title="Project Details"
      description="Profile, progress, verification, and finance status."
    >
      {/* ── Header + Tabs merged into one card ──────────────────────── */}
      <Card>
        <div className="p-6">
          <ProjectHeader project={project} />

          {/* Compact progress bar below title */}
          {project.physical_completion_percent != null && (
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Physical Progress</span>
                <span className="font-semibold text-slate-700">
                  {project.physical_completion_percent}% verified
                </span>
              </div>
              <ProgressBar value={project.physical_completion_percent} variant={progressVariant} />
            </div>
          )}
        </div>
        <div className="border-t border-slate-100 px-6">
          <Tabs items={tabs} active={activeTab} onChange={setActiveTab} />
        </div>
      </Card>

      <ProjectSummaryCards project={project} />

      {/* ── Overview ──────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card className="p-6">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <Building2 size={16} className="text-slate-400" />
                Project Profile
              </h3>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                  { label: "Agency", value: project.agency.name },
                  { label: "Contractor", value: project.contractor.name },
                  { label: "Supervising Department", value: project.supervising_department },
                  {
                    label: "Category / Sector",
                    value: `${project.category} / ${project.sector}`,
                  },
                  {
                    label: "Location",
                    value: `${project.state}, ${project.lga}`,
                    icon: <MapPin size={12} className="text-slate-400" />,
                  },
                  { label: "Site Address", value: project.site_address },
                  {
                    label: "Start Date",
                    value: project.start_date,
                    icon: <CalendarDays size={12} className="text-slate-400" />,
                  },
                  {
                    label: "Expected End Date",
                    value: project.expected_end_date,
                    icon: <CalendarDays size={12} className="text-slate-400" />,
                  },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-3">
                    <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {icon}
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{value || "—"}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <MapPin size={16} className="text-slate-400" />
                Project Location
              </h3>
              <div className="mt-4 h-[380px]">
                <NigeriaProjectsMap projects={[project]} />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <AlertTriangle size={16} className="text-slate-400" />
                    Intervention & Compliance
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Operational signals, reporting cadence, and escalation context.
                  </p>
                </div>
                {project.reporting_attention_reason && (
                  <Button
                    type="button"
                    disabled={dispatchReminder.isPending}
                    onClick={() => dispatchReminder.mutate(projectId)}
                  >
                    Send Reminder
                  </Button>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Intervention Signals
                  </p>
                  <div className="mt-3 space-y-2">
                    {project.alerts && project.alerts.length > 0 ? (
                      project.alerts.map((alert) => (
                        <div
                          key={alert.code}
                          className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-sm"
                        >
                          <p className="font-semibold text-amber-900">
                            {alert.code.replace(/_/g, " ")}
                          </p>
                          <p className="mt-0.5 text-amber-700">{alert.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <p className="text-sm text-emerald-700">No active intervention signals.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Reporting Compliance
                  </p>
                  <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-4 text-sm">
                    {[
                      { label: "Frequency", value: project.reporting_frequency ?? "Not set" },
                      {
                        label: "Compliance State",
                        value: project.reporting_attention_reason
                          ? project.reporting_attention_reason.replace(/_/g, " ")
                          : "On track",
                        highlight: !!project.reporting_attention_reason,
                      },
                      { label: "Due", value: project.reporting_due_date ?? "—" },
                      { label: "Last Reported", value: project.last_reported_at ?? "—" },
                      {
                        label: "Days Overdue",
                        value: String(project.reporting_days_overdue ?? 0),
                        danger: (project.reporting_days_overdue ?? 0) > 0,
                      },
                    ].map(({ label, value, highlight, danger }) => (
                      <div key={label} className="flex justify-between gap-4">
                        <span className="text-slate-500">{label}</span>
                        <span
                          className={clsx(
                            "font-medium",
                            danger ? "text-red-700" : highlight ? "text-amber-700" : "text-slate-800",
                          )}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div>
            {assignmentsQuery.isLoading ? (
              <QueryStateCard
                state="loading"
                title="Loading project assignments"
                description="Resolving the active team mapped to this project."
              />
            ) : assignmentsQuery.isError ? (
              <QueryStateCard
                state="error"
                title="Assignments unavailable"
                description="InfraTrack could not load the assignment roster."
              />
            ) : (
              <ProjectAssignmentsPanel assignments={assignments} />
            )}
          </div>
        </div>
      )}

      {/* ── Milestones ────────────────────────────────────────────────── */}
      {activeTab === "milestones" &&
        (milestonesQuery.isLoading ? (
          <QueryStateCard
            state="loading"
            title="Loading milestone delivery plan"
            description="Pulling checkpoints, due dates, and approval state."
          />
        ) : milestonesQuery.isError ? (
          <QueryStateCard
            state="error"
            title="Milestones could not be loaded"
            description="The project timeline is temporarily unavailable."
          />
        ) : milestones.length === 0 ? (
          <QueryStateCard
            state="empty"
            title="No milestones configured"
            description="Add delivery checkpoints to start monitoring progress."
          />
        ) : (
          <div className="space-y-6">
            <ProjectTimeline milestones={milestones} />
            <MilestonesTable milestones={milestones} />
          </div>
        ))}

      {/* ── Evidence ──────────────────────────────────────────────────── */}
      {activeTab === "evidence" &&
        (evidenceQuery.isLoading ? (
          <QueryStateCard
            state="loading"
            title="Loading evidence submissions"
            description="Gathering field uploads, geo-validation, and verification state."
          />
        ) : evidenceQuery.isError ? (
          <QueryStateCard
            state="error"
            title="Evidence could not be loaded"
            description="The submission history is temporarily unavailable."
          />
        ) : evidenceItems.length === 0 ? (
          <QueryStateCard
            state="empty"
            title="No evidence submitted"
            description="Field uploads appear here once capture begins."
          />
        ) : (
          <div className="space-y-6">
            <ProjectEvidenceGallery items={evidenceItems} />
            <EvidenceTable items={evidenceItems} />
          </div>
        ))}

      {/* ── Finance ───────────────────────────────────────────────────── */}
      {activeTab === "finance" &&
        (tranchesQuery.isLoading ? (
          <QueryStateCard
            state="loading"
            title="Loading finance checkpoints"
            description="Pulling tranche readiness, lock state, and disbursement posture."
          />
        ) : tranchesQuery.isError ? (
          <QueryStateCard
            state="error"
            title="Finance data could not be loaded"
            description="The tranche queue is temporarily unavailable."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ProjectFinancePanel tranches={projectTranches} />
            <Card className="p-6">
              <h3 className="text-base font-semibold">Finance Summary</h3>
              <div className="mt-4 space-y-3">
                {[
                  {
                    label: "Total Tranches",
                    value: projectTranches.length,
                    variant: "default",
                  },
                  {
                    label: "Eligible",
                    value: projectTranches.filter((t) => t.current_status === "ELIGIBLE").length,
                    variant: "success",
                  },
                  {
                    label: "Disbursed",
                    value: projectTranches.filter((t) => t.current_status === "DISBURSED").length,
                    variant: "info",
                  },
                  {
                    label: "Locked",
                    value: projectTranches.filter((t) => t.current_status === "LOCKED").length,
                    variant: "danger",
                  },
                ].map(({ label, value, variant }) => {
                  const bgs: Record<string, string> = {
                    default: "bg-slate-50 border-slate-200",
                    success: "bg-emerald-50 border-emerald-100",
                    info: "bg-blue-50 border-blue-100",
                    danger: "bg-red-50 border-red-100",
                  };
                  const texts: Record<string, string> = {
                    default: "text-slate-900",
                    success: "text-emerald-700",
                    info: "text-blue-700",
                    danger: "text-red-700",
                  };
                  return (
                    <div
                      key={label}
                      className={clsx(
                        "flex items-center justify-between rounded-lg border px-4 py-3",
                        bgs[variant],
                      )}
                    >
                      <span className="text-sm text-slate-600">{label}</span>
                      <span className={clsx("text-lg font-bold tabular-nums", texts[variant])}>
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        ))}

      {/* ── Risk & Flags ──────────────────────────────────────────────── */}
      {activeTab === "risk" &&
        (geoFenceExceptionsQuery.isLoading ||
        fraudFlagsQuery.isLoading ||
        evidenceQuery.isLoading ? (
          <QueryStateCard
            state="loading"
            title="Loading project risk posture"
            description="Reviewing exceptions, fraud indicators, and evidence exposure."
          />
        ) : geoFenceExceptionsQuery.isError ||
          fraudFlagsQuery.isError ||
          evidenceQuery.isError ? (
          <QueryStateCard
            state="error"
            title="Risk insight could not be loaded"
            description="One or more risk signals are temporarily unavailable."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="p-6">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <ShieldAlert size={16} className="text-slate-400" />
                Risk Summary
              </h3>

              {/* Risk level chip */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Project Risk Status
                  </p>
                  <div className="mt-2">
                    <RiskChip risk={project.risk_status} />
                  </div>
                </div>
                {project.requires_independent_validation && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center">
                    <p className="text-xs font-semibold text-amber-800">Ind. Validation</p>
                    <p className="text-xs text-amber-600">Required</p>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2.5 text-sm">
                {[
                  {
                    label: "Open Fraud Flags",
                    value: openFraudFlagCount,
                    danger: openFraudFlagCount > 0,
                  },
                  {
                    label: "Evidence Items",
                    value: evidenceItems.length,
                    danger: false,
                  },
                  {
                    label: "Geo-Fence Exceptions Pending",
                    value: pendingGeoFenceExceptions.length,
                    danger: pendingGeoFenceExceptions.length > 0,
                  },
                ].map(({ label, value, danger }) => (
                  <div
                    key={label}
                    className={clsx(
                      "flex items-center justify-between rounded-lg border px-4 py-2.5",
                      danger
                        ? "border-red-100 bg-red-50"
                        : "border-slate-100 bg-slate-50",
                    )}
                  >
                    <span className={danger ? "text-red-700" : "text-slate-600"}>
                      {label}
                    </span>
                    <span
                      className={clsx(
                        "text-base font-bold tabular-nums",
                        danger ? "text-red-700" : "text-slate-900",
                      )}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <GeoFenceExceptionsPanel
              items={geoFenceExceptions}
              canReview={canReviewGeoFenceExceptions}
              loading={geoFenceExceptionsQuery.isLoading}
            />

            <div className="xl:col-span-2">
              <FraudFlagsTable items={projectFraudFlags} canResolve={canResolveFraudFlags} />
            </div>
          </div>
        ))}
    </PageShell>
  );
}
