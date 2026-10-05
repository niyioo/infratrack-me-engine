import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { QueryStateCard } from "@/components/ui/QueryStateCard";
import { PageShell } from "@/app/layouts/PageShell";
import { useDashboardSummary } from "@/features/dashboard/hooks";
import { useDispatchReportingReminder } from "@/features/projects/hooks";
import { formatDate } from "@/lib/utils/format";

function prettyLabel(value: string) {
  return value.replace(/_/g, " ");
}

function toneClasses(level: string) {
  if (level === "CRITICAL") return "bg-red-50 text-red-700 border-red-200";
  if (level === "HIGH") return "bg-amber-50 text-amber-700 border-amber-200";
  if (level === "MEDIUM") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function InterventionQueuePage() {
  const { data: summary, isLoading, isError } = useDashboardSummary();
  const dispatchReminder = useDispatchReportingReminder();

  if (isLoading) {
    return (
      <PageShell title="Interventions" description="Loading worklist intelligence...">
        <QueryStateCard
          state="loading"
          title="Loading intervention worklist"
          description="Preparing at-risk projects and reporting reminders."
        />
      </PageShell>
    );
  }

  if (isError || !summary) {
    return (
      <PageShell title="Interventions" description="Operational worklist">
        <QueryStateCard
          state="error"
          title="Intervention worklist unavailable"
          description="ProveTrack could not load the intervention and compliance queues right now."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Interventions"
      description="Portfolio worklist for at-risk delivery, verification blockers, and reporting compliance."
    >
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-900">Intervention Queue</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.intervention_queue.length}</p>
          <p className="mt-1 text-sm text-slate-500">Projects needing operational follow-up now.</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-900">Compliance Queue</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.compliance_queue.length}</p>
          <p className="mt-1 text-sm text-slate-500">Projects with overdue or near-due reporting cadence.</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-900">Geo Exceptions Pending</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.alert_summary.geofence_exceptions_pending}</p>
          <p className="mt-1 text-sm text-slate-500">Field exceptions waiting for formal review.</p>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Operational Intervention Queue</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ranked by flag state, risk, delay, and verification blockers.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {summary.intervention_queue.length > 0 ? (
              summary.intervention_queue.map((item) => (
                <div key={`${item.id}-${item.attention_reason}`} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {item.project_code} · {item.state}, {item.lga}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses(item.attention_level)}`}>
                      {prettyLabel(item.attention_level)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase text-slate-500">Action Signal</p>
                      <p className="mt-1 font-medium text-slate-900">{prettyLabel(item.attention_reason)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500">Expected End Date</p>
                      <p className="mt-1 font-medium text-slate-900">{formatDate(item.expected_end_date)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      Status: <span className="font-medium text-slate-900">{prettyLabel(item.current_status)}</span>
                    </p>
                    <Link className="text-sm font-medium text-brand" to={`/projects/${item.id}`}>
                      Open Project
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <QueryStateCard
                state="empty"
                title="No active intervention queue"
                description="Flagged, delayed, and high-risk projects will appear here when escalation is needed."
              />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-slate-900">Reporting Compliance Queue</h2>
          <p className="mt-1 text-sm text-slate-500">
            Reporting cadence reminders derived from project frequency and latest evidence activity.
          </p>

          <div className="mt-5 space-y-4">
            {summary.compliance_queue.length > 0 ? (
              summary.compliance_queue.map((item) => (
                <div key={`${item.id}-${item.attention_reason}`} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {item.project_code} · {prettyLabel(item.reporting_frequency || "AD_HOC")}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses(item.attention_level)}`}>
                      {prettyLabel(item.attention_reason)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase text-slate-500">Reporting Due</p>
                      <p className="mt-1 font-medium text-slate-900">{formatDate(item.reporting_due_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500">Last Reported</p>
                      <p className="mt-1 font-medium text-slate-900">{formatDate(item.last_reported_at)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      {item.days_overdue > 0
                        ? `${item.days_overdue} day(s) overdue`
                        : "Due soon"}
                    </p>
                    <div className="flex items-center gap-3">
                      <Button type="button" disabled={dispatchReminder.isPending} onClick={() => dispatchReminder.mutate(String(item.id))}>
                        Send Reminder
                      </Button>
                      <Link className="text-sm font-medium text-brand" to={`/projects/${item.id}`}>
                        Open Project
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <QueryStateCard
                state="empty"
                title="No reporting reminders"
                description="Projects approaching or missing reporting cadence will appear here."
              />
            )}
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
