import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";

// ─── Props (wire up real state later) ────────────────────────────────────────

interface CaptureReviewScreenProps {
  uri?: string;
  capturedAt?: string;
  latitude?: number;
  longitude?: number;
  onSubmit?: () => void;
  onSaveOffline?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCoords(lat: number, lng: number) {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}° ${latDir},  ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
}

// ─── Meta Row ────────────────────────────────────────────────────────────────

function MetaRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaIconBox}>
        <Text style={styles.metaIcon}>{icon}</Text>
      </View>
      <View style={styles.metaContent}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function CaptureReviewScreen({
  uri = "https://via.placeholder.com/600x400",
  capturedAt = new Date().toISOString(),
  latitude = 7.25,
  longitude = 5.22,
  onSubmit,
  onSaveOffline,
}: CaptureReviewScreenProps) {
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>EVIDENCE REVIEW</Text>
          </View>
          <Text style={styles.headerTitle}>Review Capture</Text>
          <Text style={styles.headerSubtitle}>
            Confirm evidence details before sync or offline save
          </Text>
        </View>

        <View style={styles.body}>

          {/* ── IMAGE CARD ── */}
          <View style={styles.imageCard}>
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode="cover"
            />
            {/* Overlay tag */}
            <View style={styles.imageOverlayTag}>
              <View style={styles.recordingDot} />
              <Text style={styles.imageOverlayText}>Field Evidence</Text>
            </View>
          </View>

          {/* ── METADATA CARD ── */}
          <View style={styles.card}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Capture Details</Text>
              <View style={styles.sectionLine} />
            </View>

            <MetaRow
              icon="📅"
              label="Date Captured"
              value={formatDate(capturedAt)}
            />
            <View style={styles.separator} />
            <MetaRow
              icon="🕐"
              label="Time"
              value={formatTime(capturedAt)}
            />
            <View style={styles.separator} />
            <MetaRow
              icon="📍"
              label="GPS Coordinates"
              value={formatCoords(latitude, longitude)}
            />
          </View>

          {/* ── STATUS NOTICE ── */}
          <View style={styles.noticeCard}>
            <Text style={styles.noticeIcon}>ℹ️</Text>
            <Text style={styles.noticeText}>
              Submitting will sync this evidence immediately. If offline, use{" "}
              <Text style={styles.noticeBold}>Save to Queue</Text> — it will
              auto-sync when connectivity is restored.
            </Text>
          </View>

        </View>
      </ScrollView>

      {/* ── STICKY ACTIONS ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={onSubmit}
          activeOpacity={0.88}
        >
          <Text style={styles.submitIcon}>☁️</Text>
          <Text style={styles.submitText}>Submit Now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.queueBtn}
          onPress={onSaveOffline}
          activeOpacity={0.88}
        >
          <Text style={styles.queueIcon}>💾</Text>
          <Text style={styles.queueText}>Save to Offline Queue</Text>
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
  scroll: {
    paddingBottom: 24,
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
    backgroundColor: "#1E3A5F",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  headerBadgeText: {
    color: "#60A5FA",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
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
    padding: 16,
    gap: 12,
  },

  // Image card
  imageCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    position: "relative",
  },
  image: {
    width: "100%",
    height: 240,
    backgroundColor: "#CBD5E1",
  },
  imageOverlayTag: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15,23,42,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  recordingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  imageOverlayText: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Metadata card
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  metaIcon: {
    fontSize: 17,
  },
  metaContent: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: "#F8FAFC",
  },

  // Notice
  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
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
    color: "#3B82F6",
    lineHeight: 18,
  },
  noticeBold: {
    fontWeight: "700",
    color: "#1D4ED8",
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
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  submitIcon: {
    fontSize: 16,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  queueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingVertical: 14,
  },
  queueIcon: {
    fontSize: 16,
  },
  queueText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.1,
  },
});
