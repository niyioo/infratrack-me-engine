export type ProjectMilestone = {
  id: number;
  project: number;
  name: string;
  description: string;
  sequence_order: number;
  due_date: string;
  current_status: string;
  required_evidence_count: number;
};