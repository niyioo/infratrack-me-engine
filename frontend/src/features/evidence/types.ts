export type EvidenceSubmission = {
  id: number;
  project: number;
  milestone: number;
  source_type: string;
  submission_status: string;
  geo_validation_status: string;
  submitted_at: string | null;
  submitted_by_name: string;
};