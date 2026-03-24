import type { ProjectMilestone } from "@/features/milestones/types";
import { Table } from "@/components/ui/Table";
import { MilestoneStatusBadge } from "@/components/status/MilestoneStatusBadge";

export function MilestonesTable({ milestones }: { milestones: ProjectMilestone[] }) {
  return (
    <Table title="Milestones">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-5 py-3">Milestone</th>
            <th className="px-5 py-3">Sequence</th>
            <th className="px-5 py-3">Due Date</th>
            <th className="px-5 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {milestones.map((m) => (
            <tr key={m.id} className="border-t border-slate-100">
              <td className="px-5 py-4">{m.name}</td>
              <td className="px-5 py-4">{m.sequence_order}</td>
              <td className="px-5 py-4">{m.due_date}</td>
              <td className="px-5 py-4"><MilestoneStatusBadge status={m.current_status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Table>
  );
}