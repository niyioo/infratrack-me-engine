import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  AlertTriangle,
  FolderOpen,
  Users,
  Building2,
  ClipboardCheck,
  Wallet,
  ArrowRightLeft,
  BarChart3,
  ShieldCheck,
  Megaphone,
  Map,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks";
import { version as appVersion } from "../../../package.json";
import { BuildWitnessLogo } from "@/components/brand/BuildWitnessLogo";
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
  PORTFOLIO_MAP_CAPABILITIES,
  PROJECT_ACCESS_CAPABILITIES,
} from "@/lib/constants/capabilityPolicies";

const navItems = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    capabilities: DASHBOARD_ACCESS_CAPABILITIES,
  },
  {
    label: "Interventions",
    to: "/interventions",
    icon: AlertTriangle,
    capabilities: INTERVENTION_ACCESS_CAPABILITIES,
  },
  {
    label: "Map",
    to: "/map",
    icon: Map,
    capabilities: PORTFOLIO_MAP_CAPABILITIES,
  },
  {
    label: "Projects",
    to: "/projects",
    icon: FolderOpen,
    capabilities: PROJECT_ACCESS_CAPABILITIES,
  },
  {
    label: "Users",
    to: "/users",
    icon: Users,
    capabilities: DIRECTORY_MANAGE_CAPABILITIES,
  },
  {
    label: "Vendors",
    to: "/vendors",
    icon: Building2,
    capabilities: DIRECTORY_ACCESS_CAPABILITIES,
  },
  {
    label: "Milestone Review",
    to: "/milestones/review",
    icon: ClipboardCheck,
    capabilities: MILESTONE_REVIEW_CAPABILITIES,
  },
  {
    label: "Citizen Reports",
    to: "/citizen-reports",
    icon: Megaphone,
    capabilities: CITIZEN_REPORT_CAPABILITIES,
  },
  {
    label: "Finance Queue",
    to: "/finance/queue",
    icon: Wallet,
    capabilities: FINANCE_QUEUE_CAPABILITIES,
  },
  {
    label: "Disbursements",
    to: "/finance/disbursements",
    icon: ArrowRightLeft,
    capabilities: DISBURSEMENT_ACCESS_CAPABILITIES,
  },
  {
    label: "Analytics",
    to: "/analytics",
    icon: BarChart3,
    capabilities: ANALYTICS_ACCESS_CAPABILITIES,
  },
  {
    label: "Audit Trail",
    to: "/audits",
    icon: ShieldCheck,
    capabilities: AUDIT_ACCESS_CAPABILITIES,
  },
];

export function Sidebar() {
  const { capabilities, roles } = useAuth();
  const activeRoleLabel =
    roles.length > 0 ? roles[0].replace(/_/g, " ") : "Operational user";

  const visibleItems = navItems.filter((item) =>
    item.capabilities.some((cap) => capabilities.includes(cap)),
  );

  return (
    <aside className="hidden w-64 flex-col border-r border-brand/10 bg-white/95 backdrop-blur lg:flex">
      {/* Logo + workspace */}
      <div className="border-b border-brand/10 px-5 py-5">
        <BuildWitnessLogo className="mb-1" />
        <p className="mt-1 text-xs text-slate-400">M&E Control Console</p>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Active Role
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{activeRoleLabel}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand text-white shadow-sm"
                    : "text-slate-600 hover:bg-brand-soft hover:text-brand-strong"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    className={`shrink-0 transition-colors ${
                      isActive
                        ? "text-white/80"
                        : "text-slate-400 group-hover:text-brand"
                    }`}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer spacer */}
      <div className="border-t border-slate-100 px-4 py-3">
        <p className="text-[10px] text-slate-400">
          BuildWitness M&E Engine · v{appVersion}
        </p>
      </div>
    </aside>
  );
}
