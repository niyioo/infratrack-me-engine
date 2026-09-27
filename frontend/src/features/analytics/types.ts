export type ProjectMetricSnapshot = {
  id: number;
  project: number;
  snapshot_date: string;
  physical_completion_percent: string;
  financial_disbursement_percent: string;
  burn_variance_percent: string;
  delayed_days: number;
  risk_score: string;
  flagged_count: number;
  approved_milestones: number;
  total_milestones: number;
  health_score?: number;
  health_band?: string;
  alerts?: { code: string; severity: string; message: string }[];
  lifecycle_stage?: string;
};

export type PortfolioMetricSnapshot = {
  id: number;
  snapshot_date: string;
  scope_type: string;
  state: string;
  lga: string;
  total_projects: number;
  active_projects: number;
  flagged_projects_count: number;
  delayed_projects_count: number;
  total_budget: string;
  awaiting_verification_count: number;
  completed_projects_count: number;
  high_risk_projects_count: number;
  independent_validation_required_count: number;
  delayed_milestones_count: number;
  unresolved_fraud_flags_count: number;
  geofence_exceptions_pending_count: number;
};
