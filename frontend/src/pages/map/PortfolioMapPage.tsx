import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Megaphone, MapPin, Search } from "lucide-react";
import { PageShell } from "@/app/layouts/PageShell";
import { Card } from "@/components/ui/Card";
import { QueryStateCard } from "@/components/ui/QueryStateCard";
import { usePortfolioMap } from "@/features/map/hooks";
import type { MapCitizenReport, MapProject } from "@/features/map/types";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatCurrency, formatDate } from "@/lib/utils/format";

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  import.meta.env.VITE_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

type ColorMode = "health" | "status";

// Leaflet draws with raw colours, so these mirror the app's status palette.
const HEALTH_COLORS: Record<string, { color: string; label: string }> = {
  HEALTHY: { color: "#059669", label: "Healthy" },
  WATCH: { color: "#D97706", label: "Watch" },
  AT_RISK: { color: "#EA580C", label: "At risk" },
  CRITICAL: { color: "#DC2626", label: "Critical" },
};
const STATUS_COLORS: Record<string, { color: string; label: string }> = {
  NOT_STARTED: { color: "#94A3B8", label: "Not started" },
  ACTIVE: { color: "#0F9C92", label: "Active" },
  DELAYED: { color: "#D97706", label: "Delayed" },
  FLAGGED: { color: "#DC2626", label: "Flagged" },
  COMPLETED: { color: "#059669", label: "Completed" },
};
const FALLBACK = { color: "#64748B", label: "Other" };
const CITIZEN_COLOR = "#7C3AED";

function humanize(value: string) {
  const text = value.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function legendFor(mode: ColorMode, project: MapProject) {
  if (mode === "health") return HEALTH_COLORS[project.health_band] ?? { color: FALLBACK.color, label: "No score yet" };
  return STATUS_COLORS[project.current_status] ?? { color: FALLBACK.color, label: humanize(project.current_status) };
}

/** Fits the view to the visible pins whenever the filtered set changes. */
function FitToPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    map.fitBounds(points as LatLngBoundsExpression, { padding: [40, 40], maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

/** Leaflet measures its container once; re-measure when the layout around it changes. */
function KeepSized() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

/** Pans to a project picked from the side list. */
function FlyTo({ target }: { target: MapProject | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.latitude, target.longitude], Math.max(map.getZoom(), 12), { duration: 0.6 });
  }, [target, map]);
  return null;
}

