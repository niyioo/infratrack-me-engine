import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/lib/theme/tokens";

interface CaptureReviewScreenProps {
  uri?: string;
  capturedAt?: string;
  siteAddress?: string | null;
  latitude?: number;
  longitude?: number;
  networkLabel?: string;
  syncAdvice?: string;
  onSubmit?: () => void;
  onSaveOffline?: () => void;
  submitting?: boolean;
  savingOffline?: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCoords(lat?: number, lng?: number) {
  if (lat === undefined || lng === undefined) return "Location unavailable";
  return `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function MetaRow({
  iconName,
  label,
  value,
  accent,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.metaRow}>
      <View style={[styles.metaIconBox, accent && styles.metaIconBoxAccent]}>
        <Ionicons
          name={iconName}
          size={16}
          color={accent ? colors.brand : colors.slate500}
        />
      </View>
      <View style={styles.metaContent}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
      </View>
    </View>
  );
}

function TrustSignal({
  iconName,
  label,
  value,
  tone,
}: {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone: "success" | "warning" | "neutral";
}) {
  const toneColors = {
    success: { bg: "#ECFDF5", border: "#A7F3D0", icon: colors.success, text: "#065F46" },
    warning: { bg: "#FFFBEB", border: "#FDE68A", icon: colors.warning, text: "#92400E" },
    neutral: { bg: colors.slate50, border: colors.slate200, icon: colors.slate500, text: colors.slate700 },
  }[tone];

  return (
    <View
      style={[
        styles.trustCard,
        { backgroundColor: toneColors.bg, borderColor: toneColors.border },
      ]}
    >
      <Ionicons name={iconName} size={18} color={toneColors.icon} />
      <View style={styles.trustCardText}>
        <Text style={[styles.trustLabel, { color: toneColors.text }]}>{label}</Text>
        <Text style={[styles.trustValue, { color: toneColors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

export function CaptureReviewScreen({
  uri,
  capturedAt,
  siteAddress,
  latitude,
  longitude,
  networkLabel = "Network status unavailable",
  syncAdvice = "Submitting will sync this evidence immediately. If offline, save to the queue.",
  onSubmit,
  onSaveOffline,
  submitting = false,
  savingOffline = false,
}: CaptureReviewScreenProps) {
  const hasCapture =
    !!uri && !!capturedAt && latitude !== undefined && longitude !== undefined;
  const hasLocation = latitude !== undefined && longitude !== undefined;
  const isOnline = networkLabel.toLowerCase().includes("online") ||
    networkLabel.toLowerCase().includes("connected");

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={20} color={colors.white} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headerBadge}>
            <Ionicons name="camera" size={11} color={colors.accent} />
            <Text style={styles.headerBadgeText}>EVIDENCE REVIEW</Text>
          </View>
          <Text style={styles.headerTitle}>Review Capture</Text>
          <Text style={styles.headerSubtitle}>
            Confirm details before submitting or saving to offline queue.
          </Text>
        </View>

        <View style={styles.body}>
          {/* ── Image preview ──────────────────────────────────────── */}
          {hasCapture ? (
            <View style={styles.imageCard}>
              <Image source={{ uri }} style={styles.image} resizeMode="cover" />
              <View style={styles.imageOverlayTag}>
                <View style={styles.recordingDot} />
                <Text style={styles.imageOverlayText}>Field Evidence</Text>
              </View>
              {hasLocation && (
                <View style={styles.imageLocationTag}>
                  <Ionicons name="location" size={10} color={colors.white} />
                  <Text style={styles.imageLocationText}>{formatCoords(latitude, longitude)}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="image-outline" size={32} color={colors.slate300} />
              <Text style={styles.emptyTitle}>No capture loaded</Text>
              <Text style={styles.emptyText}>
                Return to the capture screen and take a photo before reviewing.
              </Text>
            </View>
          )}

          {/* ── Capture details ─────────────────────────────────────── */}
          {hasCapture && (
            <View style={styles.card}>
              <SectionLabel label="Capture Details" />
              <MetaRow
                iconName="calendar-outline"
                label="Date Captured"
                value={formatDate(capturedAt!)}
              />
              <View style={styles.separator} />
              <MetaRow
                iconName="time-outline"
                label="Time"
                value={formatTime(capturedAt!)}
              />
              <View style={styles.separator} />
              <MetaRow
                iconName="location-outline"
                label="Site Address"
                value={siteAddress?.trim() || "No site address linked"}
                accent={!!siteAddress?.trim()}
              />
              <View style={styles.separator} />
              <MetaRow
                iconName="navigate-outline"
                label="Coordinates"
                value={formatCoords(latitude, longitude)}
                accent={hasLocation}
              />
            </View>
          )}

          {/* ── Trust signals ─────────────────────────────────────── */}
          {hasCapture && (
            <View style={styles.card}>
              <SectionLabel label="Trust Signals" />
              <View style={styles.trustGrid}>
                <TrustSignal
                  iconName={hasLocation ? "shield-checkmark" : "shield-outline"}
                  label="Location"
                  value={hasLocation ? "Verified" : "Missing"}
                  tone={hasLocation ? "success" : "warning"}
                />
                <TrustSignal
                  iconName={isOnline ? "wifi" : "wifi-outline"}
                  label="Connectivity"
                  value={isOnline ? "Online" : "Offline"}
                  tone={isOnline ? "success" : "warning"}
                />
              </View>
            </View>
          )}

          {/* ── Sync advice ───────────────────────────────────────── */}
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle" size={18} color="#2563EB" />
            <Text style={styles.noticeText}>{syncAdvice}</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Footer actions ────────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, (!hasCapture || submitting || savingOffline) && styles.btnDisabled]}
          onPress={onSubmit}
          disabled={!hasCapture || submitting || savingOffline}
          activeOpacity={0.85}
        >
          {submitting ? (
            <View style={styles.btnInner}>
              <Ionicons name="cloud-upload-outline" size={18} color={colors.white} />
              <Text style={styles.submitText}>Submitting…</Text>
            </View>
          ) : (
            <View style={styles.btnInner}>
              <Ionicons name="cloud-upload" size={18} color={colors.white} />
              <Text style={styles.submitText}>Submit Now</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.queueBtn, (!hasCapture || submitting || savingOffline) && styles.btnDisabled]}
          onPress={onSaveOffline}
          disabled={!hasCapture || submitting || savingOffline}
          activeOpacity={0.85}
        >
          {savingOffline ? (
            <View style={styles.btnInner}>
              <Ionicons name="save-outline" size={18} color={colors.slate600} />
              <Text style={styles.queueText}>Saving…</Text>
            </View>
          ) : (
            <View style={styles.btnInner}>
              <Ionicons name="save-outline" size={18} color={colors.slate600} />
              <Text style={styles.queueText}>Save to Offline Queue</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.footerHint}>
          {isOnline
            ? "Connected — submit immediately or queue for batch sync."
            : "Offline — save to queue and submit when connectivity is restored."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.slate100,
  },
  scroll: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.xl,
    paddingBottom: spacing["2xl"],
    gap: 10,
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
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#132B4A",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  headerBadgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.slate400,
    lineHeight: 18,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  imageCard: {
    borderRadius: radius.lg,
    overflow: "hidden",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
    position: "relative",
  },
  image: {
    width: "100%",
    height: 260,
    backgroundColor: colors.slate200,
  },
  imageOverlayTag: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(15,23,42,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  recordingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  imageOverlayText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  imageLocationTag: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15,23,42,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  imageLocationText: {
    color: colors.slate200,
    fontSize: 10,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 32,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.slate500,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 18,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    gap: 14,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.slate400,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.slate100,
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
    backgroundColor: colors.slate50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.slate100,
  },
  metaIconBoxAccent: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brandMuted,
  },
  metaContent: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: colors.slate400,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    color: colors.ink,
    fontWeight: "600",
    lineHeight: 19,
  },
  separator: {
    height: 1,
    backgroundColor: colors.slate100,
    marginHorizontal: -2,
  },
  trustGrid: {
    flexDirection: "row",
    gap: 10,
  },
  trustCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  trustCardText: {
    flex: 1,
    gap: 2,
  },
  trustLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trustValue: {
    fontSize: 13,
    fontWeight: "700",
  },
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
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: "#1D4ED8",
    lineHeight: 18,
    fontWeight: "500",
  },
  footer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
    gap: 10,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  submitBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: 16,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.1,
  },
  queueBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.slate50,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  queueText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate600,
    letterSpacing: 0.1,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  footerHint: {
    textAlign: "center",
    fontSize: 11,
    color: colors.slate400,
    fontWeight: "500",
    lineHeight: 15,
  },
});
