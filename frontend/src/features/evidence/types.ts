export type EvidenceSubmission = {
  id: number;
  project: number;
  milestone: number;
  project_code: string;
  project_title: string;
  milestone_name: string;
  source_type: string;
  submission_status: string;
  geo_validation_status: string;
  submitted_at: string | null;
  submitted_by_name: string;
  requires_exception_review: boolean;
  file_count: number;
};

export type GeoFenceExceptionRequest = {
  id: number;
  project: number;
  milestone: number;
  submission: number | null;
  requested_by: number;
  current_latitude: number;
  current_longitude: number;
  distance_from_site_meters: number;
  reason: string;
  status: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  decision_note: string;
  created_at: string;
};
