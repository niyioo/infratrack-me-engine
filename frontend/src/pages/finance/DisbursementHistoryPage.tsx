import { Card } from "@/components/ui/Card";

export function DisbursementHistoryPage() {
  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold">Disbursement History</h1>
      <p className="mt-3 text-sm text-slate-500">
        This page will show tranche disbursement history, payment references, and audit-linked release actions.
      </p>
    </Card>
  );
}