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
};