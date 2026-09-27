import type { ProjectMetricSnapshot } from "@/features/analytics/types";

export type DashboardProjectSummary = {
  id: number;
  project_code: string;
  title: string;
  state: string;
  lga: string;
  site_address: string;
  current_status: string;
  risk_status: string;
  lifecycle_stage: string;
  budget_amount: string;
  requires_independent_validation: boolean;
  expected_end_date: string | null;
  created_at: string;
};

export type DashboardMapProject = DashboardProjectSummary & {
  latitude: number | null;
  longitude: number | null;
};

export type DashboardInterventionProject = DashboardProjectSummary & {
  attention_reason: string;
  attention_level: string;
  reporting_frequency: string;
  reporting_due_date: string | null;
  last_reported_at: string | null;
  days_overdue: number;
};

export type DashboardSummary = {
  total_projects: number;
  active_projects: number;
  flagged_projects_count: number;
  delayed_projects_count: number;
  total_budget: string;
  awaiting_verification_count: number;
  completed_projects_count: number;
  high_risk_projects_count: number;
  independent_validation_required_count: number;
  alert_summary: {
    delayed_milestones: number;
    unresolved_fraud_flags: number;
    geofence_exceptions_pending: number;
  };
  map_projects: DashboardMapProject[];
  flagged_projects: DashboardProjectSummary[];
  delayed_projects: DashboardProjectSummary[];
  intervention_queue: DashboardInterventionProject[];
  compliance_queue: DashboardInterventionProject[];
  recent_projects: DashboardProjectSummary[];
  latest_snapshots: ProjectMetricSnapshot[];
  summary_source: string;
  summary_snapshot_date: string | null;
};
