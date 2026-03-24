import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useProject } from "@/features/projects/hooks";
import { AppLoader } from "@/components/ui/AppLoader";

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  NOT_STARTED: { label: "Not Started", dot: "#94A3B8", text: "#475569", bg: "#F1F5F9" },
  ACTIVE:      { label: "Active",      dot: "#3B82F6", text: "#1D4ED8", bg: "#EFF6FF" },
  COMPLETED:   { label: "Completed",   dot: "#10B981", text: "#065F46", bg: "#ECFDF5" },
  DEFAULT:     { label: "Paused",      dot: "#EF4444", text: "#991B1B", bg: "#FEF2F2" },
};

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  LOW:     { label: "Low Risk",    color: "#10B981", bg: "#ECFDF5" },
  MEDIUM:  { label: "Medium Risk", color: "#F59E0B", bg: "#FFFBEB" },
  HIGH:    { label: "High Risk",   color: "#EF4444", bg: "#FEF2F2" },
  DEFAULT: { label: "Unknown",     color: "#94A3B8", bg: "#F8FAFC" },
};

function getStatus(key: string) { return STATUS_CONFIG[key] ?? STATUS_CONFIG.DEFAULT; }
function getRisk(key: string)   { return RISK_CONFIG[key]   ?? RISK_CONFIG.DEFAULT; }

// ─── Small helpers ───────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Text style={styles.infoIcon}>{icon}</Text>
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id || "");

  if (isLoading) return <AppLoader label="Loading project..." />;

  if (!project) {
    return (
      <View style={styles.errorScreen}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Project not found</Text>
        <Text style={styles.errorText}>
          This project may have been removed or you don't have access.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = getStatus(project.current_status);
  const risk   = getRisk(project.risk_status);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          {/* Back */}
          <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
            <Text style={styles.headerBackText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.headerMeta}>
            <Text style={styles.headerCode}>{project.project_code}</Text>

            {/* Status + Risk badges inline */}
            <View style={styles.headerBadges}>
              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <View style={[styles.badgeDot, { backgroundColor: status.dot }]} />
                <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
              </View>
              <View style={[styles.riskBadge, { backgroundColor: risk.bg }]}>
                <View style={[styles.badgeDot, { backgroundColor: risk.color }]} />
                <Text style={[styles.badgeText, { color: risk.color }]}>{risk.label}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.headerTitle}>{project.title}</Text>
        </View>

        {/* ── BODY ── */}
        <View style={styles.body}>

          {/* LOCATION CARD */}
          <View style={styles.card}>
            <SectionHeading title="Location" />
            <InfoRow icon="🗺️" label="State / LGA"    value={`${project.state}, ${project.lga}`} />
            <InfoRow icon="📍" label="Site Address"   value={project.site_address || "—"} />
          </View>

          {/* PROJECT INFO CARD */}
          <View style={styles.card}>
            <SectionHeading title="Project Info" />
            <InfoRow icon="🏗️" label="Project Code"   value={project.project_code} />
            {(project as any).description ? (
              <View style={styles.descBlock}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={styles.descText}>{(project as any).description}</Text>
              </View>
            ) : null}
          </View>

        </View>
      </ScrollView>

      {/* ── STICKY CTA ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.captureBtn}
          onPress={() => router.push("/(main)/capture")}
          activeOpacity={0.88}
        >
          <Text style={styles.captureBtnIcon}>📷</Text>
          <Text style={styles.captureBtnText}>Open Capture</Text>
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

  // ── Header
  header: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  headerBack: {
    marginBottom: 16,
  },
  headerBackText: {
    color: "#60A5FA",
    fontSize: 13,
    fontWeight: "600",
  },
  headerMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerCode: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerBadges: {
    flexDirection: "row",
    gap: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F8FAFC",
    letterSpacing: -0.3,
    lineHeight: 30,
  },

  // ── Body
  body: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },

  // Section heading
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
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

  // Info row
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  infoIcon: {
    fontSize: 16,
  },
  infoContent: {
    flex: 1,
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
    lineHeight: 20,
  },

  // Description
  descBlock: {
    paddingLeft: 48,
  },
  descText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },

  // ── Footer CTA
  footer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6,
  },
  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  captureBtnIcon: {
    fontSize: 18,
  },
  captureBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // ── Error state
  errorScreen: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: "#60A5FA",
    fontWeight: "700",
    fontSize: 13,
  },
});
