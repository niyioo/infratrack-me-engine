export type Project = {
  id: number;
  project_code: string;
  title: string;
  state: string;
  lga: string;
  site_address: string;
  latitude: number;
  longitude: number;
  geo_fence_radius_meters: number;
  current_status: string;
  risk_status: string;
  requires_independent_validation: boolean;
};