import { Card } from "@/components/ui/Card";
import { QueryStateCard } from "@/components/ui/QueryStateCard";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/app/layouts/PageShell";
import { useAuditEvents, useSuspiciousActivities } from "@/features/audits/hooks";
import { formatDate } from "@/lib/utils/format";
import { useState } from "react";

function jsonPreview(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return "No additional metadata";
  }
  return JSON.stringify(value).slice(0, 180);
}

export function AuditTrailPage() {
  const [auditPage, setAuditPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const auditQuery = useAuditEvents({ page: auditPage, page_size: 12 });
  const suspiciousQuery = useSuspiciousActivities({ page: activityPage, page_size: 12 });

  const auditEvents = auditQuery.data?.items ?? [];
  const suspiciousActivities = suspiciousQuery.data?.items ?? [];

  return (
    <PageShell
      title="Audit Trail"
      description="Traceability across evidence, reviews, status changes, disbursements, and suspicious activity."
    >
      {auditQuery.isLoading || suspiciousQuery.isLoading ? (
        <QueryStateCard
          state="loading"
          title="Loading audit records"
          description="Preparing entity history, actor traceability, and suspicious activity signals."
        />
      ) : auditQuery.isError || suspiciousQuery.isError ? (
        <QueryStateCard
          state="error"
          title="Audit trail unavailable"
          description="Audit events or suspicious activity records could not be loaded right now."
        />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="p-5">
              <p className="text-sm text-slate-500">Audit Events</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{auditQuery.data?.count ?? 0}</p>
              <p className="mt-1 text-sm text-slate-500">Current visible audit entries for this account.</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-slate-500">Suspicious Activities</p>
              <p className="mt-2 text-3xl font-semibold text-red-700">{suspiciousQuery.data?.count ?? 0}</p>
              <p className="mt-1 text-sm text-slate-500">Open or historical integrity and activity anomalies.</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-slate-500">Latest Audit Event</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{auditEvents[0]?.event_type ?? "No events"}</p>
              <p className="mt-1 text-sm text-slate-500">{formatDate(auditEvents[0]?.created_at)}</p>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="p-6">
              <h3 className="text-base font-semibold">Recent Audit Events</h3>
              <div className="mt-4 space-y-3">
                {auditEvents.length > 0 ? (
                  auditEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">{event.event_type}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {event.actor_name || "System"} · {event.actor_role || "No role context"}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {formatDate(event.created_at)}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <p>
                          <span className="font-medium text-slate-800">Object:</span> {event.object_type} #{event.object_id}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Project:</span> {event.project_title || "N/A"}
                        </p>
                        <p className="break-all">
                          <span className="font-medium text-slate-800">Metadata:</span> {jsonPreview(event.metadata_json)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <QueryStateCard
                    state="empty"
                    title="No audit events"
                    description="Audited actions will appear here as monitored workflows progress."
                  />
                )}
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <Button type="button" className="bg-white text-slate-900 border border-slate-300" disabled={!auditQuery.data?.previous} onClick={() => setAuditPage((current) => Math.max(1, current - 1))}>
                  Previous
                </Button>
                <Button type="button" disabled={!auditQuery.data?.next} onClick={() => setAuditPage((current) => current + 1)}>
                  Next
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-base font-semibold">Suspicious Activity</h3>
              <div className="mt-4 space-y-3">
                {suspiciousActivities.length > 0 ? (
                  suspiciousActivities.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900">{item.activity_type}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {item.project_title || "Project not linked"} · {item.user_name || "Unknown user"}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {item.severity}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <p>Status: {item.status}</p>
                        <p className="break-all">Details: {jsonPreview(item.details_json)}</p>
                        <p>Recorded: {formatDate(item.created_at)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <QueryStateCard
                    state="empty"
                    title="No suspicious activity"
                    description="Integrity and behavior anomalies will appear here when the platform flags them."
                  />
                )}
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <Button type="button" className="bg-white text-slate-900 border border-slate-300" disabled={!suspiciousQuery.data?.previous} onClick={() => setActivityPage((current) => Math.max(1, current - 1))}>
                  Previous
                </Button>
                <Button type="button" disabled={!suspiciousQuery.data?.next} onClick={() => setActivityPage((current) => current + 1)}>
                  Next
                </Button>
              </div>
            </Card>
          </section>
        </>
      )}
    </PageShell>
  );
}
