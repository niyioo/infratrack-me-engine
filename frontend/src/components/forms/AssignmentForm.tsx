import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

export function AssignmentForm({ onSubmit }: { onSubmit: (payload: { user_id: number; assignment_role: string }) => void }) {
  const [userId, setUserId] = useState(0);
  const [assignmentRole, setAssignmentRole] = useState("FIELD_OFFICER");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ user_id: userId, assignment_role: assignmentRole });
      }}
    >
      <Input type="number" placeholder="User ID" value={userId} onChange={(e) => setUserId(Number(e.target.value))} />
      <Select value={assignmentRole} onChange={(e) => setAssignmentRole(e.target.value)}>
        <option value="FIELD_OFFICER">Field Officer</option>
        <option value="QA_OFFICER">QA Officer</option>
        <option value="FINANCE_OFFICER">Finance Officer</option>
        <option value="M_E_OFFICER">M&E Officer</option>
      </Select>
      <Button type="submit">Assign User</Button>
    </form>
  );
}