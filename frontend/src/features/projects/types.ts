export type Agency = {
  id: number;
  name: string;
  code: string;
  type: string;
};

export type Contractor = {
  id: number;
  name: string;
  registration_number: string;
  risk_level: string;
};

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
  start_date: string;
  expected_end_date: string;
  actual_end_date: string | null;
  current_status: string;
  risk_status: string;
  requires_independent_validation: boolean;
  created_at: string;
};

export type ProjectAssignment = {
  id: number;
  user: number;
  user_name: string;
  assignment_role: string;
  assigned_at: string;
  is_active: boolean;
};