export type FundingTranche = {
  id: number;
  project: number;
  project_code: string;
  project_title: string;
  project_status: string;
  tranche_number: number;
  tranche_name: string;
  planned_amount: string;
  percentage_of_budget: string;
  planned_release_date: string | null;
  actual_release_date: string | null;
  current_status: string;
  unlock_status: string;
  unlock_reason: string;
  release_reference: string;
};

export type EligibilityResult = {
  tranche_id: number;
  eligible: boolean;
  rules_passed: string[];
  rules_failed: string[];
  snapshot_hash: string;
};

export type Disbursement = {
  id: number;
  project: number;
  project_code: string;
  project_title: string;
  tranche: number;
  tranche_name: string;
  amount: string;
  payment_reference: string;
  release_date: string;
};
