import type { Agency, Contractor } from "@/features/organizations/types";

export type Project = {
  id: number;
  project_code: string;
  title: string;
  description: string;
  agency: Agency;
  contractor: Contractor;
  supervising_department: string;
  category: string;
  sector: string;
  state: string;
  lga: string;
  ward: string;
  site_address: string;
  latitude: number;
  longitude: number;
  geo_fence_radius_meters: number;
  budget_amount: string;
  currency: string;
  funding_cycle: string;
  reporting_frequency?: string;
  start_date: string;
  expected_end_date: string;
  actual_end_date: string | null;
  current_status: string;
  lifecycle_stage?: string;
  risk_status: string;
  requires_independent_validation: boolean;
  health_score?: number;
  health_band?: string;
  alerts?: Array<{
    code: string;
    severity: string;
    message: string;
  }>;
  physical_completion_percent?: number;
  financial_disbursement_percent?: number;
  burn_variance_percent?: number;
  delayed_days?: number;
  total_milestones?: number;
  approved_milestones?: number;
  overdue_milestones?: number;
  evidence_submissions_count?: number;
  open_fraud_flags?: number;
  pending_geofence_exceptions?: number;
  reporting_attention_reason?: string | null;
  reporting_attention_level?: string | null;
  reporting_due_date?: string | null;
  last_reported_at?: string | null;
  reporting_days_overdue?: number;
  /** Null for users who can't triage citizen reports. */
  citizen_reports?: ProjectCitizenReportSummary | null;
  created_at: string;
};

export type ProjectCitizenReportSummary = {
  open: number;
  escalated: number;
  new_last_7_days: number;
  total: number;
  distinct_concern_reporters: number;
  window_days: number;
  high_threshold: number;
  critical_threshold: number;
  recent_open: {
    id: number;
    tracking_code: string;
    category_label: string;
    status: string;
    created_at: string;
  }[];
};

export type CreateProjectPayload = {
  project_code: string;
  title: string;
  description: string;
  agency: number;
  contractor: number;
  supervising_department: string;
  category: string;
  sector: string;
  state: string;
  lga: string;
  ward: string;
  site_address: string;
  latitude: number;
  longitude: number;
  geo_fence_radius_meters: number;
  budget_amount: number;
  currency: string;
  funding_cycle: string;
  start_date: string;
  expected_end_date: string;
  requires_independent_validation: boolean;
  risk_status: string;
  current_status: string;
};

export type ProjectAssignment = {
  id: number;
  user: number;
  user_name: string;
  assignment_role: string;
  assigned_at: string;
  is_active: boolean;
};
