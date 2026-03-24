export type AuditEvent = {
  id: number;
  event_type: string;
  actor_role: string;
  object_type: string;
  object_id: string;
  action: string;
  created_at: string;
};

export type SuspiciousActivity = {
  id: number;
  activity_type: string;
  severity: string;
  status: string;
  created_at: string;
};