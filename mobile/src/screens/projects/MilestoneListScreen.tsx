import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useMilestones } from "@/features/milestones/hooks";
import { AppLoader } from "@/components/ui/AppLoader";

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  NOT_STARTED: { label: "Not Started", dot: "#94A3B8", text: "#475569", bg: "#F1F5F9" },
  IN_PROGRESS: { label: "In Progress", dot: "#3B82F6", text: "#1D4ED8", bg: "#EFF6FF" },
  COMPLETED:   { label: "Completed",   dot: "#10B981", text: "#065F46", bg: "#ECFDF5" },
  OVERDUE:     { label: "Overdue",     dot: "#EF4444", text: "#991B1B", bg: "#FEF2F2" },
  DEFAULT:     { label: "Pending",     dot: "#F59E0B", text: "#92400E", bg: "#FFFBEB" },
};

function getStatus(key: string) {
  return STATUS_CONFIG[key] ?? STATUS_CONFIG.DEFAULT;
}

function formatDueDate(raw: string) {
  if (!raw) return "—";
  const d = new Date(raw);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const formatted = d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (diffDays < 0)  return { label: formatted, overdue: true, daysNote: `${Math.abs(diffDays)}d overdue` };
  if (diffDays === 0) return { label: "Today",   overdue: false, daysNote: "Due today" };
  if (diffDays <= 3)  return { label: formatted, overdue: false, daysNote: `${diffDays}d left` };
  return { label: formatted, overdue: false, daysNote: null };
}

// ─── Milestone Card ──────────────────────────────────────────────────────────

function MilestoneCard({
  item,
  projectId,
  index,
}: {
  item: any;
  projectId: string;
  index: number;
}) {
  const status  = getStatus(item.current_status);
  const due     = formatDueDate(item.due_date);
  const dueMeta = typeof due === "object" ? due : { label: due, overdue: false, daysNote: null };

  return (
    <View style={styles.card}>
      {/* LEFT accent bar coloured by status */}
      <View style={[styles.cardBar, { backgroundColor: status.dot }]} />

      <View style={styles.cardBody}>
        {/* TOP ROW */}
        <View style={styles.cardTop}>
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{String(index + 1).padStart(2, "0")}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        {/* TITLE */}
        <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>

        {/* DUE DATE */}
        <View style={styles.dueRow}>
          <Text style={styles.dueIcon}>📅</Text>
          <Text style={[styles.dueLabel, dueMeta.overdue && styles.dueLabelOverdue]}>
            {dueMeta.label}
          </Text>
          {dueMeta.daysNote ? (
            <View style={[styles.dueNote, { backgroundColor: dueMeta.overdue ? "#FEE2E2" : "#FEF9C3" }]}>
              <Text style={[styles.dueNoteText, { color: dueMeta.overdue ? "#DC2626" : "#A16207" }]}>
                {dueMeta.daysNote}
              </Text>
            </View>
          ) : null}
        </View>

        {/* DIVIDER */}
        <View style={styles.divider} />

        {/* CTA */}
        <TouchableOpacity
          style={styles.captureBtn}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/(main)/capture",
              params: { projectId, milestoneId: item.id },
            })
          }
        >
          <Text style={styles.captureBtnIcon}>📷</Text>
          <Text style={styles.captureBtnText}>Start Capture</Text>
          <Text style={styles.captureBtnArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function MilestoneListScreen({ route, navigation }: any) {
  const { projectId } = route.params;
  const { data: milestones = [], isLoading } = useMilestones({ project: projectId });

  if (isLoading) return <AppLoader label="Loading milestones..." />;

  const total     = milestones.length;
  const completed = milestones.filter((m: any) => m.current_status === "COMPLETED").length;
  const overdue   = milestones.filter((m: any) => m.current_status === "OVERDUE").length;
  const progress  = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <View style={styles.screen}>
      <FlatList
        data={milestones}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}

        ListHeaderComponent={
          <>
            {/* ── HEADER ── */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>

              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>PROJECT MILESTONES</Text>
              </View>
              <Text style={styles.headerTitle}>Milestones</Text>
              <Text style={styles.headerSubtitle}>
                Track and capture each project milestone in the field
              </Text>
            </View>

            {/* ── PROGRESS CARD ── */}
            <View style={styles.progressCard}>
              <View style={styles.progressTop}>
                <Text style={styles.progressLabel}>Overall Progress</Text>
                <Text style={styles.progressPct}>{progress}%</Text>
              </View>

              {/* Bar */}
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>

              {/* KPI pills */}
              <View style={styles.kpiRow}>
                <View style={styles.kpiPill}>
                  <Text style={styles.kpiValue}>{total}</Text>
                  <Text style={styles.kpiLabel}>Total</Text>
                </View>
                <View style={[styles.kpiPill, { backgroundColor: "#ECFDF5" }]}>
                  <Text style={[styles.kpiValue, { color: "#10B981" }]}>{completed}</Text>
                  <Text style={[styles.kpiLabel, { color: "#065F46" }]}>Done</Text>
                </View>
                {overdue > 0 ? (
                  <View style={[styles.kpiPill, { backgroundColor: "#FEF2F2" }]}>
                    <Text style={[styles.kpiValue, { color: "#EF4444" }]}>{overdue}</Text>
                    <Text style={[styles.kpiLabel, { color: "#991B1B" }]}>Overdue</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* ── LIST HEADING ── */}
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>All Milestones</Text>
              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>{total}</Text>
              </View>
            </View>
          </>
        }

        renderItem={({ item, index }) => (
          <MilestoneCard item={item} projectId={projectId} index={index} />
        )}

        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}

        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏗️</Text>
            <Text style={styles.emptyTitle}>No milestones yet</Text>
            <Text style={styles.emptyText}>
              Milestones for this project will appear here once they are assigned.
            </Text>
          </View>
        }

        ListFooterComponent={<View style={{ height: 32 }} />}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  listContent: {
    paddingBottom: 8,
  },

  // Header
  header: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  backBtn: { marginBottom: 16 },
  backText: { color: "#60A5FA", fontSize: 13, fontWeight: "600" },
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

  // Progress card
  progressCard: {
    margin: 16,
    marginBottom: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  progressPct: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2563EB",
    letterSpacing: -0.5,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 4,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  kpiPill: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.3,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: 2,
  },

  // Section heading
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 20,
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
  sectionCountText: { fontSize: 11, fontWeight: "700", color: "#64748B" },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardBar: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  indexBadge: {
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  indexText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 21,
  },

  // Due date
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dueIcon: { fontSize: 12 },
  dueLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  dueLabelOverdue: {
    color: "#DC2626",
  },
  dueNote: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  dueNoteText: {
    fontSize: 10,
    fontWeight: "700",
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  // Capture CTA
  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  captureBtnIcon: { fontSize: 13 },
  captureBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  captureBtnArrow: {
    fontSize: 13,
    color: "#2563EB",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
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
