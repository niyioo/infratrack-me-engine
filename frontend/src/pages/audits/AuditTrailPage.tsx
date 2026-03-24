import { Card } from "@/components/ui/Card";

export function AuditTrailPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Audit Trail</h1>
        <p className="text-sm text-slate-500">Traceability across evidence, reviews, status changes, and disbursements</p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-slate-500">
          This page will render audit events, suspicious activity logs, and future override history with filter controls.
        </p>
      </Card>
    </div>
  );
}