import { Card } from "@/components/ui/Card";
import { QueryStateCard } from "@/components/ui/QueryStateCard";
import { PageShell } from "@/app/layouts/PageShell";
import { usePortfolioBreakdown, usePortfolioTrends } from "@/features/analytics/hooks";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export function AnalyticsPage() {
  const breakdownQuery = usePortfolioBreakdown();
  const trendsQuery = usePortfolioTrends(30);

  const breakdown = breakdownQuery.data ?? [];
  const trends = trendsQuery.data ?? [];
  const latestTrend = trends[trends.length - 1];
  const firstTrend = trends[0];

  return (
    <PageShell
      title="Analytics"
      description="Portfolio performance, state-level concentration, and trend intelligence for executive decision support."
    >
      {breakdownQuery.isLoading || trendsQuery.isLoading ? (
        <QueryStateCard
          state="loading"
          title="Loading portfolio analytics"
          description="Preparing executive metrics, geographic breakdowns, and recent portfolio trends."
        />
      ) : breakdownQuery.isError || trendsQuery.isError ? (
        <QueryStateCard
          state="error"
          title="Analytics unavailable"
          description="Portfolio analytics could not be loaded right now."
        />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="p-5">
              <p className="text-sm text-slate-500">Latest Trend Snapshot</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatDate(latestTrend?.snapshot_date)}</p>
              <p className="mt-1 text-sm text-slate-500">Current reporting point for the trend series.</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-slate-500">Total Budget</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatCurrency(latestTrend?.total_budget ?? 0)}
              </p>
              <p className="mt-1 text-sm text-slate-500">Budget monitored in the latest global snapshot.</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-slate-500">Flagged Projects</p>
              <p className="mt-2 text-2xl font-semibold text-red-700">{latestTrend?.flagged_projects_count ?? 0}</p>
              <p className="mt-1 text-sm text-slate-500">Projects requiring escalation in the latest snapshot.</p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-slate-500">30-Day Delta</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {(latestTrend?.total_projects ?? 0) - (firstTrend?.total_projects ?? 0)}
              </p>
              <p className="mt-1 text-sm text-slate-500">Net change in total projects across the visible trend window.</p>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="p-6">
              <h3 className="text-base font-semibold">State Portfolio Breakdown</h3>
              <p className="mt-1 text-sm text-slate-500">
                Latest available state-level counts for active, delayed, and flagged projects.
              </p>

              <div className="mt-4 space-y-3">
                {breakdown.map((snapshot) => (
                  <div key={`${snapshot.state}-${snapshot.snapshot_date}`} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-900">{snapshot.state}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {snapshot.total_projects} projects · {formatCurrency(snapshot.total_budget)}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {snapshot.active_projects} active
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-slate-600">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-slate-500">Delayed</p>
                        <p className="mt-1 font-semibold text-amber-700">{snapshot.delayed_projects_count}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-slate-500">Flagged</p>
                        <p className="mt-1 font-semibold text-red-700">{snapshot.flagged_projects_count}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-slate-500">High Risk</p>
                        <p className="mt-1 font-semibold text-slate-900">{snapshot.high_risk_projects_count}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-base font-semibold">Global Trend Timeline</h3>
              <p className="mt-1 text-sm text-slate-500">
                Snapshot-by-snapshot movement across flagged, delayed, and verification-sensitive projects.
              </p>

              <div className="mt-4 space-y-3">
                {trends.map((snapshot) => (
                  <div key={snapshot.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-900">{formatDate(snapshot.snapshot_date)}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {snapshot.total_projects} projects · {snapshot.completed_projects_count} completed
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {snapshot.awaiting_verification_count} awaiting verification
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-slate-600">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-slate-500">Delayed Milestones</p>
                        <p className="mt-1 font-semibold text-amber-700">{snapshot.delayed_milestones_count}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-slate-500">Fraud Flags</p>
                        <p className="mt-1 font-semibold text-red-700">{snapshot.unresolved_fraud_flags_count}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-slate-500">Geo Exceptions</p>
                        <p className="mt-1 font-semibold text-blue-700">{snapshot.geofence_exceptions_pending_count}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </>
      )}
    </PageShell>
  );
}
