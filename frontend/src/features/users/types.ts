import type { Role } from "@/features/auth/types";

export type UserRoleAssignment = {
  role_id: number;
  role_code: string;
  role_name: string;
  agency_id: number | null;
  agency_name: string | null;
};

export type DirectoryUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  is_staff: boolean;
  roles: Role[];
  role_assignments: UserRoleAssignment[];
  capabilities: string[];
  created_at: string;
};

export type UserRoleAssignmentPayload = {
  role_id: number;
  agency_id: number | null;
};

export type CreateUserPayload = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_active: boolean;
  password: string;
  role_assignments: UserRoleAssignmentPayload[];
};

export type UpdateUserPayload = Omit<CreateUserPayload, "password"> & {
  password?: string;
};

export type UserListFilters = {
  search?: string;
  page?: string;
  page_size?: string;
};
