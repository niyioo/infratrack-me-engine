import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Eye, MapPin, MessageSquareWarning, Search, ShieldCheck } from "lucide-react";
import { searchProjects, type PublicProject } from "@/api";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  DELAYED: "bg-amber-50 text-amber-700",
  FLAGGED: "bg-red-50 text-red-700",
  SUSPENDED: "bg-slate-100 text-slate-600",
  NOT_STARTED: "bg-slate-100 text-slate-600",
};

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function HomePage() {
  const [query, setQuery] = useState("");
  const search = useDebounced(query.trim());
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset to page 1 whenever the search changes.
  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchProjects({ search, page })
      .then((data) => {
        if (cancelled) return;
        setProjects((current) => (page === 1 ? data.results : [...current, ...data.results]));
        setHasMore(Boolean(data.next));
        setTotal(data.count);
      })
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [search, page]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-brand px-6 py-8 text-white shadow-card sm:px-8 sm:py-10">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-muted">
          <Eye size={12} /> Citizen monitoring
        </p>
        <h1 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
          See a government project in your community?
          <br className="hidden sm:block" /> Tell us what's really happening.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
          Your report goes straight to the independent monitoring team. Enough concerns about a project trigger a
          review, and confirmed problems can stop payments to the contractor.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-white/80">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> Anonymous</span>
          <span className="inline-flex items-center gap-1.5"><MessageSquareWarning size={14} /> Takes 2 minutes</span>
          <span className="inline-flex items-center gap-1.5"><Search size={14} /> Track your report</span>
        </div>
      </section>

      {/* Search */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">1. Find the project</h2>
          <p className="text-sm text-slate-500">Search by name, town, local government area or the code on the site signboard.</p>
        </div>

        <label className="relative block">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Akure road, health centre, PRJ-001"
            className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-base shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </label>

        {!loading && !error && (
          <p className="text-xs font-medium text-slate-500">
            {total} ongoing project{total === 1 ? "" : "s"}
            {search ? ` matching "${search}"` : ""}
          </p>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <ul className="space-y-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                to={`/report/${project.id}`}
                className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand/40 hover:shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {project.project_code}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        STATUS_STYLE[project.current_status] ?? "bg-brand-soft text-brand"
                      }`}
                    >
                      {project.current_status.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold leading-snug text-slate-900">{project.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                    <MapPin size={13} className="shrink-0" />
                    <span className="truncate">
                      {project.lga}, {project.state}
                    </span>
                  </p>
                </div>
                <span className="hidden shrink-0 items-center gap-1 rounded-lg bg-brand-soft px-3 py-2 text-sm font-semibold text-brand transition group-hover:bg-brand group-hover:text-white sm:inline-flex">
                  Report <ChevronRight size={15} />
                </span>
                <ChevronRight size={18} className="shrink-0 text-slate-300 sm:hidden" />
              </Link>
            </li>
          ))}

          {loading &&
            Array.from({ length: page === 1 ? 4 : 2 }).map((_, i) => (
              <li key={`skeleton-${i}`} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4">
                <div className="h-3 w-24 rounded bg-slate-100" />
                <div className="mt-3 h-4 w-3/4 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
              </li>
            ))}
        </ul>

        {!loading && !error && projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="font-semibold text-slate-800">No matching projects</p>
            <p className="mt-1 text-sm text-slate-500">
              Try a shorter search, the town name, or the project code on the signboard.
            </p>
          </div>
        )}

        {hasMore && !loading && (
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Show more projects
          </button>
        )}
      </section>
    </div>
  );
}
