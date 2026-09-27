/**
 * ProjectDetailScreen — The primary field officer decision surface.
 *
 * Flow: Project header → progress → full milestone timeline →
 *       per-milestone "Capture Evidence" CTA for active milestones.
 *
 * No more buried "Open Capture" button. Every active milestone
 * owns its own capture action, routed with the milestoneId.
 */
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppEmptyState } from "@/components/ui/AppEmptyState";
import { AppLoader } from "@/components/ui/AppLoader";
import { useMilestones } from "@/features/milestones/hooks";
import { useProject } from "@/features/projects/hooks";
import { colors, radius, spacing, typography } from "@/lib/theme/tokens";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value?: string | number) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatDueDate(raw?: string) {
  if (!raw) return "—";
  const d = new Date(raw);
  const diffDays = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  const label = d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  if (diffDays < 0) return `${label} (${Math.abs(diffDays)}d overdue)`;
  if (diffDays === 0) return "Due today";
  if (diffDays <= 3) return `${label} (${diffDays}d left)`;
  return label;
}

// ─── Milestone Status Config ─────────────────────────────────────────────────

// Mirrors backend MilestoneStatus (apps/common/constants.py). canCapture must match
// the server: evidence is refused for APPROVED and FLAGGED milestones.
type MilestoneStatus =
  | "PENDING" | "OPEN_FOR_SUBMISSION" | "SUBMITTED" | "UNDER_REVIEW"
  | "REWORK_REQUIRED" | "APPROVED" | "REJECTED" | "FLAGGED";

const STATUS_CONFIG: Record<
  MilestoneStatus | "DEFAULT",
  { accent: string; bg: string; textColor: string; label: string; canCapture: boolean }
