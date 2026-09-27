import type { Project } from "./types";

type ParsedProjectLocation = {
  latitude: number;
  longitude: number;
};

function toValidCoordinates(latitudeCandidate: string, longitudeCandidate: string) {
  const latitude = Number(latitudeCandidate);
  const longitude = Number(longitudeCandidate);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return { latitude, longitude };
}

export function parseProjectLocationInput(input: string): ParsedProjectLocation | null {
  const normalizedInput = input.trim();

  if (!normalizedInput) {
    return null;
  }

  const decodedInput = decodeURIComponent(normalizedInput);
  const coordinatePatterns = [
    /@(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/,
    /!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/,
    /[?&](?:q|query|ll|center)=(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/,
    /\b(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\b/
  ];

  for (const pattern of coordinatePatterns) {
    const match = decodedInput.match(pattern);

    if (!match) {
      continue;
    }

    const coordinates = toValidCoordinates(match[1], match[2]);

    if (coordinates) {
      return coordinates;
    }
  }

  return null;
}

export function projectLocation(project: Project) {
  return `${project.state}, ${project.lga}`;
}
