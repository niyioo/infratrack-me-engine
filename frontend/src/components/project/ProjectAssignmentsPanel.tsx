import type { ProjectAssignment } from "@/features/projects/types";
import { Card } from "@/components/ui/Card";

export function ProjectAssignmentsPanel({ assignments }: { assignments: ProjectAssignment[] }) {
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold">Assignments</h3>
      <div className="mt-4 space-y-3">
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">No assignments found.</p>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium">{assignment.user_name}</p>
              <p className="text-xs text-slate-500">{assignment.assignment_role}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}