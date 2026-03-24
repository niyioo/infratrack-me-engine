import type { FundingTranche } from "@/features/finance/types";
import { Card } from "@/components/ui/Card";
import { TrancheStatusBadge } from "@/components/status/TrancheStatusBadge";

export function ProjectFinancePanel({ tranches }: { tranches: FundingTranche[] }) {
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold">Finance Panel</h3>
      <div className="mt-4 space-y-3">
        {tranches.length === 0 ? (
          <p className="text-sm text-slate-500">No tranches configured.</p>
        ) : (
          tranches.map((tranche) => (
            <div key={tranche.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{tranche.tranche_name}</p>
                  <p className="text-xs text-slate-500">₦{Number(tranche.planned_amount).toLocaleString()}</p>
                </div>
                <TrancheStatusBadge status={tranche.current_status} />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}