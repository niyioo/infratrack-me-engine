import { Card } from "@/components/ui/Card";

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-slate-500">Portfolio performance, risk, and variance insights</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-base font-semibold">Burn Rate vs Physical Completion</h3>
          <p className="mt-3 text-sm text-slate-500">
            This section will visualize financial disbursement percentage against verified milestone completion percentage.
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-semibold">Risk Concentration</h3>
          <p className="mt-3 text-sm text-slate-500">
            This section will summarize high-risk projects, flagged contractors, and unresolved fraud events.
          </p>
        </Card>
      </div>
    </div>
  );
}