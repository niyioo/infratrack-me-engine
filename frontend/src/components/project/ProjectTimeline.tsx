import type { ProjectMilestone } from "@/features/milestones/types";
import { MilestoneStatusBadge } from "@/components/status/MilestoneStatusBadge";

export function ProjectTimeline({ milestones }: { milestones: ProjectMilestone[] }) {
  return (
    <div className="space-y-4">
      {milestones.map((milestone) => (
        <div key={milestone.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">{milestone.sequence_order}. {milestone.name}</p>
              <p className="mt-1 text-sm text-slate-500">{milestone.description}</p>
              <p className="mt-2 text-xs text-slate-500">Due: {milestone.due_date}</p>
            </div>
            <MilestoneStatusBadge status={milestone.current_status} />
          </div>
        </div>
      ))}
    </div>
  );
}