export function MilestoneReviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Milestone Review Queue</h1>
        <p className="text-sm text-slate-500">QA approvals, rework, and fraud flagging</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">
          This page will combine evidence submissions, milestone checklist scoring,
          metadata inspection, and QA decisions.
        </p>
      </div>
    </div>
  );
}