export type GeofenceResult = {
  distanceMeters: number;
  withinGeofence: boolean;
  radiusMeters: number;
  accuracyMeters?: number | null;
  warning?: string;
};