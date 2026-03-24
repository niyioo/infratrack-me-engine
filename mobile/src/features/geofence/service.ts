import type { GeofenceResult } from "./types";

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function validateGeofence(params: {
  siteLat: number;
  siteLng: number;
  currentLat: number;
  currentLng: number;
  radiusMeters: number;
  accuracyMeters?: number | null;
}): GeofenceResult {
  const distanceMeters = haversineMeters(
    params.siteLat,
    params.siteLng,
    params.currentLat,
    params.currentLng
  );

  let warning = "";
  if (params.accuracyMeters && params.accuracyMeters > 30) {
    warning = "GPS accuracy is low. Try waiting for a stronger location fix.";
  }

  return {
    distanceMeters: Math.round(distanceMeters),
    withinGeofence: distanceMeters <= params.radiusMeters,
    radiusMeters: params.radiusMeters,
    accuracyMeters: params.accuracyMeters,
    warning: warning || undefined
  };
}