import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
type MapProject = {
  id: number;
  title: string;
  project_code: string;
  state: string;
  lga: string;
  site_address: string;
  current_status: string;
  lifecycle_stage?: string;
  latitude: number | null;
  longitude: number | null;
};

type Props = {
  projects: MapProject[];
};

const NIGERIA_BOUNDS = {
  minLat: 4.0,
  maxLat: 14.0,
  minLng: 2.5,
  maxLng: 15.0
};

function markerColor(status: string) {
  if (status === "FLAGGED") return "red";
  if (status === "DELAYED") return "orange";
  if (status === "COMPLETED") return "green";
  return "blue";
}

function projectCoordinates(project: MapProject) {
  const longitude = project.longitude ?? 0;
  const latitude = project.latitude ?? 0;
  const leftRatio =
    (longitude - NIGERIA_BOUNDS.minLng) / (NIGERIA_BOUNDS.maxLng - NIGERIA_BOUNDS.minLng);
  const topRatio =
    (NIGERIA_BOUNDS.maxLat - latitude) / (NIGERIA_BOUNDS.maxLat - NIGERIA_BOUNDS.minLat);

  return {
    left: `${Math.max(4, Math.min(96, leftRatio * 100))}%`,
    top: `${Math.max(6, Math.min(94, topRatio * 100))}%`
  };
}

export function NigeriaProjectsMap({ projects }: Props) {
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  const plottedProjects = useMemo(
    () => projects.filter((project) => Number.isFinite(project.latitude) && Number.isFinite(project.longitude)),
    [projects]
  );

  const activeProject =
    plottedProjects.find((project) => project.id === activeProjectId) ?? plottedProjects[0] ?? null;

  return (
    <div className="grid h-full min-h-[460px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)]">
        <div className="absolute inset-0 opacity-50">
          <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-slate-300" />
          <div className="absolute inset-x-0 top-2/4 border-t border-dashed border-slate-300" />
          <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-slate-300" />
          <div className="absolute inset-y-0 left-1/4 border-l border-dashed border-slate-300" />
          <div className="absolute inset-y-0 left-2/4 border-l border-dashed border-slate-300" />
          <div className="absolute inset-y-0 left-3/4 border-l border-dashed border-slate-300" />
        </div>

        <div className="pointer-events-none absolute left-4 top-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">
          North
        </div>
        <div className="pointer-events-none absolute bottom-3 left-4 text-[11px] uppercase tracking-[0.18em] text-slate-500">
          South
        </div>
        <div className="pointer-events-none absolute bottom-3 right-4 text-[11px] uppercase tracking-[0.18em] text-slate-500">
          East
        </div>
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
          West
        </div>

        {plottedProjects.map((project) => {
          const coordinates = projectCoordinates(project);
          return (
            <button
              key={project.id}
              type="button"
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: coordinates.left, top: coordinates.top }}
              onMouseEnter={() => setActiveProjectId(project.id)}
              onFocus={() => setActiveProjectId(project.id)}
              onClick={() => setActiveProjectId(project.id)}
              aria-label={`View project location for ${project.title}`}
            >
              <span
                className="block h-4 w-4 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(15,23,42,0.18)] transition-transform hover:scale-110 focus:scale-110"
                style={{ backgroundColor: markerColor(project.current_status) }}
              />
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {activeProject ? (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Selected Project</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{activeProject.title}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 text-slate-600">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Project Code</p>
                <p className="mt-1">{activeProject.project_code}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Location</p>
                <p className="mt-1">
                  {activeProject.state}, {activeProject.lga}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                <p className="mt-1">{activeProject.current_status}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Lifecycle Stage</p>
                <p className="mt-1">{activeProject.lifecycle_stage ?? "Not available"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Site Address</p>
                <p className="mt-1">{activeProject.site_address || "Not available"}</p>
              </div>
            </div>
            <Link to={`/projects/${activeProject.id}`} className="inline-flex text-sm font-medium text-blue-600 underline">
              View project details
            </Link>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No project coordinates available.
          </div>
        )}
      </div>
    </div>
  );
}
