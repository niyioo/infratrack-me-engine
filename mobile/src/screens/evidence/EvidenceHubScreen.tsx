import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppEmptyState } from "@/components/ui/AppEmptyState";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppSectionHeader } from "@/components/ui/AppSectionHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { colors, radius, spacing, typography } from "@/lib/theme/tokens";
import { submitQueuedEvidenceItem } from "@/features/evidence/api";
import { useOfflineQueue, useRunOfflineSync } from "@/features/sync/hooks";

export function EvidenceHubScreen() {
  const { data: queue = [] } = useOfflineQueue();
  const { online } = useNetworkStatus();
  const syncMutation = useRunOfflineSync();

  const pending = queue.filter((item) => item.syncStatus === "PENDING");
  const failed = queue.filter((item) => item.syncStatus === "FAILED");
  const synced = queue.filter((item) => item.syncStatus === "SYNCED");
  const latestFailure = failed[0];

  return (
    <AppScreen scroll contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <AppBadge label="Evidence" tone="info" />
        <Text style={styles.heroTitle}>Evidence & Sync</Text>
        <Text style={styles.heroSubtitle}>
          Manage upload confidence, offline drafts, and retry state transparently.
        </Text>
        <View style={styles.heroActions}>
          <AppButton title="Open Camera" onPress={() => router.push("/(main)/capture")} />
          <AppButton title="View Projects" variant="secondary" onPress={() => router.push("/(main)/projects")} />
        </View>
      </View>

      <View style={styles.metricGrid}>
        <MetricCard label="Pending" value={pending.length} tone="warning" helper="Awaiting network" />
        <MetricCard label="Failed" value={failed.length} tone="error" helper="Needs retry" />
        <MetricCard label="Synced" value={synced.length} tone="success" helper="Completed uploads" />
      </View>

      <AppCard>
        <AppSectionHeader
          title="New Field Capture"
          subtitle="Open the device camera immediately and route the evidence into review."
        />
        <View style={styles.captureCta}>
          <Text style={styles.captureCtaCopy}>
            Start a fresh on-site capture with location metadata and upload-safe handoff.
          </Text>
          <AppButton title="Launch Camera Capture" onPress={() => router.push("/(main)/capture")} />
        </View>
      </AppCard>

      <AppCard>
        <AppSectionHeader title="Sync Control" subtitle={online ? "Device is online" : "Device is currently offline"} />
        <View style={styles.syncControls}>
          <AppButton
            title={syncMutation.isPending ? "Running Sync..." : "Run Sync Now"}
            loading={syncMutation.isPending}
            onPress={() => syncMutation.mutate(submitQueuedEvidenceItem)}
            disabled={!online}
          />
          <Text style={styles.syncHint}>
            {online
              ? "Pending and failed evidence will be retried when sync is triggered."
              : "Stay online to process queued evidence safely."}
          </Text>
          {latestFailure?.lastError ? (
            <Text style={styles.syncErrorHint}>Latest failure: {latestFailure.lastError}</Text>
          ) : null}
        </View>
      </AppCard>

      <AppCard>
        <AppSectionHeader title="Offline Queue" subtitle="Real device queue status" />
        <View style={styles.queueList}>
          {queue.length > 0 ? (
            queue.map((item) => (
              <View key={item.localId} style={styles.queueRow}>
                <View style={styles.queueCopy}>
                  <Text style={styles.queueTitle}>
                    Project #{item.projectId} | Milestone #{item.milestoneId}
                  </Text>
                  <Text style={styles.queueMeta}>
                    Attempts: {item.retryCount} | Created {new Date(item.createdAt).toLocaleString("en-NG")}
                  </Text>
                  {item.lastError ? <Text style={styles.queueError}>{item.lastError}</Text> : null}
                </View>
                <AppBadge
                  label={item.syncStatus}
                  tone={item.syncStatus === "FAILED" ? "error" : item.syncStatus === "PENDING" ? "warning" : item.syncStatus === "SYNCED" ? "success" : "info"}
                />
              </View>
            ))
          ) : (
            <AppEmptyState
              title="Queue is clear"
              message="Offline captures will appear here whenever the device saves evidence before a successful upload."
              icon="cloud-done-outline"
            />
          )}
        </View>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  hero: {
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing["2xl"],
    gap: spacing.sm,
  },
  heroActions: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  heroTitle: {
    ...typography.title,
    color: colors.ink,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.slate500,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  syncControls: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  captureCta: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  captureCtaCopy: {
    ...typography.body,
    color: colors.slate500,
  },
  syncHint: {
    ...typography.caption,
    color: colors.slate500,
    fontWeight: "500",
  },
  syncErrorHint: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: "600",
  },
  queueList: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  queueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.slate50,
  },
  queueCopy: {
    flex: 1,
    gap: 4,
  },
  queueTitle: {
    ...typography.body,
    color: colors.ink,
    fontWeight: "700",
  },
  queueMeta: {
    ...typography.caption,
    color: colors.slate500,
    fontWeight: "500",
  },
  queueError: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: "600",
  },
});
