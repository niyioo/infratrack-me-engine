export type Agency = {
  id: number;
  name: string;
  code: string;
  type: string;
  parent_agency: number | null;
  state_scope: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Contractor = {
  id: number;
  name: string;
  registration_number: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  rating: string;
  risk_level: string;
  is_active: boolean;
  created_at?: string;
};

export type OrganizationDirectoryFilters = {
  is_active?: boolean;
};

export type CreateAgencyPayload = {
  name: string;
  code: string;
  type: string;
  state_scope?: string;
  is_active?: boolean;
};

export type UpdateAgencyPayload = CreateAgencyPayload;

export type CreateContractorPayload = {
  name: string;
  registration_number: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  risk_level?: string;
  is_active?: boolean;
};

export type UpdateContractorPayload = CreateContractorPayload;
