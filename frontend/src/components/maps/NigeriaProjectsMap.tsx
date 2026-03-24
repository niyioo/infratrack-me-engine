import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import type { Project } from "@/features/projects/types";

type Props = {
  projects: Project[];
};

function markerColor(status: string) {
  if (status === "FLAGGED") return "red";
  if (status === "DELAYED") return "orange";
  if (status === "COMPLETED") return "green";
  return "blue";
}

function createDivIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 2px rgba(15,23,42,0.25)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
}

export function NigeriaProjectsMap({ projects }: Props) {
  return (
    <MapContainer
      center={[9.082, 8.6753]}
      zoom={6}
      scrollWheelZoom
      className="h-full w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {projects
        .filter((p) => p.latitude && p.longitude)
        .map((project) => (
          <Marker
            key={project.id}
            position={[project.latitude, project.longitude]}
            icon={createDivIcon(markerColor(project.current_status))}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{project.title}</p>
                <p>{project.project_code}</p>
                <p>{project.state}, {project.lga}</p>
                <p>Status: {project.current_status}</p>
                <Link to={`/projects/${project.id}`} className="text-blue-600 underline">
                  View project
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}