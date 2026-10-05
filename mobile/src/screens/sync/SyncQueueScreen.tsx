import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { submitQueuedEvidenceItem } from "@/features/evidence/api";
import { useRetryOfflineQueueItem, useRunOfflineSync, useOfflineQueue } from "@/features/sync/hooks";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { SyncStatusBadge } from "@/components/sync/SyncStatusBadge";

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; text: string; bg: string; desc: string }
> = {
  PENDING: {
    label: "Pending",
    dot: "#F59E0B",
    text: "#92400E",
    bg: "#FFFBEB",
    desc: "Awaiting connectivity and ready for the next sync cycle.",
  },
  FAILED: {
    label: "Failed",
    dot: "#EF4444",
    text: "#991B1B",
    bg: "#FEF2F2",
    desc: "Sync failed. Review the failure reason and retry when the device is stable.",
  },
  SYNCED: {
    label: "Synced",
    dot: "#10B981",
    text: "#065F46",
    bg: "#ECFDF5",
    desc: "Upload completed successfully and is now traceable in the backend.",
  },
  SYNCING: {
    label: "Syncing",
    dot: "#2563EB",
    text: "#1D4ED8",
    bg: "#EFF6FF",
    desc: "Evidence is currently being transmitted.",
  },
  DEFAULT: {
    label: "Unknown",
    dot: "#94A3B8",
    text: "#475569",
    bg: "#F1F5F9",
    desc: "Queue state is not available.",
  },
};

function getStatusConfig(key: string) {
  return STATUS_CONFIG[key] ?? STATUS_CONFIG.DEFAULT;
}

function QueueCard({
  item,
  index,
  onRetry,
}: {
  item: {
    localId: string;
    projectId: number;
    milestoneId: number;
    syncStatus: string;
    retryCount: number;
    createdAt: string;
    lastError?: string;
    lastSyncedAt?: string;
  };
  index: number;
  onRetry?: (id: string) => void;
}) {
  const cfg = getStatusConfig(item.syncStatus);
  const timestamp = new Date(item.createdAt);
  const time = timestamp.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const date = timestamp.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });

  return (
    <View style={styles.card}>
      <View style={[styles.cardBar, { backgroundColor: cfg.dot }]} />

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{String(index + 1).padStart(2, "0")}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
            <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>
          Project <Text style={styles.cardIdAccent}>#{item.projectId}</Text>
          {" | "}
          Milestone <Text style={styles.cardIdAccent}>#{item.milestoneId}</Text>
        </Text>

        <Text style={styles.descText}>{cfg.desc}</Text>
        {item.lastError ? <Text style={styles.errorText}>{item.lastError}</Text> : null}

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>
              {date} | {time}
            </Text>
            <Text style={styles.timeMeta}>Retry count: {item.retryCount}</Text>
            {item.lastSyncedAt ? (
              <Text style={styles.timeMeta}>
                Synced: {new Date(item.lastSyncedAt).toLocaleString("en-NG")}
              </Text>
            ) : null}
          </View>

          {item.syncStatus === "FAILED" ? (
            <TouchableOpacity
              style={styles.retryBtn}
              activeOpacity={0.8}
              onPress={() => onRetry?.(item.localId)}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.badgeWrap}>
            <SyncStatusBadge status={item.syncStatus as any} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function SyncQueueScreen() {
  const { data: queue = [] } = useOfflineQueue();
  const { online } = useNetworkStatus();
  const runSyncMutation = useRunOfflineSync();
  const retryMutation = useRetryOfflineQueueItem();
  const pending = queue.filter((item) => item.syncStatus === "PENDING").length;
  const failed = queue.filter((item) => item.syncStatus === "FAILED").length;
  const total = queue.length;

  async function handleRetry(localId: string) {
    try {
      await retryMutation.mutateAsync({ localId, syncHandler: submitQueuedEvidenceItem });
      Alert.alert("Retry complete", "The queued evidence item was retried successfully.");
    } catch (error) {
      Alert.alert(
        "Retry failed",
        error instanceof Error ? error.message : "The queued evidence item could not be retried."
      );
    }
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={queue}
        keyExtractor={(item) => item.localId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>OFFLINE QUEUE</Text>
              </View>
              <Text style={styles.headerTitle}>Sync Queue</Text>
              <Text style={styles.headerSubtitle}>
                Live queue visibility for field evidence awaiting upload or retry.
              </Text>
              <TouchableOpacity
                style={[styles.runSyncButton, !online && styles.runSyncButtonDisabled]}
                activeOpacity={0.85}
                onPress={() => runSyncMutation.mutate(submitQueuedEvidenceItem)}
                disabled={!online || runSyncMutation.isPending}
              >
                <Text style={styles.runSyncButtonText}>
                  {runSyncMutation.isPending ? "Running Sync..." : online ? "Run Full Sync" : "Offline"}
                </Text>
              </TouchableOpacity>
            </View>

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

            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Queued evidence remains on-device until a successful sync confirms upload and the queue item is marked synced.
              </Text>
            </View>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Queued Items</Text>
              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>{total}</Text>
              </View>
            </View>
          </>
        }
        renderItem={({ item, index }) => <QueueCard item={item} index={index} onRetry={handleRetry} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Queue is clear</Text>
            <Text style={styles.emptyText}>
              New offline evidence will appear here when uploads are deferred.
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 32 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  listContent: {
    paddingBottom: 8,
  },
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
  runSyncButton: {
    alignSelf: "flex-start",
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  runSyncButtonDisabled: {
    backgroundColor: "#475569",
  },
  runSyncButtonText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "700",
  },
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
    shadowRadius: 8,
    elevation: 3,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  kpiLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  notice: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },
  noticeText: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 20,
  },
  sectionHeading: {
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionCount: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCountText: {
    color: "#334155",
    fontWeight: "800",
    fontSize: 14,
  },
  emptyState: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    flexDirection: "row",
  },
  cardBar: {
    width: 6,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  indexBadge: {
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  indexText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
  cardTitle: {
    marginTop: 14,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  cardIdAccent: {
    color: "#2563EB",
  },
  descText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#475569",
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: "#B91C1C",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 14,
  },
  cardFooter: {
    gap: 12,
  },
  timeRow: {
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  timeMeta: {
    fontSize: 12,
    color: "#64748B",
  },
  retryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#0F172A",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "700",
  },
  badgeWrap: {
    alignSelf: "flex-start",
  },
});
