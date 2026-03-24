import { NavLink } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks";

const navItems = [
  { label: "Dashboard", to: "/dashboard", roles: ["SUPER_ADMIN", "PROGRAM_DIRECTOR", "M_E_OFFICER", "QA_OFFICER", "FINANCE_OFFICER", "AUDITOR"] },
  { label: "Projects", to: "/projects", roles: ["SUPER_ADMIN", "PROGRAM_DIRECTOR", "M_E_OFFICER", "QA_OFFICER", "FINANCE_OFFICER", "AUDITOR"] },
  { label: "Milestone Review", to: "/milestones/review", roles: ["SUPER_ADMIN", "QA_OFFICER", "M_E_OFFICER"] },
  { label: "Finance Queue", to: "/finance/queue", roles: ["SUPER_ADMIN", "FINANCE_OFFICER", "PROGRAM_DIRECTOR"] },
  { label: "Disbursements", to: "/finance/disbursements", roles: ["SUPER_ADMIN", "FINANCE_OFFICER", "PROGRAM_DIRECTOR", "AUDITOR"] },
  { label: "Analytics", to: "/analytics", roles: ["SUPER_ADMIN", "PROGRAM_DIRECTOR", "AUDITOR"] },
  { label: "Audit Trail", to: "/audits", roles: ["SUPER_ADMIN", "AUDITOR", "PROGRAM_DIRECTOR"] }
];

export function Sidebar() {
  const { roles } = useAuth();

  return (
    <aside className="hidden w-72 border-r border-slate-200 bg-white lg:block">
      <div className="border-b border-slate-200 px-6 py-5">
        <h1 className="text-lg font-semibold">InfraTrack</h1>
        <p className="mt-1 text-sm text-slate-500">M&E Control Console</p>
      </div>

      <nav className="space-y-1 p-4">
        {navItems
          .filter((item) => item.roles.some((role) => roles.includes(role)))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-lg px-4 py-3 text-sm font-medium ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
      </nav>
    </aside>
  );
}