import { Platform } from "react-native";

export function buildCaptureMetadata(params: {
  projectId: number;
  milestoneId: number;
  userId: number;
  sourceType: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  capturedAt: string;
  offlineCreatedAt?: string | null;
}) {
  return {
    project_id: params.projectId,
    milestone_id: params.milestoneId,
    user_id: params.userId,
    source_type: params.sourceType,
    latitude: params.latitude,
    longitude: params.longitude,
    accuracy_meters: params.accuracyMeters ?? null,
    captured_at: params.capturedAt,
    offline_created_at: params.offlineCreatedAt ?? null,
    capture_mode: "LIVE_IN_APP",
    device_platform: Platform.OS
  };
}