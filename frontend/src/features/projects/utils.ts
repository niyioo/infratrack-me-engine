import type { Project } from "./types";

export function projectLocation(project: Project) {
  return `${project.state}, ${project.lga}`;
}