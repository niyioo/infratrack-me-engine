import { PressableSurface } from "@/components/ui/PressableSurface";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppEmptyState } from "@/components/ui/AppEmptyState";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppSectionHeader } from "@/components/ui/AppSectionHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { ProjectListItem } from "@/components/projects/ProjectListItem";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { colors, radius, spacing, typography } from "@/lib/theme/tokens";
import { useProjects } from "@/features/projects/hooks";
import { useOfflineQueueSummary } from "@/features/sync/hooks";

function prettyRole(role?: string) {
  return role ? role.replaceAll("_", " ") : "Field Officer";
}

type QuickActionDef = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  onPress: () => void;
  badge?: number;
};

function QuickAction({
  icon,
  iconColor,
  iconBg,
  title,
  description,
  onPress,
  badge,
}: QuickActionDef) {
  return (
    <PressableSurface
      onPress={onPress}
      style={[styles.quickCard]}
      pressedStyle={styles.quickCardPressed}
    >
      <View style={[styles.quickIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
        {badge != null && badge > 0 ? (
          <View style={styles.quickBadge}>
            <Text style={styles.quickBadgeText}>{badge > 9 ? "9+" : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickDescription}>{description}</Text>
    </PressableSurface>
  );
}

type PrioritySignal = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  variant: "warning" | "error" | "offline";
};

export function HomeDashboardScreen() {
  const { user, roles } = useAuth();
  const { data: projects = [] } = useProjects();
  const { online } = useNetworkStatus();
  const queue = useOfflineQueueSummary();

  const primaryRole = roles[0];
  const activeProjects = projects.filter((p) => p.current_status !== "COMPLETED");
  const delayedProjects = projects.filter((p) => p.current_status === "DELAYED");
  const flaggedProjects = projects.filter((p) => p.current_status === "FLAGGED");
  const highRiskProjects = projects.filter((p) =>
    ["HIGH", "CRITICAL"].includes(p.risk_status),
  );
  const topProjects = [...projects].slice(0, 3);

  const signals: PrioritySignal[] = [
    ...delayedProjects.map(() => ({
      icon: "time-outline" as const,
      label: `${delayedProjects.length} delayed project(s) require attention`,
      variant: "warning" as const,
    })).slice(0, 1),
    ...flaggedProjects.map(() => ({
      icon: "flag-outline" as const,
      label: `${flaggedProjects.length} flagged project(s) need escalation`,
      variant: "error" as const,
    })).slice(0, 1),
    ...(queue.failedCount > 0
      ? [{
          icon: "cloud-offline-outline" as const,
          label: `${queue.failedCount} upload(s) failed — tap Sync Queue to retry`,
          variant: "error" as const,
        }]
      : []),
    ...(!online
      ? [{
          icon: "wifi-outline" as const,
          label: "Device is offline — save evidence to the queue",
          variant: "offline" as const,
        }]
      : []),
  ];

  const signalConfig = {
    warning: { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E", icon: "#D97706" },
    error: { bg: "#FEF2F2", border: "#FECACA", text: "#7F1D1D", icon: "#DC2626" },
    offline: { bg: "#F1F5F9", border: "#CBD5E1", text: "#334155", icon: "#64748B" },
  };

  return (
    <AppScreen scroll contentContainerStyle={styles.content}>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <View style={styles.roleChip}>
              <View style={[styles.roleDot, { backgroundColor: online ? colors.success : colors.warning }]} />
              <Text style={styles.roleText}>{prettyRole(primaryRole)}</Text>
            </View>
            <Text style={styles.heroTitle}>
              {user?.first_name ? `Welcome, ${user.first_name}` : "Operational Home"}
            </Text>
            <Text style={styles.heroSubtitle}>
              {projects.length} project{projects.length !== 1 ? "s" : ""} assigned ·{" "}
              {online ? "Online" : "Offline"}
            </Text>
          </View>
          <View style={styles.sessionPill}>
            <View style={[styles.sessionDot, { backgroundColor: online ? colors.success : colors.warning }]} />
            <Text style={styles.sessionText}>{online ? "Live" : "Offline"}</Text>
          </View>
        </View>

        <View style={styles.heroActions}>
          <AppButton title="Open Projects" variant="accent" onPress={() => router.push("/(main)/projects")} />
          <AppButton
            title="Sync Queue"
            variant="secondary"
            onPress={() => router.push("/(main)/evidence")}
          />
        </View>
      </View>

      {/* ── KPI Metrics ───────────────────────────────────────────── */}
      <View style={styles.metricGrid}>
        <MetricCard label="Assigned" value={projects.length} helper="All projects" />
        <MetricCard
          label="In Progress"
          value={activeProjects.length}
          tone="success"
          helper="Active work"
        />
        <MetricCard
          label="High Risk"
          value={highRiskProjects.length}
          tone="error"
          helper="Escalate"
        />
        <MetricCard
          label="Queue"
          value={queue.pendingCount + queue.failedCount}
          tone="warning"
          helper="Pending sync"
        />
      </View>

      {/* ── Priority Signals ──────────────────────────────────────── */}
      {signals.length > 0 ? (
        <AppCard>
          <AppSectionHeader title="Needs Attention" subtitle="Signals that require action now" />
          <View style={styles.signalList}>
            {signals.map((sig) => {
              const c = signalConfig[sig.variant];
              return (
                <View
                  key={sig.label}
                  style={[styles.signalRow, { backgroundColor: c.bg, borderColor: c.border }]}
                >
                  <Ionicons name={sig.icon} size={16} color={c.icon} />
                  <Text style={[styles.signalText, { color: c.text }]}>{sig.label}</Text>
                </View>
              );
            })}
          </View>
        </AppCard>
      ) : (
        <AppCard>
          <View style={styles.allClearRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.allClearText}>
              No urgent blockers — portfolio is operationally stable.
            </Text>
          </View>
        </AppCard>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      <AppCard>
        <AppSectionHeader title="Quick Actions" subtitle="Most common field tasks" />
        <View style={styles.quickGrid}>
          <QuickAction
            icon="camera"
            iconColor="#0F3D78"
            iconBg="#E7EEF8"
            title="Capture Evidence"
            description="Open camera for geo-verified capture."
            onPress={() => router.push("/(main)/capture")}
          />
          <QuickAction
            icon="warning"
            iconColor="#D97706"
            iconBg="#FFFBEB"
            title="Worklist"
            description="Interventions and compliance alerts."
            onPress={() => router.push("/(main)/alerts")}
            badge={delayedProjects.length + flaggedProjects.length}
          />
          <QuickAction
            icon="cloud-upload"
            iconColor="#0F9C92"
            iconBg="#E7F7F5"
            title="Sync Queue"
            description="Retry failed and pending uploads."
            onPress={() => router.push("/(main)/evidence")}
            badge={queue.failedCount}
          />
          <QuickAction
            icon="person-circle"
            iconColor="#6366F1"
            iconBg="#EEF2FF"
            title="Profile"
            description="Account, role, and device info."
            onPress={() => router.push("/(main)/profile")}
          />
        </View>
      </AppCard>

      {/* ── Project Snapshot ──────────────────────────────────────── */}
      <AppCard>
        <AppSectionHeader
          title="Project Snapshot"
          subtitle={
            user?.full_name
              ? `Prepared for ${user.full_name}`
              : "Assigned portfolio overview"
          }
          trailing={
            <AppButton
              title="All"
              variant="ghost"
              onPress={() => router.push("/(main)/projects")}
            />
          }
        />
        <View style={styles.snapshotList}>
          {topProjects.length > 0 ? (
            topProjects.map((project) => (
              <ProjectListItem
                key={project.id}
                project={project}
                onPress={() => router.push(`/(main)/project/${project.id}`)}
              />
            ))
          ) : (
            <AppEmptyState
              title="No projects assigned yet"
              message="Assigned projects appear here with health and status context."
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
    backgroundColor: colors.ink,
    padding: spacing["2xl"],
    gap: spacing.lg,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#1E293B",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleText: {
    ...typography.caption,
    color: colors.slate300,
    textTransform: "capitalize",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.slate400,
    fontSize: 13,
  },
  sessionPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: "#1E293B",
  },
  sessionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  sessionText: {
    ...typography.caption,
    color: colors.slate100,
    fontSize: 11,
  },
  heroActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  signalList: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  signalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  signalText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  allClearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: spacing.sm,
  },
  allClearText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.success,
    lineHeight: 18,
  },
  quickGrid: {
    marginTop: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  quickCard: {
    // Use explicit flex basis for a reliable 2-col grid
    flexBasis: "47%",
    flexGrow: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  quickCardPressed: {
    backgroundColor: colors.slate50,
    opacity: 0.95,
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  quickBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  quickBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.white,
  },
  quickTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 2,
  },
  quickDescription: {
    ...typography.caption,
    color: colors.slate500,
    fontWeight: "500",
    lineHeight: 17,
  },
  snapshotList: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
});
