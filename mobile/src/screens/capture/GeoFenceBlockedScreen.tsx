import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";

interface GeoFenceBlockedScreenProps {
  distanceMeters?: number;
  radiusMeters?: number;
  onRequestException?: () => void;
}

export function GeoFenceBlockedScreen({
  distanceMeters,
  radiusMeters = 50,
  onRequestException,
}: GeoFenceBlockedScreenProps) {
  const overshootMeters =
    distanceMeters != null ? Math.round(distanceMeters - radiusMeters) : null;

  return (
    <View style={styles.screen}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>GEOFENCE CHECK</Text>
        </View>
        <Text style={styles.headerTitle}>Capture Blocked</Text>
        <Text style={styles.headerSubtitle}>
          Your current location is outside the approved site boundary
        </Text>
      </View>

      {/* ── BODY ── */}
      <View style={styles.body}>

        {/* ICON BLOCK */}
        <View style={styles.iconWrap}>
          <View style={styles.iconRing}>
            <View style={styles.iconInner}>
              <Text style={styles.iconEmoji}>🚫</Text>
            </View>
          </View>
          <Text style={styles.iconTitle}>Outside Geofence</Text>
          {overshootMeters != null && overshootMeters > 0 ? (
            <Text style={styles.iconDistance}>
              You are{" "}
              <Text style={styles.iconDistanceBold}>{overshootMeters} m</Text>{" "}
              beyond the allowed {radiusMeters} m radius
            </Text>
          ) : null}
        </View>

        {/* REASON CARD */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.cardIconBox, { backgroundColor: "#FEF2F2" }]}>
              <Text style={styles.cardIcon}>📍</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Why am I blocked?</Text>
              <Text style={styles.cardText}>
                Field evidence must be captured within{" "}
                <Text style={styles.bold}>{radiusMeters} metres</Text> of the
                approved project site to ensure accuracy and prevent fraud.
              </Text>
            </View>
          </View>
        </View>

        {/* STEPS CARD */}
        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>What to do</Text>
            <View style={styles.sectionLine} />
          </View>

          {[
            { n: "1", text: "Move physically closer to the project site." },
            { n: "2", text: "Wait for GPS accuracy to improve — stay in the open." },
            { n: "3", text: "If movement is impossible, request an exception below." },
          ].map((step) => (
            <View key={step.n} style={styles.step}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNum}>{step.n}</Text>
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* EXCEPTION NOTICE */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeIcon}>ℹ️</Text>
          <Text style={styles.noticeText}>
            Exception requests are logged and reviewed by your supervisor.
            Only use this if you are{" "}
            <Text style={styles.noticeBold}>authorised</Text> to override the
            geofence restriction.
          </Text>
        </View>

      </View>

      {/* ── FOOTER ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => router.back()}
          activeOpacity={0.88}
        >
          <Text style={styles.retryIcon}>🔄</Text>
          <Text style={styles.retryText}>Retry Location Check</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exceptionBtn}
          onPress={onRequestException}
          activeOpacity={0.88}
        >
          <Text style={styles.exceptionIcon}>⚠️</Text>
          <Text style={styles.exceptionText}>Request Exception</Text>
        </TouchableOpacity>
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
  headerBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#3B0A0A",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  headerBadgeText: {
    color: "#FCA5A5",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FCA5A5",
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

  // Icon block
  iconWrap: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF2F2",
    borderWidth: 2,
    borderColor: "#FECACA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  iconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  iconEmoji: {
    fontSize: 28,
  },
  iconTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#991B1B",
    marginBottom: 6,
  },
  iconDistance: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  iconDistanceBold: {
    color: "#EF4444",
    fontWeight: "700",
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 14,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cardIcon: {
    fontSize: 18,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cardText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },
  bold: {
    fontWeight: "700",
    color: "#1E293B",
  },

  // Section heading
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  // Steps
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2563EB",
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },

  // Notice
  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 14,
  },
  noticeIcon: {
    fontSize: 15,
    marginTop: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
  },
  noticeBold: {
    fontWeight: "700",
    color: "#78350F",
  },

  // Footer
  footer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  retryIcon: {
    fontSize: 16,
  },
  retryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: 0.2,
  },
  exceptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FECACA",
    borderRadius: 14,
    paddingVertical: 14,
  },
  exceptionIcon: {
    fontSize: 16,
  },
  exceptionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
    letterSpacing: 0.1,
  },
});