> = {
  PENDING:             { accent: colors.slate300, bg: colors.slate50,     textColor: colors.slate600, label: "Pending",          canCapture: true },
  OPEN_FOR_SUBMISSION: { accent: colors.accent,   bg: colors.accentSoft,  textColor: colors.accentStrong, label: "Open",         canCapture: true },
  SUBMITTED:           { accent: colors.brand,    bg: colors.brandSoft,   textColor: colors.brand, label: "Submitted",           canCapture: false },
  UNDER_REVIEW:        { accent: colors.brand,    bg: colors.brandSoft,   textColor: colors.brand, label: "Under Review",        canCapture: false },
  REWORK_REQUIRED:     { accent: colors.warning,  bg: colors.warningSoft, textColor: "#92400E", label: "Rework Required",       canCapture: true },
  APPROVED:            { accent: colors.success,  bg: colors.successSoft, textColor: "#065F46", label: "Approved",              canCapture: false },
  REJECTED:            { accent: colors.danger,   bg: colors.dangerSoft,  textColor: "#7F1D1D", label: "Rejected",              canCapture: true },
  FLAGGED:             { accent: colors.danger,   bg: colors.dangerSoft,  textColor: "#7F1D1D", label: "Flagged",               canCapture: false },
  DEFAULT:             { accent: colors.slate300, bg: colors.slate50,     textColor: colors.slate600, label: "Unknown",         canCapture: false },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as MilestoneStatus] ?? STATUS_CONFIG.DEFAULT;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${pct}%` as `${number}%`, backgroundColor: color }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: { height: 6, backgroundColor: colors.slate100, borderRadius: 3, overflow: "hidden" },
  fill:  { height: 6, borderRadius: 3 },
});

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

function MilestoneCard({
  milestone,
  index,
  project,
  isLast,
}: {
  milestone: any;
  index: number;
  project: any;
  isLast: boolean;
}) {
  const cfg = getStatusConfig(milestone.current_status);
  const submitted = milestone.submitted_evidence_count ?? 0;
  const required  = milestone.required_evidence_count  ?? 1;
  const dueStr    = formatDueDate(milestone.due_date);
  const isOverdue = milestone.due_date
    ? new Date(milestone.due_date).getTime() < Date.now()
    : false;

  function onCapture() {
    router.push({
      pathname: "/(main)/capture",
      params: {
        projectId:    String(project.id),
        milestoneId:  String(milestone.id),
        siteAddress:  project.site_address || `${project.lga}, ${project.state}`,
        siteLat:      String(project.latitude  ?? ""),
        siteLng:      String(project.longitude ?? ""),
        radiusMeters: String(project.geo_fence_radius_meters ?? 50),
      },
    });
  }

  return (
    <View style={styles.milestoneWrap}>
      {/* Vertical connector line */}
      <View style={styles.connectorCol}>
        <View style={[styles.connectorDot, { backgroundColor: cfg.accent }]} />
        {!isLast && <View style={styles.connectorLine} />}
      </View>

      {/* Card */}
      <View style={[styles.milestoneCard, { borderLeftColor: cfg.accent }]}>
        {/* Top row: index + status badge */}
        <View style={styles.milestoneTopRow}>
          <View style={styles.seqBadge}>
            <Text style={styles.seqText}>{String(index + 1).padStart(2, "0")}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: cfg.accent }]} />
            <Text style={[styles.statusLabel, { color: cfg.textColor }]}>
              {cfg.label}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.milestoneTitle} numberOfLines={2}>
          {milestone.name}
        </Text>

        {/* Due date */}
        <View style={styles.dueRow}>
          <Ionicons
            name="calendar-outline"
            size={12}
            color={isOverdue ? colors.danger : colors.slate400}
          />
          <Text
            style={[
              styles.dueDateText,
              { color: isOverdue ? colors.danger : colors.slate500 },
            ]}
          >
            {dueStr}
          </Text>
        </View>

        {/* Evidence count bar */}
        <View style={styles.evidenceSection}>
          <View style={styles.evidenceHeader}>
            <Text style={styles.evidenceLabel}>Evidence</Text>
            <Text style={styles.evidenceCount}>
              {submitted}/{required}
            </Text>
          </View>
          <ProgressBar
            value={(submitted / Math.max(required, 1)) * 100}
            color={submitted >= required ? colors.success : colors.brand}
          />
        </View>

        {/* QA badge row */}
        {milestone.qa_required ? (
          <View style={styles.qaBadgeRow}>
            <Ionicons name="shield-outline" size={12} color={colors.slate400} />
            <Text style={styles.qaLabel}>QA Required</Text>
            {milestone.current_status === "APPROVED" && (
              <View style={styles.qaApproved}>
                <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                <Text style={[styles.qaLabel, { color: colors.success }]}>Cleared</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Capture CTA — only on active milestones */}
        {cfg.canCapture && (
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={onCapture}
            activeOpacity={0.85}
          >
            <Ionicons name="camera" size={16} color={colors.white} />
            <Text style={styles.captureBtnText}>Capture Evidence</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id || "");
  const { data: milestones = [] } = useMilestones(id ? { project: id } : undefined);

  if (isLoading) return <AppLoader label="Loading project…" />;

  if (!project) {
    return (
      <ScrollView contentContainerStyle={styles.emptyWrap}>
        <AppEmptyState
          title="Project unavailable"
          message="This project could not be loaded or is no longer visible to your account."
          icon="alert-circle-outline"
        />
      </ScrollView>
    );
  }

  const physicalPct  = project.physical_completion_percent  ?? 0;
  const financialPct = project.financial_disbursement_percent ?? 0;
  const isAtRisk = project.risk_status === "HIGH" || project.risk_status === "CRITICAL";

  const sortedMilestones = [...milestones].sort(
    (a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0),
  );
  const activeMilestones = milestones.filter(
    (m) => getStatusConfig(m.current_status).canCapture,
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Dark header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={18} color={colors.white} />
          <Text style={styles.backText}>Projects</Text>
        </TouchableOpacity>

        <View style={styles.headerMain}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerCode}>{project.project_code}</Text>
            <Text style={styles.headerTitle}>{project.title}</Text>

            {project.contractor?.name ? (
              <View style={styles.contractorRow}>
                <Ionicons name="business-outline" size={12} color={colors.slate400} />
                <Text style={styles.contractorText}>{project.contractor.name}</Text>
              </View>
            ) : null}

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.slate400} />
              <Text style={styles.locationText}>
                {project.lga}, {project.state}
              </Text>
            </View>
          </View>

          {/* Health chip */}
          <View
            style={[
              styles.healthChip,
              isAtRisk && { borderWidth: 1, borderColor: colors.danger },
            ]}
          >
            <Text style={styles.healthValue}>{project.health_score ?? "—"}</Text>
            <Text style={styles.healthLabel}>Health</Text>
          </View>
        </View>

        {/* Status + risk badges */}
        <View style={styles.badgeRow}>
          {project.current_status ? (
            <AppBadge
              label={project.current_status.replaceAll("_", " ")}
              tone={
                project.current_status === "COMPLETED" ? "success"
                : project.current_status === "FLAGGED" ? "error"
                : project.current_status === "DELAYED"  ? "error"
                : "info"
              }
            />
          ) : null}
          {project.risk_status ? (
            <AppBadge
              label={`${project.risk_status} Risk`}
              tone={isAtRisk ? "error" : project.risk_status === "MEDIUM" ? "warning" : "success"}
            />
          ) : null}
        </View>
      </View>

      {/* ── Risk warning banner ───────────────────────────────────── */}
      {isAtRisk && (
        <View style={styles.riskBanner}>
          <Ionicons name="warning" size={16} color={colors.danger} />
          <Text style={styles.riskBannerText}>
            This project is {project.risk_status.toLowerCase()} risk.
            Evidence and milestone quality require close oversight.
          </Text>
        </View>
      )}

      {/* ── Progress bars ─────────────────────────────────────────── */}
      <View style={styles.progressCard}>
        <View style={styles.progressRow}>
          <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Physical Progress</Text>
              <Text style={styles.progressPct}>{physicalPct}%</Text>
            </View>
            <ProgressBar
              value={physicalPct}
              color={physicalPct >= 70 ? colors.success : physicalPct >= 30 ? colors.brand : colors.warning}
            />
          </View>
          <View style={styles.progressDivider} />
          <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Financial Disbursed</Text>
              <Text style={styles.progressPct}>{financialPct}%</Text>
            </View>
            <ProgressBar
              value={financialPct}
              color={colors.accent}
            />
          </View>
        </View>

        {/* Quick stats row */}
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{formatCurrency(project.budget_amount)}</Text>
            <Text style={styles.quickStatLabel}>Budget</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{milestones.length}</Text>
            <Text style={styles.quickStatLabel}>Milestones</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatValue, activeMilestones.length > 0 && { color: colors.brand }]}>
              {activeMilestones.length}
            </Text>
            <Text style={styles.quickStatLabel}>Active</Text>
          </View>
        </View>
      </View>

      {/* ── Milestone timeline ────────────────────────────────────── */}
      <SectionDivider label={`Milestones · ${milestones.length} total`} />

      {sortedMilestones.length > 0 ? (
        <View style={styles.timeline}>
          {sortedMilestones.map((m, i) => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              index={i}
              project={project}
              isLast={i === sortedMilestones.length - 1}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyMilestones}>
          <AppEmptyState
            title="No milestones yet"
            message="Delivery checkpoints will appear here when configured by your administrator."
            icon="flag-outline"
          />
        </View>
      )}

      {/* ── Bottom spacer ─────────────────────────────────────────── */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.slate100,
  },
  content: {
    paddingBottom: spacing["3xl"],
  },
  emptyWrap: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: "center",
  },

  // Header
  header: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.xl,
    paddingBottom: spacing["2xl"],
    gap: spacing.lg,
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
  headerMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  headerCode: {
    ...typography.eyebrow,
    color: colors.slate400,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  contractorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  contractorText: {
    fontSize: 12,
    color: colors.slate400,
    fontWeight: "500",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.slate400,
    fontWeight: "500",
  },
  healthChip: {
    alignSelf: "flex-start",
    minWidth: 72,
    backgroundColor: "#1E293B",
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    gap: 2,
  },
  healthValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.white,
  },
  healthLabel: {
    ...typography.caption,
    color: colors.slate400,
    fontWeight: "500",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  // Risk banner
  riskBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.md,
    padding: spacing.md,
  },
  riskBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#7F1D1D",
    lineHeight: 18,
  },

  // Progress card
  progressCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    overflow: "hidden",
  },
  progressRow: {
    flexDirection: "row",
    padding: spacing.lg,
    gap: spacing.lg,
  },
  progressItem: {
    flex: 1,
    gap: 8,
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
    letterSpacing: 0.4,
  },
  progressPct: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  progressDivider: {
    width: 1,
    backgroundColor: colors.slate100,
  },
  quickStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.slate100,
  },
  quickStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: 3,
  },
  quickStatValue: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.ink,
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.slate400,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: colors.slate100,
    marginVertical: spacing.sm,
  },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: spacing.lg,
    marginTop: spacing["2xl"],
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.slate200,
  },
  dividerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate400,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Timeline
  timeline: {
    paddingHorizontal: spacing.lg,
    gap: 0,
  },
  milestoneWrap: {
    flexDirection: "row",
    gap: spacing.md,
  },
  connectorCol: {
    alignItems: "center",
    width: 18,
    paddingTop: 18,
  },
  connectorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.white,
  },
  connectorLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.slate200,
    marginTop: 4,
    marginBottom: 0,
    minHeight: 24,
  },
  milestoneCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderLeftWidth: 3,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  milestoneTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  seqBadge: {
    backgroundColor: colors.slate100,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  seqText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.slate500,
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  milestoneTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 21,
  },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Evidence progress
  evidenceSection: {
    gap: 6,
  },
  evidenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  evidenceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.slate400,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  evidenceCount: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate600,
  },

  // QA row
  qaBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  qaLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.slate400,
  },
  qaApproved: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginLeft: 4,
  },

  // Capture CTA
  captureBtn: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  captureBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.1,
  },

  // Empty milestones
  emptyMilestones: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
});
