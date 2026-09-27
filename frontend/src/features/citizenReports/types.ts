export type CitizenReportStatus =
  | "NEW"
  | "UNDER_REVIEW"
  | "FIELD_VISIT_REQUESTED"
  | "ESCALATED"
  | "RESOLVED"
  | "DISMISSED";

export type CitizenReport = {
  id: number;
  tracking_code: string;
  project: number;
  project_code: string;
  project_title: string;
  project_risk_status: string;
  category: string;
  category_label: string;
  description: string;
  observed_on: string | null;
  latitude: number | null;
  longitude: number | null;
  photo: string | null;
  status: CitizenReportStatus;
  triaged_by: number | null;
  triaged_by_name: string | null;
  triaged_at: string | null;
  triage_note: string;
  public_response: string;
  fraud_flag: number | null;
  same_source_count: number | null;
  created_at: string;
};

export type CitizenReportTriagePayload = {
  status: CitizenReportStatus;
  note?: string;
  public_response?: string;
};
