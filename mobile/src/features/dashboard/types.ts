export type DashboardInterventionProject = {
  id: number;
  project_code: string;
  title: string;
  state: string;
  lga: string;
  current_status: string;
  risk_status: string;
  attention_reason: string;
  attention_level: string;
  reporting_frequency: string;
  reporting_due_date: string | null;
  last_reported_at: string | null;
  days_overdue: number;
};

export type DashboardSummary = {
  intervention_queue: DashboardInterventionProject[];
  compliance_queue: DashboardInterventionProject[];
  alert_summary: {
    geofence_exceptions_pending: number;
    delayed_milestones: number;
    unresolved_fraud_flags: number;
  };
};
