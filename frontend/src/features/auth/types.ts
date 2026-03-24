export type Role = {
  id: number;
  code: string;
  name: string;
  description: string;
};

export type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  roles: Role[];
  created_at: string;
};

export type LoginResponse = {
  access: string;
  refresh: string;
};