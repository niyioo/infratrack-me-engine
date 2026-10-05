export type Role = {
  id: number;
  code: string;
  name: string;
};

export type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  roles: Role[];
  capabilities?: string[];
};

export type LoginResponse = {
  access: string;
  refresh: string;
};
