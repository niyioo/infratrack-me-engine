import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppBadge } from "@/components/ui/AppBadge";
import { colors, radius, shadows, typography } from "@/lib/theme/tokens";
import type { Project } from "@/features/projects/types";

function mapRiskTone(risk: string) {
  if (risk === "HIGH" || risk === "CRITICAL") return "error" as const;
  if (risk === "MEDIUM") return "warning" as const;
  return "success" as const;
}

function mapStatusTone(status: string) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "DELAYED" || status === "FLAGGED") return "error" as const;
  if (status === "NOT_STARTED") return "warning" as const;
  return "info" as const;
}

function progressBarColor(pct: number): string {
  if (pct >= 70) return colors.success;
  if (pct >= 30) return colors.brand;
  return colors.warning;
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${pct}%` as `${number}%`, backgroundColor: progressBarColor(pct) },
        ]}
      />
    </View>
  );
}

export function ProjectListItem({
  project,
  onPress,
}: {
  project: Project;
  onPress: () => void;
}) {
  const hasProgress = project.physical_completion_percent != null;
  const progress = project.physical_completion_percent ?? 0;

  const isAtRisk =
    project.current_status === "FLAGGED" ||
    project.current_status === "DELAYED" ||
    project.risk_status === "HIGH" ||
    project.risk_status === "CRITICAL";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, isAtRisk && styles.cardAtRisk, pressed && styles.pressed]}
    >
      {/* Top row: title + health pill */}
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.code}>{project.project_code}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {project.title}
          </Text>
        </View>

        <View
          style={[
            styles.healthPill,
            project.health_score != null && project.health_score < 40
              ? styles.healthPillDanger
              : project.health_score != null && project.health_score < 70
                ? styles.healthPillWarning
                : styles.healthPillNormal,
          ]}
        >
          <Text style={styles.healthValue}>
            {project.health_score != null ? project.health_score : "—"}
          </Text>
          <Text style={styles.healthLabel}>Health</Text>
        </View>
      </View>

      {/* Location */}
      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={14} color={colors.slate400} />
        <Text style={styles.metaText}>
          {project.lga}, {project.state}
        </Text>
      </View>

      {/* Progress bar */}
      {hasProgress && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Physical Progress</Text>
            <Text style={styles.progressValue}>{progress}%</Text>
          </View>
          <ProgressBar value={progress} />
        </View>
      )}

      {/* Status + risk badges */}
      <View style={styles.badges}>
        <AppBadge
          label={project.current_status.replaceAll("_", " ")}
          tone={mapStatusTone(project.current_status)}
        />
        <AppBadge
          label={`${project.risk_status} Risk`.replaceAll("_", " ")}
          tone={mapRiskTone(project.risk_status)}
        />
        {project.lifecycle_stage ? (
          <AppBadge label={project.lifecycle_stage.replaceAll("_", " ")} tone="info" />
        ) : null}
      </View>

      {/* Chevron */}
      <View style={styles.chevron}>
        <Ionicons name="chevron-forward" size={16} color={colors.slate300} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    padding: 16,
    gap: 12,
    ...shadows.soft,
    position: "relative",
  },
  cardAtRisk: {
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  pressed: {
    opacity: 0.93,
    backgroundColor: colors.slate50,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  code: {
    ...typography.eyebrow,
    color: colors.slate400,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  healthPill: {
    minWidth: 60,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  healthPillNormal: {
    backgroundColor: colors.slate50,
  },
  healthPillWarning: {
    backgroundColor: "#FFFBEB",
  },
  healthPillDanger: {
    backgroundColor: "#FEF2F2",
  },
  healthValue: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.ink,
  },
  healthLabel: {
    ...typography.caption,
    color: colors.slate400,
    fontWeight: "500",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    ...typography.body,
    color: colors.slate500,
    fontSize: 13,
  },
  progressSection: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.slate400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate600,
  },
  progressTrack: {
    height: 5,
    backgroundColor: colors.slate100,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chevron: {
    position: "absolute",
    right: 14,
    top: "50%",
  },
});
