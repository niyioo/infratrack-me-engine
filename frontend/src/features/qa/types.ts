export type QAReview = {
  id: number;
  project: number;
  milestone: number;
  decision: string;
  comments: string;
  total_score: number;
  max_score: number;
};

export type FraudFlag = {
  id: number;
  flag_type: string;
  severity: string;
  description: string;
  status: string;
};