import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function MilestoneForm({ onSubmit }: { onSubmit: (payload: Record<string, unknown>) => void }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    sequence_order: 1,
    due_date: "",
    required_evidence_count: 1
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <Input placeholder="Milestone Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <Input type="number" placeholder="Sequence" value={form.sequence_order} onChange={(e) => setForm({ ...form, sequence_order: Number(e.target.value) })} />
      <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
      <Input type="number" placeholder="Required Evidence Count" value={form.required_evidence_count} onChange={(e) => setForm({ ...form, required_evidence_count: Number(e.target.value) })} />
      <Button type="submit">Save Milestone</Button>
    </form>
  );
}