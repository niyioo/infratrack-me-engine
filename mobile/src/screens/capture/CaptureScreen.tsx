import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { LiveCameraCapture } from "@/components/capture/LiveCameraCapture";
import { GeofenceStatusBanner } from "@/components/capture/GeofenceStatusBanner";
import { LocationPermissionGate } from "@/components/location/LocationPermissionGate";
import { AccuracyNotice } from "@/components/location/AccuracyNotice";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { validateGeofence } from "@/features/geofence/service";

export function CaptureScreen() {
  const [asset, setAsset] = useState<any | null>(null);
  const { location } = useCurrentLocation();

  const geofence = location
    ? validateGeofence({
        siteLat: 7.25,
        siteLng: 5.22,
        currentLat: location.coords.latitude,
        currentLng: location.coords.longitude,
        radiusMeters: 50,
        accuracyMeters: location.coords.accuracy,
      })
    : null;

  return (
    <View style={styles.screen}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>FIELD CAPTURE</Text>
          </View>

          {/* GPS live indicator */}
          <View style={styles.gpsPill}>
            <View style={[styles.gpsDot, { backgroundColor: location ? "#10B981" : "#F59E0B" }]} />
            <Text style={styles.gpsText}>{location ? "GPS Active" : "Acquiring…"}</Text>
          </View>
        </View>

        <Text style={styles.headerTitle}>Capture Evidence</Text>
        <Text style={styles.headerSubtitle}>
          Stay within the site boundary before capturing
        </Text>
      </View>

      {/* ── BODY ── */}
      <View style={styles.body}>
        <LocationPermissionGate>

          {/* GEOFENCE BANNER */}
          {geofence ? (
            <View style={styles.section}>
              <GeofenceStatusBanner
                withinGeofence={geofence.withinGeofence}
                distanceMeters={geofence.distanceMeters}
                radiusMeters={geofence.radiusMeters}
                warning={geofence.warning}
              />
            </View>
          ) : (
            <View style={styles.geofencePlaceholder}>
              <View style={styles.geofencePulse} />
              <Text style={styles.geofencePlaceholderText}>
                Calculating geofence…
              </Text>
            </View>
          )}

          {/* ACCURACY NOTICE */}
          <View style={styles.section}>
            <AccuracyNotice accuracy={location?.coords.accuracy} />
          </View>

          {/* CAMERA CAPTURE */}
          <View style={styles.cameraCard}>
            <View style={styles.cameraCardHeader}>
              <Text style={styles.cameraCardLabel}>📷  Camera</Text>
              <View style={styles.cameraCardBadge}>
                <Text style={styles.cameraCardBadgeText}>TAP TO CAPTURE</Text>
              </View>
            </View>

            <View style={styles.cameraWrapper}>
              <LiveCameraCapture onCaptured={setAsset} />
            </View>
          </View>

          {/* CAPTURE READY BANNER */}
          {asset ? (
            <TouchableOpacity
              style={styles.readyBanner}
              onPress={() => router.push("/(main)/capture/review")}
              activeOpacity={0.85}
            >
              <View style={styles.readyLeft}>
                <Text style={styles.readyIcon}>✅</Text>
                <View>
                  <Text style={styles.readyTitle}>Capture ready</Text>
                  <Text style={styles.readySubtitle}>Tap to review before submitting</Text>
                </View>
              </View>
              <Text style={styles.readyArrow}>→</Text>
            </TouchableOpacity>
          ) : null}

        </LocationPermissionGate>
      </View>

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  // Header
  header: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  backBtn: {
    marginBottom: 16,
  },
  backText: {
    color: "#60A5FA",
    fontSize: 13,
    fontWeight: "600",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerBadge: {
    backgroundColor: "#1E3A5F",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  headerBadgeText: {
    color: "#60A5FA",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  // GPS pill
  gpsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  gpsDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  gpsText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#F8FAFC",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
    lineHeight: 18,
  },

  // Body
  body: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  section: {
    // wrapper to keep gap consistent
  },

  // Geofence loading placeholder
  geofencePlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  geofencePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F59E0B",
  },
  geofencePlaceholderText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },

  // Camera card
  cameraCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cameraCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cameraCardLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  cameraCardBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  cameraCardBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#2563EB",
    letterSpacing: 1,
  },
  cameraWrapper: {
    minHeight: 260,
    backgroundColor: "#0F172A",
  },

  // Capture ready banner
  readyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    borderWidth: 1.5,
    borderColor: "#6EE7B7",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  readyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  readyIcon: {
    fontSize: 22,
  },
  readyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46",
  },
  readySubtitle: {
    fontSize: 12,
    color: "#6EE7B7",
    marginTop: 1,
  },
  readyArrow: {
    fontSize: 18,
    color: "#10B981",
    fontWeight: "700",
  },
});
