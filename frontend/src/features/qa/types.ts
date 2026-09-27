export type QAReview = {
  id: number;
  project: number;
  milestone: number;
  evidence_submission: number;
  project_code: string;
  project_title: string;
  milestone_name: string;
  decision: string;
  comments: string;
  total_score: number;
  max_score: number;
  reviewer_name: string;
  submission_status: string;
};

export type FraudFlag = {
  id: number;
  project: number;
  project_code: string;
  project_title: string;
  milestone: number | null;
  milestone_name: string | null;
  flag_type: string;
  severity: string;
  description: string;
  status: string;
  flagged_by_name?: string;
  resolved_by_name?: string | null;
  resolved_at?: string | null;
  resolution_note?: string;
  created_at?: string;
};

export type FraudFlagResolution = "RESOLVED" | "DISMISSED";
