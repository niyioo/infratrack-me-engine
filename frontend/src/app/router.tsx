import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthGuard } from "@/features/auth/AuthGuard";
import { AppLayout } from "./layouts/AppLayout";
import { AuthLayout } from "./layouts/AuthLayout";

import { LoginPage } from "@/pages/auth/LoginPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { ProjectsPage } from "@/pages/projects/ProjectsPage";
import { ProjectDetailPage } from "@/pages/projects/ProjectDetailPage";
import { ProjectCreatePage } from "@/pages/projects/ProjectCreatePage";
import { MilestoneReviewPage } from "@/pages/milestones/MilestoneReviewPage";
import { FinanceQueuePage } from "@/pages/finance/FinanceQueuePage";
import { DisbursementHistoryPage } from "@/pages/finance/DisbursementHistoryPage";
import { AnalyticsPage } from "@/pages/analytics/AnalyticsPage";
import { AuditTrailPage } from "@/pages/audits/AuditTrailPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> }
    ]
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/projects", element: <ProjectsPage /> },
          { path: "/projects/new", element: <ProjectCreatePage /> },
          { path: "/projects/:projectId", element: <ProjectDetailPage /> },
          { path: "/milestones/review", element: <MilestoneReviewPage /> },
          { path: "/finance/queue", element: <FinanceQueuePage /> },
          { path: "/finance/disbursements", element: <DisbursementHistoryPage /> },
          { path: "/analytics", element: <AnalyticsPage /> },
          { path: "/audits", element: <AuditTrailPage /> },
          { path: "*", element: <NotFoundPage /> }
        ]
      }
    ]
  }
]);