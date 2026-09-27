export type AuditEvent = {
  id: number;
  event_type: string;
  actor_name: string;
  actor_role: string;
  project: number | null;
  project_code: string;
  project_title: string;
  milestone: number | null;
  milestone_name: string;
  tranche: number | null;
  tranche_name: string;
  object_type: string;
  object_id: string;
  action: string;
  before_state_json: Record<string, unknown> | null;
  after_state_json: Record<string, unknown> | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

export type SuspiciousActivity = {
  id: number;
  project: number | null;
  project_code: string;
  project_title: string;
  user: number | null;
  user_name: string;
  activity_type: string;
  severity: string;
  status: string;
  details_json: Record<string, unknown>;
  created_at: string;
};
