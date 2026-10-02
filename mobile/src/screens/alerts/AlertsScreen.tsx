import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AppAlert } from "@/components/ui/AppAlert";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppEmptyState } from "@/components/ui/AppEmptyState";
import { AppLoader } from "@/components/ui/AppLoader";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppSectionHeader } from "@/components/ui/AppSectionHeader";
import { useDashboardSummary } from "@/features/dashboard/hooks";
import { useProjects } from "@/features/projects/hooks";
import { useOfflineQueueSummary } from "@/features/sync/hooks";
import { colors, radius, spacing, typography } from "@/lib/theme/tokens";

export function AlertsScreen() {
  const { data: projects = [] } = useProjects();
  const { data: summary, isLoading, isError } = useDashboardSummary();
  const queue = useOfflineQueueSummary();

  const interventionQueue = summary?.intervention_queue ?? [];
  const complianceQueue = summary?.compliance_queue ?? [];
  const fallbackAlerts = [
    ...projects
      .filter((project) => project.current_status === "DELAYED")
      .map((project) => ({
        id: `delayed-${project.id}`,
        tone: "warning" as const,
        title: "Delayed project",
        message: `${project.title} is behind expected delivery and should be reviewed immediately.`,
        action: () => router.push(`/(main)/project/${project.id}`),
        actionLabel: "Open Project",
      })),
    ...projects
      .filter((project) => project.current_status === "FLAGGED" || ["HIGH", "CRITICAL"].includes(project.risk_status))
      .map((project) => ({
        id: `risk-${project.id}`,
        tone: "error" as const,
        title: "High-risk project",
        message: `${project.title} has elevated risk or a flagged operational state.`,
        action: () => router.push(`/(main)/project/${project.id}`),
        actionLabel: "Inspect",
      })),
  ];
  const alerts =
    interventionQueue.length > 0
      ? interventionQueue.map((item) => ({
          id: `intervention-${item.id}-${item.attention_reason}`,
          tone:
            item.attention_level === "CRITICAL" || item.attention_level === "HIGH"
              ? ("error" as const)
              : ("warning" as const),
          title: item.attention_reason.replaceAll("_", " "),
          message: `${item.title} requires follow-up in ${item.lga}, ${item.state}.`,
          action: () => router.push(`/(main)/project/${item.id}`),
          actionLabel: "Open Project",
        }))
      : fallbackAlerts;

  return (
    <AppScreen scroll contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <AppBadge label="Alerts" tone="warning" />
        <Text style={styles.heroTitle}>Intervention Worklist</Text>
        <Text style={styles.heroSubtitle}>
          Ranked operational actions for risk, reporting compliance, and sync failures.
        </Text>
      </View>

      {isLoading ? <AppLoader label="Loading intervention queue..." /> : null}

      {summary ? (
        <View style={styles.metricRow}>
          <AppBadge label={`${summary.intervention_queue.length} interventions`} tone="info" />
          <AppBadge label={`${summary.compliance_queue.length} compliance reminders`} tone="warning" />
          <AppBadge label={`${summary.alert_summary.geofence_exceptions_pending} geo exceptions`} tone="error" />
        </View>
      ) : null}

      <AppCard>
        <AppSectionHeader title="Action Queue" subtitle="Most important operational signals first" />
        <View style={styles.alertList}>
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <View key={alert.id} style={styles.alertRow}>
                <AppAlert title={alert.title} message={alert.message} tone={alert.tone} />
                <AppButton title={alert.actionLabel} variant="secondary" onPress={alert.action} />
              </View>
            ))
          ) : (
            <AppEmptyState
              title="No active interventions"
              message="Delayed projects, high-risk records, and escalation triggers will surface here when action is needed."
              icon="notifications-off-outline"
            />
          )}
        </View>
      </AppCard>

      <AppCard>
        <AppSectionHeader title="Reporting Compliance" subtitle="Projects nearing or missing their reporting cadence" />
        <View style={styles.alertList}>
          {complianceQueue.length > 0 ? (
            complianceQueue.map((item) => (
              <View key={`compliance-${item.id}-${item.attention_reason}`} style={styles.alertRow}>
                <AppAlert
                  title={item.attention_reason.replaceAll("_", " ")}
                  message={
                    item.days_overdue > 0
                      ? `${item.title} is ${item.days_overdue} day(s) overdue for its ${item.reporting_frequency.toLowerCase()} reporting cycle.`
                      : `${item.title} is approaching its ${item.reporting_frequency.toLowerCase()} reporting due date.`
                  }
                  tone={item.days_overdue > 0 ? "warning" : "info"}
                />
                <AppButton
                  title="Open Project"
                  variant="secondary"
                  onPress={() => router.push(`/(main)/project/${item.id}`)}
                />
              </View>
            ))
          ) : (
            <AppEmptyState
              title={isError ? "Compliance feed unavailable" : "No compliance reminders"}
              message={
                isError
                  ? "Reporting reminders could not be loaded right now."
                  : "Projects nearing or missing reporting cadence will surface here."
              }
              icon="document-text-outline"
            />
          )}
        </View>
      </AppCard>

      <AppCard>
        <AppSectionHeader title="Sync Reliability" subtitle="Offline queue failures still need explicit follow-up" />
        <View style={styles.alertList}>
          {queue.failedCount > 0 ? (
            <View style={styles.alertRow}>
              <AppAlert
                title="Upload failures detected"
                message={`${queue.failedCount} queued evidence item(s) failed to sync and should be retried.`}
                tone="error"
              />
              <AppButton title="Open Queue" variant="secondary" onPress={() => router.push("/(main)/evidence")} />
            </View>
          ) : (
            <AppEmptyState
              title="Sync queue is healthy"
              message="Failed evidence uploads will surface here when retry action is needed."
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
  heroTitle: {
    ...typography.title,
    color: colors.ink,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.slate500,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  alertList: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  alertRow: {
    gap: spacing.sm,
  },
});
