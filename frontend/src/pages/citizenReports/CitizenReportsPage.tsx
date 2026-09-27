import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import clsx from "clsx";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Eye,
  Flag,
  ImageOff,
  MapPin,
  MapPinned,
  MessageSquareText,
  Repeat,
  ShieldAlert,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import { PageShell } from "@/app/layouts/PageShell";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { QueryStateCard } from "@/components/ui/QueryStateCard";
import { useCitizenReports, useTriageCitizenReport } from "@/features/citizenReports/hooks";
import type { CitizenReport, CitizenReportStatus } from "@/features/citizenReports/types";
import { formatDate } from "@/lib/utils/format";

// ─── config ───────────────────────────────────────────────────────────────────
const TABS = [
  { key: "open", label: "Open", statuses: ["NEW", "UNDER_REVIEW", "FIELD_VISIT_REQUESTED"] },
  { key: "escalated", label: "Escalated", statuses: ["ESCALATED"] },
  { key: "closed", label: "Closed", statuses: ["RESOLVED", "DISMISSED"] },
] as const;

const STATUS_BADGE: Record<CitizenReportStatus, { label: string; classes: string }> = {
  NEW: { label: "New", classes: "bg-blue-50 text-blue-700 border-blue-200" },
  UNDER_REVIEW: { label: "Under review", classes: "bg-slate-50 text-slate-700 border-slate-200" },
  FIELD_VISIT_REQUESTED: { label: "Field visit", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  ESCALATED: { label: "Escalated", classes: "bg-red-50 text-red-700 border-red-200" },
  RESOLVED: { label: "Resolved", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DISMISSED: { label: "Dismissed", classes: "bg-slate-50 text-slate-500 border-slate-200" },
};

const ACTIONS: {
  status: CitizenReportStatus;
  label: string;
  icon: React.ElementType;
  classes: string;
  requiresNote?: boolean;
}[] = [
  {
    status: "UNDER_REVIEW",
    label: "Mark under review",
    icon: Eye,
    classes: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  },
  {
    status: "FIELD_VISIT_REQUESTED",
    label: "Request field visit",
    icon: MapPinned,
    classes: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
  {
    status: "RESOLVED",
    label: "Resolve",
    icon: CheckCircle2,
    classes: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
  {
    status: "DISMISSED",
    label: "Dismiss",
    icon: XCircle,
    classes: "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
    requiresNote: true,
  },
  {
    status: "ESCALATED",
    label: "Escalate to fraud flag",
    icon: Flag,
    classes: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    requiresNote: true,
  },
];

const RISK_CHIP: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  LOW: "bg-emerald-100 text-emerald-800",
};

function extractApiError(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as Record<string, unknown> | undefined;
  if (!data) return fallback;
  if (typeof data.detail === "string") return data.detail;
  const first = Object.values(data).flat()[0];
  return typeof first === "string" ? first : fallback;
}

function StatusBadge({ status }: { status: CitizenReportStatus }) {
  const cfg = STATUS_BADGE[status];
  return (
    <span className={clsx("rounded-full border px-2.5 py-0.5 text-xs font-semibold", cfg.classes)}>{cfg.label}</span>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────
export function CitizenReportsPage() {
  const { data: reports = [], isLoading, isError } = useCitizenReports();
  const triage = useTriageCitizenReport();

  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("open");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [publicResponse, setPublicResponse] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((t) => [t.key, reports.filter((r) => (t.statuses as readonly string[]).includes(r.status)).length])
      ) as Record<(typeof TABS)[number]["key"], number>,
    [reports]
  );

  const visible = useMemo(() => {
    const statuses = TABS.find((t) => t.key === tab)!.statuses as readonly string[];
    return reports.filter((r) => statuses.includes(r.status));
  }, [reports, tab]);

  const selected: CitizenReport | null = visible.find((r) => r.id === selectedId) ?? visible[0] ?? null;
  const isClosed = selected ? selected.status === "RESOLVED" || selected.status === "DISMISSED" : false;

  function select(id: number) {
    setSelectedId(id);
    setNote("");
    setPublicResponse("");
    setFeedback(null);
  }

  async function handleAction(status: CitizenReportStatus) {
    if (!selected) return;
    setFeedback(null);
    try {
      await triage.mutateAsync({
        reportId: selected.id,
        payload: { status, note, public_response: publicResponse },
      });
      setNote("");
      setPublicResponse("");
      setFeedback({
        message:
          status === "ESCALATED"
            ? "Report escalated. A fraud flag now blocks tranche release for this project."
            : "Report updated.",
        variant: "success",
      });
    } catch (error) {
      setFeedback({ message: extractApiError(error, "The report could not be updated."), variant: "error" });
    }
  }

  const shell = (children: React.ReactNode) => (
    <PageShell
      title="Citizen Reports"
      description="Anonymous reports from the public portal. Triage, request field visits, and escalate confirmed problems."
    >
      {children}
    </PageShell>
  );

  if (isLoading) {
    return shell(<QueryStateCard state="loading" title="Loading citizen reports" description="Fetching the triage queue." />);
  }
  if (isError) {
    return shell(
      <QueryStateCard state="error" title="Citizen reports unavailable" description="The triage queue could not be loaded." />
    );
  }

  return shell(
    <>
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setSelectedId(null);
              setFeedback(null);
            }}
            className={clsx(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none",
              tab === t.key ? "bg-brand text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            {t.label}
            <span
              className={clsx(
                "rounded-full px-2 py-0.5 text-xs",
                tab === t.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              )}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <QueryStateCard
          state="empty"
          title={tab === "open" ? "No open citizen reports" : `No ${tab} reports`}
          description="New reports from the public portal will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.2fr]">
          {/* ── Queue ─────────────────────────────────────────── */}
          <div className="space-y-3">
            {visible.map((report) => {
              const active = report.id === selected?.id;
              const positive = report.category === "PROGRESS_UPDATE";
              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => select(report.id)}
                  className={clsx(
                    "group w-full rounded-xl border p-4 text-left transition-all",
                    active ? "border-brand bg-brand-soft shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                        {positive ? (
                          <ThumbsUp size={14} className="shrink-0 text-emerald-600" />
                        ) : (
                          <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                        )}
                        <span className="truncate">{report.category_label}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs font-medium uppercase tracking-wide text-slate-400">
                        {report.project_code} · {report.project_title}
                      </p>
                    </div>
                    <ChevronRight
                      size={15}
                      className={clsx("mt-0.5 shrink-0", active ? "text-brand" : "text-slate-300 group-hover:text-slate-400")}
                    />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{report.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={report.status} />
                    <span className="text-xs text-slate-400">{formatDate(report.created_at)}</span>
                    {report.photo && <span className="text-xs font-medium text-slate-500">· Photo</span>}
                    {(report.same_source_count ?? 0) > 1 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                        <Repeat size={11} /> {report.same_source_count} from same source
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Detail ────────────────────────────────────────── */}
          <div className="space-y-4">
            {feedback && <Alert variant={feedback.variant} message={feedback.message} />}

            {selected ? (
              <>
                <Card className="overflow-hidden p-0">
                  {selected.photo ? (
                    <a href={selected.photo} target="_blank" rel="noreferrer">
                      <img
                        src={selected.photo}
                        alt="Citizen-submitted site photo"
                        className="max-h-80 w-full bg-slate-100 object-contain"
                      />
                    </a>
                  ) : (
                    <div className="flex h-24 items-center justify-center gap-2 bg-slate-50 text-sm text-slate-400">
                      <ImageOff size={16} /> No photo submitted
                    </div>
                  )}

                  <div className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs font-semibold tracking-wider text-slate-400">
                          {selected.tracking_code}
                        </p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{selected.category_label}</p>
                      </div>
                      <StatusBadge status={selected.status} />
                    </div>

                    <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{selected.description}</p>

                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <Link
                        to={`/projects/${selected.project}`}
                        className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5 hover:bg-slate-100"
                      >
                        <span className="min-w-0 truncate font-medium text-slate-800">{selected.project_title}</span>
                        <span
                          className={clsx(
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                            RISK_CHIP[selected.project_risk_status] ?? "bg-slate-100 text-slate-700"
                          )}
                        >
                          {selected.project_risk_status}
                        </span>
                      </Link>
                      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        Observed {selected.observed_on ? formatDate(selected.observed_on) : "—"}
                      </div>
                      {selected.latitude != null && selected.longitude != null && (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=17/${selected.latitude}/${selected.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-slate-600 hover:bg-slate-100 sm:col-span-2"
                        >
                          <MapPin size={14} className="text-slate-400" />
                          Reported from {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
                        </a>
                      )}
                    </div>

                    {(selected.same_source_count ?? 0) > 1 && (
                      <p className="flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs leading-5 text-violet-800">
                        <Repeat size={14} className="mt-0.5 shrink-0" />
                        The same anonymous source has sent {selected.same_source_count} reports about this project. Only
                        distinct sources count towards automatic risk escalation.
                      </p>
                    )}
                  </div>
                </Card>

                {isClosed || selected.status === "ESCALATED" ? (
                  <Card className="space-y-3 p-5 text-sm">
                    <p className="font-semibold text-slate-700">Triage record</p>
                    <p className="text-slate-600">
                      {STATUS_BADGE[selected.status].label} by {selected.triaged_by_name ?? "—"}
                      {selected.triaged_at ? ` on ${formatDate(selected.triaged_at)}` : ""}
                    </p>
                    {selected.triage_note && (
                      <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-slate-700">{selected.triage_note}</p>
                    )}
                    {selected.fraud_flag && (
                      <p className="flex items-center gap-2 text-red-700">
                        <ShieldAlert size={14} /> Fraud flag #{selected.fraud_flag} is blocking tranche release.
                      </p>
                    )}
                  </Card>
                ) : null}

                {!isClosed && (
                  <Card className="space-y-4 p-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Internal note
                        <span className="ml-1 font-normal text-slate-400">(required to dismiss or escalate)</span>
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        placeholder="What did you verify? Visible to staff and the audit trail only."
                        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <MessageSquareText size={14} className="text-slate-400" />
                        Response to citizen
                        <span className="font-normal text-slate-400">(optional, shown on their tracking page)</span>
                      </label>
                      <textarea
                        value={publicResponse}
                        onChange={(e) => setPublicResponse(e.target.value)}
                        rows={2}
                        maxLength={1000}
                        placeholder="e.g. Thank you. An officer will visit the site this week."
                        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {ACTIONS.filter((a) => a.status !== selected.status).map(
                        ({ status, label, icon: Icon, classes, requiresNote }) => {
                          const blocked = requiresNote && !note.trim();
                          return (
                            <button
                              key={status}
                              type="button"
                              disabled={triage.isPending || blocked}
                              title={blocked ? "Add an internal note first" : undefined}
                              onClick={() => handleAction(status)}
                              className={clsx(
                                "flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                                classes,
                                status === "ESCALATED" && "sm:col-span-2"
                              )}
                            >
                              <Icon size={15} />
                              {label}
                            </button>
                          );
                        }
                      )}
                    </div>
                    <p className="flex items-start gap-1.5 text-xs text-slate-400">
                      <AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-400" />
                      Escalating creates a HIGH-severity fraud flag that blocks tranche release until it is resolved.
                    </p>
                  </Card>
                )}
              </>
            ) : (
              <Card className="flex h-64 items-center justify-center p-6">
                <EmptyState title="No report selected" description="Choose a report from the queue." />
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}
