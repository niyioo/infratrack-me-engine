import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Landmark, ShieldCheck } from "lucide-react";
import clsx from "@/lib/clsx";

export function Layout() {
  const { pathname } = useLocation();
  // Start each page at the top; otherwise the report form opens mid-scroll.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-brand">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
              <Landmark size={16} />
            </span>
            <span className="text-sm tracking-tight sm:text-base">BuildWitness Citizen</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium">
            {[
              { to: "/", label: "Report", end: true },
              { to: "/track", label: "Track a report", end: false },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    "rounded-lg px-3 py-1.5 transition-colors",
                    isActive ? "bg-brand-soft text-brand" : "text-slate-600 hover:bg-slate-100"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-start gap-2 px-4 py-5 text-xs leading-5 text-slate-500">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-accent" />
          <p>
            Reports are anonymous. We never ask for your name or phone number, and your IP address is not saved
            with your report. Hidden location data is removed from photos before they are stored.
          </p>
        </div>
      </footer>
    </div>
  );
}
