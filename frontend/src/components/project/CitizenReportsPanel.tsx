import { Link } from "react-router-dom";
import clsx from "clsx";
import { ChevronRight, Megaphone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ProjectCitizenReportSummary } from "@/features/projects/types";
import { formatDate } from "@/lib/utils/format";

const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  UNDER_REVIEW: "Under review",
  FIELD_VISIT_REQUESTED: "Field visit",
};

/**
 * Citizen-report signals for one project. Shows how close the project is to the
 * automatic risk escalation, which counts *distinct* anonymous reporters.
 */
export function CitizenReportsPanel({ summary }: { summary: ProjectCitizenReportSummary }) {
  const reporters = summary.distinct_concern_reporters;
  const nextThreshold =
    reporters < summary.high_threshold
      ? { value: summary.high_threshold, label: "HIGH" }
      : reporters < summary.critical_threshold
        ? { value: summary.critical_threshold, label: "CRITICAL" }
        : null;
  const progress = Math.min(100, (reporters / summary.critical_threshold) * 100);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Megaphone size={16} className="text-amber-600" />
          <h3 className="text-base font-semibold text-slate-900">Citizen Reports</h3>
        </div>
        <Link
          to="/citizen-reports"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          Triage queue <ChevronRight size={14} />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Open", value: summary.open, tone: summary.open > 0 ? "text-amber-700" : "text-slate-900" },
          { label: "Escalated", value: summary.escalated, tone: summary.escalated > 0 ? "text-red-700" : "text-slate-900" },
          { label: "All time", value: summary.total, tone: "text-slate-900" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-slate-50 px-3 py-2.5">
            <p className={clsx("text-xl font-bold tabular-nums", stat.tone)}>{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-medium text-slate-600">
            {reporters} distinct reporter{reporters === 1 ? "" : "s"} raising concerns · last {summary.window_days} days
          </span>
          <span className="text-slate-400">
            {nextThreshold ? `${nextThreshold.value} raises risk to ${nextThreshold.label}` : "Risk raised to CRITICAL"}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={clsx(
              "h-full rounded-full",
              reporters >= summary.critical_threshold
                ? "bg-red-500"
                : reporters >= summary.high_threshold
                  ? "bg-orange-500"
                  : "bg-amber-400",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {summary.recent_open.length > 0 ? (
        <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
          {summary.recent_open.map((report) => (
            <li key={report.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">{report.category_label}</p>
                <p className="font-mono text-xs text-slate-400">{report.tracking_code}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold text-slate-600">{STATUS_LABEL[report.status] ?? report.status}</p>
                <p className="text-xs text-slate-400">{formatDate(report.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">No open citizen reports.</p>
      )}
    </Card>
  );
}