export function PortfolioMapPage() {
  const mapQuery = usePortfolioMap();
  const [mode, setMode] = useState<ColorMode>("health");
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [showCitizen, setShowCitizen] = useState(true);
  const [focused, setFocused] = useState<MapProject | null>(null);

  const projects = mapQuery.data?.projects ?? [];
  const citizenReports = mapQuery.data?.citizen_reports ?? null;
  const canSeeCitizen = citizenReports !== null;

  const states = useMemo(() => Array.from(new Set(projects.map((p) => p.state))).sort(), [projects]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return projects.filter(
      (p) =>
        (!state || p.state === state) &&
        (!needle || [p.title, p.project_code, p.lga, p.site_address].some((v) => v?.toLowerCase().includes(needle)))
    );
  }, [projects, search, state]);

  const visibleIds = useMemo(() => new Set(visible.map((p) => p.id)), [visible]);
  const visibleReports: MapCitizenReport[] = useMemo(
    () => (citizenReports ?? []).filter((r) => visibleIds.has(r.project_id)),
    [citizenReports, visibleIds]
  );

  // Lowest health first: the side list is a "where to look" list.
  const ranked = useMemo(
    () => [...visible].sort((a, b) => (a.health_score ?? 101) - (b.health_score ?? 101)),
    [visible]
  );

  const legend = useMemo(() => {
    const counts = new Map<string, { color: string; label: string; count: number }>();
    for (const p of visible) {
      const entry = legendFor(mode, p);
      const current = counts.get(entry.label) ?? { ...entry, count: 0 };
      current.count += 1;
      counts.set(entry.label, current);
    }
    return Array.from(counts.values());
  }, [visible, mode]);

  const points = visible.map((p) => [p.latitude, p.longitude] as [number, number]);

  return (
    <PageShell
      title="Portfolio Map"
      description="Where every project is, how healthy it is, and where citizens are raising concerns."
    >
      {mapQuery.isLoading || mapQuery.isError ? (
        <QueryStateCard
          state={mapQuery.isLoading ? "loading" : "error"}
          title={mapQuery.isLoading ? "Loading map" : "The map could not be loaded"}
          description={
            mapQuery.isLoading
              ? "Gathering project locations and health scores."
              : getApiErrorMessage(mapQuery.error, "Check your connection and try again.")
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="overflow-hidden p-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
              <div className="relative min-w-[200px] flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search project, code, LGA…"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                aria-label="Filter by state"
              >
                <option value="">All states</option>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="flex overflow-hidden rounded-lg border border-slate-200 text-sm" role="group" aria-label="Colour pins by">
                {(["health", "status"] as ColorMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={
                      mode === m ? "bg-brand px-3 py-2 font-medium text-white" : "bg-white px-3 py-2 text-slate-600 hover:bg-slate-50"
                    }
                  >
                    {m === "health" ? "Health" : "Status"}
                  </button>
                ))}
              </div>
              {canSeeCitizen ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={showCitizen} onChange={(e) => setShowCitizen(e.target.checked)} />
                  Citizen reports
                </label>
              ) : null}
            </div>

            <div className="relative h-[620px]">
              <MapContainer
                center={[9.08, 8.68]}
                zoom={6}
                scrollWheelZoom
                className="h-full w-full"
                // Keep the map under the app's sticky header and drawers.
                style={{ zIndex: 0 }}
              >
                <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
                <FitToPoints points={points} />
                <FlyTo target={focused} />
                <KeepSized />

                {/* Citizen pins first so project pins stay clickable on top. */}
                {canSeeCitizen && showCitizen
                  ? visibleReports.map((r) => (
                      <CircleMarker
                        key={`cr-${r.id}`}
                        center={[r.latitude, r.longitude]}
                        radius={6}
                        pathOptions={{ color: CITIZEN_COLOR, weight: 2, fillColor: "#ffffff", fillOpacity: 1 }}
                      >
                        <Popup>
                          <div className="space-y-1 text-sm">
                            <p className="font-semibold" style={{ color: CITIZEN_COLOR }}>
                              {r.category_label}
                            </p>
                            <p className="text-xs text-slate-600">{r.project_title}</p>
                            <p className="text-xs text-slate-500">
                              {humanize(r.status)} · {formatDate(r.created_at)}
                            </p>
                            <Link to="/citizen-reports" className="inline-block pt-1 text-xs font-semibold text-brand">
                              Open triage queue →
                            </Link>
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))
                  : null}

                {visible.map((p) => {
                  const { color, label } = legendFor(mode, p);
                  return (
                    <CircleMarker
                      key={p.id}
                      center={[p.latitude, p.longitude]}
                      radius={focused?.id === p.id ? 13 : 10}
                      pathOptions={{ color: "#ffffff", weight: 2, fillColor: color, fillOpacity: 0.95 }}
                    >
                      <Tooltip direction="top" offset={[0, -8]}>
                        {p.title}
                      </Tooltip>
                      <Popup minWidth={240}>
                        <div className="space-y-1.5 text-sm">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{p.project_code}</p>
                          <p className="font-semibold leading-snug text-slate-900">{p.title}</p>
                          <p className="text-xs text-slate-500">
                            {p.lga}, {p.state}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-slate-600">
                            <span>
                              Health <b>{p.health_score ?? "—"}</b>
                            </span>
                            <span>{humanize(p.current_status)}</span>
                            <span>{Number(p.physical_completion_percent).toFixed(0)}% built</span>
                            <span>{formatCurrency(p.budget_amount)}</span>
                          </div>
                          {p.open_citizen_reports ? (
                            <p className="text-xs font-medium" style={{ color: CITIZEN_COLOR }}>
                              {p.open_citizen_reports} open citizen report{p.open_citizen_reports === 1 ? "" : "s"}
                            </p>
                          ) : null}
                          <p className="text-xs" style={{ color }}>
                            ● {label}
                          </p>
                          <Link to={`/projects/${p.id}`} className="inline-block pt-1 text-xs font-semibold text-brand">
                            Open project →
                          </Link>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}

              </MapContainer>

              {/* Legend */}
              <div className="pointer-events-none absolute bottom-4 left-4 z-[400] rounded-lg bg-white/95 px-3 py-2 text-xs shadow-md">
                {legend.map((entry) => (
                  <div key={entry.label} className="flex items-center gap-2 py-0.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                    <span className="text-slate-600">{entry.label}</span>
                    <span className="ml-auto pl-3 font-semibold text-slate-800">{entry.count}</span>
                  </div>
                ))}
                {canSeeCitizen && showCitizen ? (
                  <div className="flex items-center gap-2 py-0.5">
                    <span className="h-2.5 w-2.5 rounded-full border-2 bg-white" style={{ borderColor: CITIZEN_COLOR }} />
                    <span className="text-slate-600">Citizen report</span>
                    <span className="ml-auto pl-3 font-semibold text-slate-800">{visibleReports.length}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

          {/* Side list */}
          <Card className="flex max-h-[680px] flex-col overflow-hidden p-0">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">Needs attention first</p>
              <p className="text-xs text-slate-500">
                {visible.length} of {projects.length} projects · lowest health at the top
              </p>
            </div>
            <ul className="flex-1 divide-y divide-slate-50 overflow-y-auto">
              {ranked.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-slate-500">No projects match these filters.</li>
              ) : (
                ranked.map((p) => {
                  const { color, label } = legendFor(mode, p);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setFocused(p)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                          focused?.id === p.id ? "bg-slate-50" : ""
                        }`}
                      >
                        <span
                          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: color }}
                          title={label}
                        >
                          {p.health_score ?? "—"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800">{p.title}</span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin size={11} /> {p.lga}, {p.state} · {humanize(p.current_status)}
                          </span>
                          {p.open_citizen_reports ? (
                            <span className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: CITIZEN_COLOR }}>
                              <Megaphone size={11} /> {p.open_citizen_reports} open report
                              {p.open_citizen_reports === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
