export const DASHBOARD_ACCESS_CAPABILITIES = ["dashboard.view"] as const;
export const INTERVENTION_ACCESS_CAPABILITIES = ["dashboard.view"] as const;

export const PROJECT_ACCESS_CAPABILITIES = ["projects.view_lifecycle"] as const;

export const PROJECT_CREATE_CAPABILITIES = ["projects.manage"] as const;

export const DIRECTORY_ACCESS_CAPABILITIES = ["users.view_directory", "projects.manage"] as const;

export const DIRECTORY_MANAGE_CAPABILITIES = ["users.view_directory"] as const;

export const MILESTONE_REVIEW_CAPABILITIES = ["qa.review"] as const;

export const FINANCE_QUEUE_CAPABILITIES = ["finance.review"] as const;

export const DISBURSEMENT_ACCESS_CAPABILITIES = ["finance.review"] as const;

export const ANALYTICS_ACCESS_CAPABILITIES = ["analytics.view_executive"] as const;

export const AUDIT_ACCESS_CAPABILITIES = ["audits.view"] as const;

export const CITIZEN_REPORT_CAPABILITIES = ["citizen_reports.triage"] as const;

export const FRAUD_FLAG_RESOLVE_CAPABILITIES = ["fraud_flags.resolve"] as const;

export const GEOFENCE_EXCEPTION_REVIEW_CAPABILITIES = ["evidence.review_exceptions"] as const;
