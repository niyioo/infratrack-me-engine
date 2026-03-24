import { View, Text, Pressable, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { useProjects } from "@/features/projects/hooks";
import { AppLoader } from "@/components/ui/AppLoader";
import { clearTokens } from "@/features/auth/storage";

// ─── Status config ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  NOT_STARTED: { label: "Not Started", dot: "#94A3B8", text: "#475569", bg: "#F1F5F9" },
  ACTIVE:      { label: "Active",      dot: "#3B82F6", text: "#1D4ED8", bg: "#EFF6FF" },
  COMPLETED:   { label: "Completed",   dot: "#10B981", text: "#065F46", bg: "#ECFDF5" },
  DEFAULT:     { label: "Paused",      dot: "#EF4444", text: "#991B1B", bg: "#FEF2F2" },
};

const RISK_CONFIG: Record<string, { label: string; color: string; bar: string }> = {
  LOW:    { label: "Low Risk",  color: "#10B981", bar: "#ECFDF5" },
  MEDIUM: { label: "Med Risk",  color: "#F59E0B", bar: "#FFFBEB" },
  HIGH:   { label: "High Risk", color: "#EF4444", bar: "#FEF2F2" },
  DEFAULT:{ label: "Unknown",   color: "#94A3B8", bar: "#F8FAFC" },
};

function getStatus(key: string) {
  return STATUS_CONFIG[key] ?? STATUS_CONFIG.DEFAULT;
}
function getRisk(key: string) {
  return RISK_CONFIG[key] ?? RISK_CONFIG.DEFAULT;
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <View style={[styles.kpiCard, { borderTopColor: accent, borderTopWidth: 3 }]}>
      <Text style={[styles.kpiValue, { color: accent }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

// ─── Project Card ───────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: any }) {
  const status = getStatus(project.current_status);
  const risk   = getRisk(project.risk_status);

  return (
    <Pressable
      onPress={() => router.push(`/(main)/project/${project.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={[styles.cardAccent, { backgroundColor: status.dot }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardTitle} numberOfLines={2}>{project.title}</Text>
            <Text style={styles.cardCode}>{project.project_code}</Text>
          </View>
          <View style={[styles.riskBadge, { backgroundColor: risk.bar }]}>
            <View style={[styles.riskDot, { backgroundColor: risk.color }]} />
            <Text style={[styles.riskText, { color: risk.color }]}>{risk.label}</Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText}>{project.lga}, {project.state}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
          <View style={styles.ctaButton}>
            <Text style={styles.ctaText}>View Details</Text>
            <Text style={styles.ctaArrow}>→</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function AssignedProjectsScreen() {
  const { data: projects = [], isLoading } = useProjects();

  async function handleLogout() {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await clearTokens(); // clears access, refresh, and user in one go
            router.replace("/(auth)/login");
          },
        },
      ]
    );
  }

  if (isLoading) return <AppLoader label="Loading assignments..." />;

  const total     = projects.length;
  const active    = projects.filter((p: any) => p.current_status !== "COMPLETED").length;
  const completed = projects.filter((p: any) => p.current_status === "COMPLETED").length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>FIELD MONITOR</Text>
          </View>

          {/* LOGOUT BUTTON */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.75}
          >
            <Text style={styles.logoutIcon}>⎋</Text>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.headerTitle}>My Assignments</Text>
        <Text style={styles.headerSubtitle}>
          Track progress and capture field evidence
        </Text>
      </View>

      {/* ── KPI ROW ── */}
      <View style={styles.kpiRow}>
        <KpiCard label="Total"  value={total}     accent="#64748B" />
        <KpiCard label="Active" value={active}    accent="#3B82F6" />
        <KpiCard label="Done"   value={completed} accent="#10B981" />
      </View>

      {/* ── SECTION HEADING ── */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Projects</Text>
        <View style={styles.sectionCount}>
          <Text style={styles.sectionCountText}>{total}</Text>
        </View>
      </View>

      {/* ── PROJECT LIST ── */}
      <View style={styles.list}>
        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No assignments yet</Text>
            <Text style={styles.emptyText}>
              Projects assigned to you will appear here.
            </Text>
          </View>
        ) : (
          projects.map((project: any) => (
            <ProjectCard key={project.id} project={project} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  container: {
    paddingBottom: 40,
  },

  // Header
  header: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerBadge: {
    alignSelf: "flex-start",
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

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  logoutIcon: {
    fontSize: 13,
    color: "#F87171",
  },
  logoutText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F87171",
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#F8FAFC",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
  },

  // KPI
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: -16,
    marginBottom: 4,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    alignItems: "center",
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },

  // Section heading
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    letterSpacing: 0.2,
  },
  sectionCount: {
    backgroundColor: "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },

  // List
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  cardAccent: {
    height: 4,
    width: "100%",
  },
  cardBody: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 21,
  },
  cardCode: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 3,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  riskText: {
    fontSize: 11,
    fontWeight: "700",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 4,
  },
  locationIcon: {
    fontSize: 12,
  },
  locationText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginTop: 14,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  ctaArrow: {
    fontSize: 13,
    color: "#2563EB",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },
});
