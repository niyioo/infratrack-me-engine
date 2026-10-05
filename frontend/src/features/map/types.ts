export type MapProject = {
  id: number;
  project_code: string;
  title: string;
  state: string;
  lga: string;
  site_address: string;
  current_status: string;
  risk_status: string;
  health_score: number | null;
  health_band: string;
  physical_completion_percent: string | number;
  budget_amount: string | number;
  latitude: number;
  longitude: number;
  /** Only present for roles that can triage citizen reports. */
  open_citizen_reports?: number;
};

export type MapCitizenReport = {
  id: number;
  project_id: number;
  project_title: string;
  category: string;
  category_label: string;
  status: string;
  created_at: string;
  latitude: number;
  longitude: number;
};

export type PortfolioMap = {
  projects: MapProject[];
  /** null when the viewer may not see citizen report signals. */
  citizen_reports: MapCitizenReport[] | null;
};
