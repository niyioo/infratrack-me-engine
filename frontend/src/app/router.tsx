import { Suspense, lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthGuard } from "@/features/auth/AuthGuard";
import { RoleGuard } from "@/features/auth/RoleGuard";
import { Spinner } from "@/components/ui/Spinner";
import {
  ANALYTICS_ACCESS_CAPABILITIES,
  AUDIT_ACCESS_CAPABILITIES,
  CITIZEN_REPORT_CAPABILITIES,
  DASHBOARD_ACCESS_CAPABILITIES,
  DIRECTORY_ACCESS_CAPABILITIES,
  DIRECTORY_MANAGE_CAPABILITIES,
  DISBURSEMENT_ACCESS_CAPABILITIES,
  FINANCE_QUEUE_CAPABILITIES,
  INTERVENTION_ACCESS_CAPABILITIES,
  MILESTONE_REVIEW_CAPABILITIES,
  PROJECT_ACCESS_CAPABILITIES,
  PROJECT_CREATE_CAPABILITIES
} from "@/lib/constants/capabilityPolicies";
import { AppLayout } from "./layouts/AppLayout";
import { AuthLayout } from "./layouts/AuthLayout";

const LoginPage = lazy(() => import("@/pages/auth/LoginPage").then((module) => ({ default: module.LoginPage })));
const DashboardPage = lazy(() =>
  import("@/pages/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage }))
);
const InterventionQueuePage = lazy(() =>
  import("@/pages/interventions/InterventionQueuePage").then((module) => ({ default: module.InterventionQueuePage }))
);
const ProjectsPage = lazy(() => import("@/pages/projects/ProjectsPage").then((module) => ({ default: module.ProjectsPage })));
const UsersPage = lazy(() => import("@/pages/users/UsersPage").then((module) => ({ default: module.UsersPage })));
const VendorsPage = lazy(() => import("@/pages/vendors/VendorsPage").then((module) => ({ default: module.VendorsPage })));
const ProjectDetailPage = lazy(() =>
  import("@/pages/projects/ProjectDetailPage").then((module) => ({ default: module.ProjectDetailPage }))
);
const ProjectCreatePage = lazy(() =>
  import("@/pages/projects/ProjectCreatePage").then((module) => ({ default: module.ProjectCreatePage }))
);
const ProjectEditPage = lazy(() =>
  import("@/pages/projects/ProjectEditPage").then((module) => ({ default: module.ProjectEditPage }))
);
const MilestoneReviewPage = lazy(() =>
  import("@/pages/milestones/MilestoneReviewPage").then((module) => ({ default: module.MilestoneReviewPage }))
);
const FinanceQueuePage = lazy(() =>
  import("@/pages/finance/FinanceQueuePage").then((module) => ({ default: module.FinanceQueuePage }))
);
const DisbursementHistoryPage = lazy(() =>
  import("@/pages/finance/DisbursementHistoryPage").then((module) => ({ default: module.DisbursementHistoryPage }))
);
const CitizenReportsPage = lazy(() =>
  import("@/pages/citizenReports/CitizenReportsPage").then((module) => ({ default: module.CitizenReportsPage }))
);
const AnalyticsPage = lazy(() => import("@/pages/analytics/AnalyticsPage").then((module) => ({ default: module.AnalyticsPage })));
const AuditTrailPage = lazy(() => import("@/pages/audits/AuditTrailPage").then((module) => ({ default: module.AuditTrailPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));

function RouteLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3">
      <Spinner />
      <p className="text-sm text-slate-500">Loading page...</p>
    </div>
  );
}

function withSuspense(element: JSX.Element) {
  return <Suspense fallback={<RouteLoader />}>{element}</Suspense>;
}

function withRoleGuard(allow: string[], element: JSX.Element) {
  return withSuspense(<RoleGuard allow={allow}>{element}</RoleGuard>);
}

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: withSuspense(<LoginPage />) }
    ]
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Navigate to="/dashboard" replace /> },
          {
            path: "/dashboard",
            element: withRoleGuard([...DASHBOARD_ACCESS_CAPABILITIES], <DashboardPage />)
          },
          {
            path: "/interventions",
            element: withRoleGuard([...INTERVENTION_ACCESS_CAPABILITIES], <InterventionQueuePage />)
          },
          {
            path: "/projects",
            element: withRoleGuard([...PROJECT_ACCESS_CAPABILITIES], <ProjectsPage />)
          },
          {
            path: "/users",
            element: withRoleGuard([...DIRECTORY_MANAGE_CAPABILITIES], <UsersPage />)
          },
          {
            path: "/vendors",
            element: withRoleGuard([...DIRECTORY_ACCESS_CAPABILITIES], <VendorsPage />)
          },
          {
            path: "/projects/new",
            element: withRoleGuard([...PROJECT_CREATE_CAPABILITIES], <ProjectCreatePage />)
          },
          {
            path: "/projects/:projectId/edit",
            element: withRoleGuard([...PROJECT_CREATE_CAPABILITIES], <ProjectEditPage />)
          },
          {
            path: "/projects/:projectId",
            element: withRoleGuard([...PROJECT_ACCESS_CAPABILITIES], <ProjectDetailPage />)
          },
          {
            path: "/milestones/review",
            element: withRoleGuard([...MILESTONE_REVIEW_CAPABILITIES], <MilestoneReviewPage />)
          },
          {
            path: "/finance/queue",
            element: withRoleGuard([...FINANCE_QUEUE_CAPABILITIES], <FinanceQueuePage />)
          },
          {
            path: "/finance/disbursements",
            element: withRoleGuard([...DISBURSEMENT_ACCESS_CAPABILITIES], <DisbursementHistoryPage />)
          },
          {
            path: "/citizen-reports",
            element: withRoleGuard([...CITIZEN_REPORT_CAPABILITIES], <CitizenReportsPage />)
          },
          {
            path: "/analytics",
            element: withRoleGuard([...ANALYTICS_ACCESS_CAPABILITIES], <AnalyticsPage />)
          },
          {
            path: "/audits",
            element: withRoleGuard([...AUDIT_ACCESS_CAPABILITIES], <AuditTrailPage />)
          },
          { path: "*", element: withSuspense(<NotFoundPage />) }
        ]
      }
    ]
  }
]);
