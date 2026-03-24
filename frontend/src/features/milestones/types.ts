export type MilestoneChecklistItem = {
  id: number;
  title: string;
  description: string;
  is_required: boolean;
  max_score: number;
  sort_order: number;
};

export type ProjectMilestone = {
  id: number;
  project: number;
  name: string;
  description: string;
  sequence_order: number;
  expected_evidence_type: string;
  required_evidence_count: number;
  required_video_count: number;
  qa_required: boolean;
  requires_field_validation: boolean;
  required_checklist_score: number;
  target_date: string | null;
  due_date: string;
  completed_date: string | null;
  current_status: string;
  checklist_items: MilestoneChecklistItem[];
};