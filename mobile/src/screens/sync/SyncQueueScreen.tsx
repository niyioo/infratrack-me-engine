import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SyncStatusBadge } from "@/components/sync/SyncStatusBadge";

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; text: string; bg: string; icon: string; desc: string }
> = {
  PENDING: {
    label: "Pending",
    dot:   "#F59E0B",
    text:  "#92400E",
    bg:    "#FFFBEB",
    icon:  "🕐",
    desc:  "Awaiting network — will upload automatically",
  },
  FAILED: {
    label: "Failed",
    dot:   "#EF4444",
    text:  "#991B1B",
    bg:    "#FEF2F2",
    icon:  "⚠️",
    desc:  "Upload failed — tap Retry to try again",
  },
  SYNCED: {
    label: "Synced",
    dot:   "#10B981",
    text:  "#065F46",
    bg:    "#ECFDF5",
    icon:  "✅",
    desc:  "Successfully uploaded",
  },
  DEFAULT: {
    label: "Unknown",
    dot:   "#94A3B8",
    text:  "#475569",
    bg:    "#F1F5F9",
    icon:  "❓",
    desc:  "Status unknown",
  },
};

function getStatusConfig(key: string) {
  return STATUS_CONFIG[key] ?? STATUS_CONFIG.DEFAULT;
}

// ─── Mock data (wire up real queue later) ────────────────────────────────────

const mockItems = [
  { localId: "1", projectId: 1, milestoneId: 1, syncStatus: "PENDING", capturedAt: new Date().toISOString() },
  { localId: "2", projectId: 1, milestoneId: 2, syncStatus: "FAILED",  capturedAt: new Date(Date.now() - 3600000).toISOString() },
];

// ─── Queue Item Card ──────────────────────────────────────────────────────────

function QueueCard({
  item,
  index,
  onRetry,
}: {
  item: typeof mockItems[0];
  index: number;
  onRetry?: (id: string) => void;
}) {
  const cfg = getStatusConfig(item.syncStatus);
  const time = new Date(item.capturedAt).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const date = new Date(item.capturedAt).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });

  return (
    <View style={styles.card}>
      {/* Left accent bar */}
      <View style={[styles.cardBar, { backgroundColor: cfg.dot }]} />

      <View style={styles.cardBody}>
        {/* TOP */}
        <View style={styles.cardTop}>
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{String(index + 1).padStart(2, "0")}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
            <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* TITLE */}
        <Text style={styles.cardTitle}>
          Project <Text style={styles.cardIdAccent}>#{item.projectId}</Text>
          {"  ·  "}
          Milestone <Text style={styles.cardIdAccent}>#{item.milestoneId}</Text>
        </Text>

        {/* STATUS DESCRIPTION */}
        <View style={styles.descRow}>
          <Text style={styles.descIcon}>{cfg.icon}</Text>
          <Text style={styles.descText}>{cfg.desc}</Text>
        </View>

        {/* DIVIDER */}
        <View style={styles.divider} />

        {/* FOOTER: time + retry */}
        <View style={styles.cardFooter}>
          <View style={styles.timeRow}>
            <Text style={styles.timeIcon}>📅</Text>
            <Text style={styles.timeText}>{date} · {time}</Text>
          </View>

          {item.syncStatus === "FAILED" && (
            <TouchableOpacity
              style={styles.retryBtn}
              activeOpacity={0.8}
              onPress={() => onRetry?.(item.localId)}
            >
              <Text style={styles.retryIcon}>🔄</Text>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}

          {/* Keep SyncStatusBadge for whatever internal logic it carries */}
          <View style={styles.badgeWrap}>
            <SyncStatusBadge status={item.syncStatus as any} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function SyncQueueScreen() {
  const pending = mockItems.filter((i) => i.syncStatus === "PENDING").length;
  const failed  = mockItems.filter((i) => i.syncStatus === "FAILED").length;
  const total   = mockItems.length;

  function handleRetry(localId: string) {
    // wire up real retry logic here
    console.log("Retry:", localId);
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={mockItems}
        keyExtractor={(item) => item.localId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}

        ListHeaderComponent={
          <>
            {/* ── HEADER ── */}
            <View style={styles.header}>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>OFFLINE QUEUE</Text>
              </View>
              <Text style={styles.headerTitle}>Sync Queue</Text>
              <Text style={styles.headerSubtitle}>
                Offline evidence awaiting upload or retry
              </Text>
            </View>

            {/* ── KPI ROW ── */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { borderTopColor: "#64748B" }]}>
                <Text style={[styles.kpiValue, { color: "#64748B" }]}>{total}</Text>
                <Text style={styles.kpiLabel}>Total</Text>
              </View>
              <View style={[styles.kpiCard, { borderTopColor: "#F59E0B" }]}>
                <Text style={[styles.kpiValue, { color: "#F59E0B" }]}>{pending}</Text>
                <Text style={styles.kpiLabel}>Pending</Text>
              </View>
              <View style={[styles.kpiCard, { borderTopColor: "#EF4444" }]}>
                <Text style={[styles.kpiValue, { color: "#EF4444" }]}>{failed}</Text>
                <Text style={styles.kpiLabel}>Failed</Text>
              </View>
            </View>

            {/* ── CONNECTIVITY NOTICE ── */}
            <View style={styles.notice}>
              <Text style={styles.noticeIcon}>📡</Text>
              <Text style={styles.noticeText}>
                Pending items will sync automatically when connectivity is
                restored. Failed items require a manual retry.
              </Text>
            </View>

            {/* ── SECTION HEADING ── */}
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Queued Items</Text>
              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>{total}</Text>
              </View>
            </View>
          </>
        }

        renderItem={({ item, index }) => (
          <QueueCard item={item} index={index} onRetry={handleRetry} />
        )}

        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}

        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>☁️</Text>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyText}>
              No items in the offline queue. All captures have been synced.
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
    paddingTop: 24,
    paddingBottom: 28,
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
    borderTopWidth: 3,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },

  // Notice
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 13,
  },
  noticeIcon: { fontSize: 15, marginTop: 1 },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: "#1D4ED8",
    lineHeight: 18,
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
  cardBar: { width: 4 },
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
  statusPill: {
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
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardIdAccent: {
    color: "#2563EB",
  },
  descRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  descIcon: { fontSize: 13, marginTop: 1 },
  descText: {
    flex: 1,
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  // Footer row
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeIcon: { fontSize: 12 },
  timeText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  retryIcon: { fontSize: 12 },
  retryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  badgeWrap: {
    // hide the raw SyncStatusBadge visually if you prefer; keep it for logic
    opacity: 0,
    width: 0,
    overflow: "hidden",
  },

  // Empty
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
