const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

export const endpoints = {
  baseUrl: BASE_URL,
  auth: {
    login: `${BASE_URL}/auth/login/`,
    refresh: `${BASE_URL}/auth/refresh/`,
    me: `${BASE_URL}/auth/me/`
  },
  users: `${BASE_URL}/users/`,
  projects: `${BASE_URL}/projects/`,
  milestones: `${BASE_URL}/milestones/`,
  evidenceSubmissions: `${BASE_URL}/evidence-submissions/`,
  projectMetricSnapshots: `${BASE_URL}/project-metric-snapshots/`
};
