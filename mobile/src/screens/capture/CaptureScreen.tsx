import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LiveCameraCapture } from "@/components/capture/LiveCameraCapture";
import { GeofenceStatusBanner } from "@/components/capture/GeofenceStatusBanner";
import { AccuracyNotice } from "@/components/location/AccuracyNotice";
import { LocationPermissionGate } from "@/components/location/LocationPermissionGate";
import { AppCard } from "@/components/ui/AppCard";
import { AppScreen } from "@/components/ui/AppScreen";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { validateGeofence } from "@/features/geofence/service";
import { setCaptureDraft } from "@/features/evidence/captureDraft";
import { colors, radius, spacing, typography } from "@/lib/theme/tokens";

function buildIdempotencyKey() {
  return `capture-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CaptureScreen() {
  const params = useLocalSearchParams<{
    projectId?: string;
    milestoneId?: string;
    siteAddress?: string;
    siteLat?: string;
    siteLng?: string;
    radiusMeters?: string;
  }>();
  const { location } = useCurrentLocation();

  const siteLat = params.siteLat ? Number(params.siteLat) : null;
  const siteLng = params.siteLng ? Number(params.siteLng) : null;
  const radiusMeters = params.radiusMeters ? Number(params.radiusMeters) : 50;

  const geofence = useMemo(() => {
    if (!location || siteLat === null || siteLng === null) return null;
    return validateGeofence({
      siteLat,
      siteLng,
      currentLat: location.coords.latitude,
      currentLng: location.coords.longitude,
      radiusMeters,
      accuracyMeters: location.coords.accuracy,
    });
  }, [location, siteLat, siteLng, radiusMeters]);

  const hasGeofenceContext = siteLat !== null && siteLng !== null;
  const canCapture = !hasGeofenceContext || !geofence || geofence.withinGeofence;
  const gpsReady = !!location;

  return (
    <AppScreen scroll contentContainerStyle={styles.content} style={styles.screen}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Back row */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={20} color={colors.white} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Title row */}
        <View style={styles.titleRow}>
          <View style={styles.titleLeft}>
            <View style={styles.captureChip}>
              <Ionicons name="camera" size={12} color={colors.accent} />
              <Text style={styles.captureChipText}>Field Capture</Text>
            </View>
            <Text style={styles.headerTitle}>Capture Evidence</Text>
          </View>

          {/* GPS status pill */}
          <View style={[styles.gpsPill, gpsReady ? styles.gpsPillReady : styles.gpsPillWaiting]}>
            <View
              style={[
                styles.gpsDot,
                { backgroundColor: gpsReady ? colors.success : colors.warning },
              ]}
            />
            <Text style={styles.gpsText}>{gpsReady ? "GPS Ready" : "Locating…"}</Text>
          </View>
        </View>

        {params.siteAddress ? (
          <View style={styles.siteRow}>
            <Ionicons name="location-outline" size={13} color={colors.slate400} />
            <Text style={styles.siteText} numberOfLines={1}>
              {params.siteAddress}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <View style={styles.body}>
        <LocationPermissionGate>
          {/* Geofence banner */}
          {geofence ? (
            <GeofenceStatusBanner
              withinGeofence={geofence.withinGeofence}
              distanceMeters={geofence.distanceMeters}
              radiusMeters={geofence.radiusMeters}
              warning={geofence.warning}
            />
          ) : hasGeofenceContext ? (
            <View style={styles.statusCard}>
              <Ionicons name="radio-outline" size={18} color={colors.brand} />
              <View style={styles.statusCardText}>
                <Text style={styles.statusCardTitle}>Preparing geofence…</Text>
                <Text style={styles.statusCardBody}>
                  Calculating the approved site boundary for this project.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.statusCard}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
              <View style={styles.statusCardText}>
                <Text style={styles.statusCardTitle}>Camera ready</Text>
                <Text style={styles.statusCardBody}>
                  Link this capture to a project for full geo-verification.
                </Text>
              </View>
            </View>
          )}

          <AccuracyNotice accuracy={location?.coords.accuracy} />

          {/* Camera card */}
          <AppCard>
            <View style={styles.cameraHeader}>
              <View style={styles.cameraHeaderLeft}>
                <Text style={styles.cameraTitle}>Live Camera</Text>
                <Text style={styles.cameraSubtitle}>
                  Geo-stamped field evidence capture
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  canCapture ? styles.statusPillReady : styles.statusPillBlocked,
                ]}
              >
                <Ionicons
                  name={canCapture ? "checkmark-circle" : "ban-outline"}
                  size={12}
                  color={canCapture ? colors.success : colors.danger}
                />
                <Text
                  style={[
                    styles.statusPillText,
                    { color: canCapture ? colors.success : colors.danger },
                  ]}
                >
                  {canCapture ? "Ready" : "Blocked"}
                </Text>
              </View>
            </View>

            <LiveCameraCapture
              onCaptured={(asset) => {
                if (!asset || !location) return;
                setCaptureDraft({
                  idempotencyKey: buildIdempotencyKey(),
                  uri: asset.uri,
                  capturedAt: new Date().toISOString(),
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  siteAddress: params.siteAddress,
                  accuracyMeters: location.coords.accuracy,
                  projectId: params.projectId ? Number(params.projectId) : undefined,
                  milestoneId: params.milestoneId ? Number(params.milestoneId) : undefined,
                  siteLat,
                  siteLng,
                  radiusMeters,
                });
                router.push("/(main)/capture-review");
              }}
              disabled={!canCapture}
            />
          </AppCard>
        </LocationPermissionGate>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.slate100,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.xl,
    paddingBottom: spacing["2xl"],
    gap: spacing.md,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  backText: {
    ...typography.caption,
    color: colors.slate300,
    fontWeight: "600",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  titleLeft: {
    flex: 1,
    gap: 8,
  },
  captureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#132B4A",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  captureChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.3,
  },
  gpsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  gpsPillReady: {
    backgroundColor: "#0C2A0C",
    borderWidth: 1,
    borderColor: "#166534",
  },
  gpsPillWaiting: {
    backgroundColor: "#2A1F06",
    borderWidth: 1,
    borderColor: "#92400E",
  },
  gpsDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  gpsText: {
    ...typography.caption,
    color: colors.slate100,
    fontSize: 11,
  },
  siteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  siteText: {
    flex: 1,
    fontSize: 12,
    color: colors.slate400,
    fontWeight: "500",
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing.lg,
  },
  statusCardText: {
    flex: 1,
    gap: 3,
  },
  statusCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  statusCardBody: {
    fontSize: 12,
    color: colors.slate500,
    lineHeight: 17,
  },
  cameraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  cameraHeaderLeft: {
    flex: 1,
    gap: 3,
  },
  cameraTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  cameraSubtitle: {
    fontSize: 12,
    color: colors.slate500,
    fontWeight: "500",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusPillReady: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  statusPillBlocked: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
