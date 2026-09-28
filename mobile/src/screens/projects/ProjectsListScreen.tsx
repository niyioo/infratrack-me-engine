import { PressableSurface } from "@/components/ui/PressableSurface";
import { useDeferredValue, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "@/components/ui/AppInput";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppBadge } from "@/components/ui/AppBadge";
import { colors, radius, shadows, spacing, typography } from "@/lib/theme/tokens";
import { useProjects } from "@/features/projects/hooks";
import type { Project } from "@/features/projects/types";

// ─── filter config ────────────────────────────────────────────────────────────
const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "DELAYED", label: "Delayed" },
  { key: "FLAGGED", label: "Flagged" },
  { key: "COMPLETED", label: "Completed" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

// ─── helpers ──────────────────────────────────────────────────────────────────
function progressBarColor(pct: number): string {
  if (pct >= 70) return colors.success;
  if (pct >= 30) return colors.brand;
  return colors.warning;
}

function mapStatusTone(s: string): "success" | "warning" | "error" | "info" {
  if (s === "COMPLETED") return "success";
  if (s === "DELAYED" || s === "FLAGGED") return "error";
  if (s === "NOT_STARTED") return "warning";
  return "info";
}

function mapRiskTone(r: string): "success" | "warning" | "error" | "info" {
  if (r === "HIGH" || r === "CRITICAL") return "error";
  if (r === "MEDIUM") return "warning";
  return "success";
}

function healthColor(score?: number): string {
  if (score == null) return colors.slate400;
  if (score < 40) return colors.danger;
  if (score < 70) return colors.warning;
  return colors.success;
}

// ─── sub-components ───────────────────────────────────────────────────────────
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

function KpiCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={[styles.kpiCard, { borderTopColor: accent }]}>
      <Ionicons name={icon} size={18} color={accent} />
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: "60%", height: 12 }]} />
      <View style={[styles.skeletonLine, { height: 5, borderRadius: 3 }]} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={[styles.skeletonLine, { width: 70, height: 24, borderRadius: 12 }]} />
        <View style={[styles.skeletonLine, { width: 80, height: 24, borderRadius: 12 }]} />
      </View>
    </View>
  );
}

function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const progress = project.physical_completion_percent ?? 0;
  const isAtRisk =
    project.current_status === "FLAGGED" ||
    project.current_status === "DELAYED" ||
    project.risk_status === "HIGH" ||
    project.risk_status === "CRITICAL";

  return (
    <PressableSurface
      onPress={onPress}
      style={[styles.card, isAtRisk && styles.cardAtRisk]}
      pressedStyle={styles.cardPressed}
    >
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardCode}>{project.project_code}</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {project.title}
          </Text>
        </View>

        {/* The list endpoint doesn't compute health (it's per-project work); the
            detail screen shows it. Only render the bubble when a score is present. */}
        {project.health_score != null ? (
          <View style={[styles.healthBubble, { borderColor: healthColor(project.health_score) }]}>
            <Text style={[styles.healthValue, { color: healthColor(project.health_score) }]}>
              {project.health_score}
            </Text>
            <Text style={styles.healthLabel}>Health</Text>
          </View>
        ) : null}
      </View>

      {/* Location */}
      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={13} color={colors.slate400} />
        <Text style={styles.metaText}>
          {project.lga}, {project.state}
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressMeta}>
          <Text style={styles.progressLabel}>Physical Progress</Text>
          <Text style={[styles.progressPct, { color: progressBarColor(progress) }]}>
            {progress}%
          </Text>
        </View>
        <ProgressBar value={progress} />
      </View>

      {/* Milestone stat */}
      {project.total_milestones != null && (
        <View style={styles.milestoneRow}>
          <Ionicons name="flag-outline" size={13} color={colors.slate400} />
          <Text style={styles.metaText}>
            {project.approved_milestones ?? 0}/{project.total_milestones} milestones approved
          </Text>
          {(project.overdue_milestones ?? 0) > 0 && (
            <View style={styles.overdueTag}>
              <Text style={styles.overdueTagText}>
                {project.overdue_milestones} overdue
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Badges */}
      <View style={styles.badgeRow}>
        <AppBadge
          label={project.current_status.replaceAll("_", " ")}
          tone={mapStatusTone(project.current_status)}
        />
        <AppBadge
          label={`${project.risk_status} Risk`.replaceAll("_", " ")}
          tone={mapRiskTone(project.risk_status)}
        />
      </View>

      {/* Open button */}
      <PressableSurface
        onPress={onPress}
        style={[styles.openBtn]}
      pressedStyle={styles.openBtnPressed}
      >
        <Text style={styles.openBtnText}>Open Project</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.brand} />
      </PressableSurface>
    </PressableSurface>
  );
}

// ─── main screen ──────────────────────────────────────────────────────────────
export function ProjectsListScreen() {
  const { data: projects = [], isLoading } = useProjects();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  // KPI counts
  const kpis = useMemo(() => {
    const active = projects.filter((p) => p.current_status === "ACTIVE").length;
    const delayed = projects.filter((p) => p.current_status === "DELAYED").length;
    const flagged = projects.filter((p) => p.current_status === "FLAGGED").length;
    return { total: projects.length, active, delayed, flagged };
  }, [projects]);

  // Filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = { ALL: projects.length, ACTIVE: 0, DELAYED: 0, FLAGGED: 0, COMPLETED: 0 };
    for (const p of projects) {
      if (p.current_status === "ACTIVE") counts.ACTIVE++;
      if (p.current_status === "DELAYED") counts.DELAYED++;
      if (p.current_status === "FLAGGED") counts.FLAGGED++;
      if (p.current_status === "COMPLETED") counts.COMPLETED++;
    }
    return counts;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesFilter = filter === "ALL" ? true : project.current_status === filter;
      const matchesQuery =
        deferredQuery.length === 0
          ? true
          : [project.title, project.project_code, project.state, project.lga]
              .join(" ")
              .toLowerCase()
              .includes(deferredQuery);
      return matchesFilter && matchesQuery;
    });
  }, [projects, filter, deferredQuery]);

  return (
    <AppScreen style={styles.screen}>
      <FlatList
        data={isLoading ? [] : filteredProjects}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {/* ── Dark hero ──────────────────────────────────── */}
            <View style={styles.hero}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Ionicons name="layers-outline" size={12} color={colors.brandMuted} />
                  <Text style={styles.heroBadgeText}>Field Portfolio</Text>
                </View>
                {isLoading && (
                  <ActivityIndicator size="small" color={colors.brandMuted} />
                )}
              </View>
              <Text style={styles.heroTitle}>Projects</Text>
              <Text style={styles.heroSubtitle}>
                Drill into delivery status, risk posture, and field evidence.
              </Text>

              {/* KPI row */}
              {!isLoading && (
                <View style={styles.kpiRow}>
                  <KpiCard
                    label="Assigned"
                    value={kpis.total}
                    accent={colors.brandMuted}
                    icon="briefcase-outline"
                  />
                  <KpiCard
                    label="Active"
                    value={kpis.active}
                    accent={colors.accent}
                    icon="radio-outline"
                  />
                  <KpiCard
                    label="Delayed"
                    value={kpis.delayed}
                    accent={colors.warning}
                    icon="time-outline"
                  />
                  <KpiCard
                    label="Flagged"
                    value={kpis.flagged}
                    accent={colors.danger}
                    icon="flag-outline"
                  />
                </View>
              )}
            </View>

            {/* ── Search + filters ────────────────────────────── */}
            <View style={styles.searchBlock}>
              <AppInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search project, code, state, LGA…"
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
              >
                {FILTERS.map((item) => {
                  const active = item.key === filter;
                  const count = filterCounts[item.key];
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => setFilter(item.key)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {item.label}
                      </Text>
                      <View style={[styles.chipCount, active && styles.chipCountActive]}>
                        <Text style={[styles.chipCountText, active && styles.chipCountTextActive]}>
                          {count}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.resultsMeta}>
                <Text style={styles.resultsText}>
                  {isLoading
                    ? "Loading projects…"
                    : `${filteredProjects.length} project${filteredProjects.length !== 1 ? "s" : ""}`}
                </Text>
                {deferredQuery.length > 0 && (
                  <Pressable onPress={() => setQuery("")}>
                    <Text style={styles.clearText}>Clear search</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => router.push(`/(main)/project/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonList}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={28} color={colors.slate400} />
              </View>
              <Text style={styles.emptyTitle}>No projects match this view</Text>
              <Text style={styles.emptyDesc}>
                Clear the search or switch status filters to widen the result set.
              </Text>
            </View>
          )
        }
      />
    </AppScreen>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.slate100,
  },
  content: {
    paddingBottom: 40,
  },

  // ── header ─────────────────────────────────────────
  headerBlock: {
    gap: 0,
    marginBottom: spacing.md,
  },

  // hero
  hero: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing["2xl"],
    paddingBottom: spacing["2xl"],
    gap: spacing.sm,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(199,216,239,0.3)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  heroBadgeText: {
    ...typography.eyebrow,
    color: colors.brandMuted,
    fontSize: 10,
  },
  heroTitle: {
    ...typography.title,
    color: colors.white,
    marginTop: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
  },

  // kpi row
  kpiRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: radius.md,
    borderTopWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 3,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.5,
  },
  kpiLabel: {
    ...typography.eyebrow,
    color: "rgba(255,255,255,0.45)",
    fontSize: 9,
  },

  // search block
  searchBlock: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate200,
    marginBottom: spacing.md,
  },
  filterScroll: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.slate50,
  },
  chipActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  chipText: {
    ...typography.caption,
    color: colors.slate600,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.brand,
  },
  chipCount: {
    backgroundColor: colors.slate200,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  chipCountActive: {
    backgroundColor: colors.brandMuted,
  },
  chipCountText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.slate600,
  },
  chipCountTextActive: {
    color: colors.brand,
  },
  resultsMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultsText: {
    ...typography.caption,
    color: colors.slate400,
    fontWeight: "500",
  },
  clearText: {
    ...typography.caption,
    color: colors.brand,
  },

  // ── project card ──────────────────────────────────
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  cardAtRisk: {
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  cardPressed: {
    opacity: 0.94,
    backgroundColor: colors.slate50,
  },

  cardHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  cardTitleBlock: {
    flex: 1,
    gap: 3,
  },
  cardCode: {
    ...typography.eyebrow,
    color: colors.slate400,
    fontSize: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 21,
    letterSpacing: -0.2,
  },

  healthBubble: {
    minWidth: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 7,
    alignItems: "center",
    gap: 1,
  },
  healthValue: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  healthLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.slate400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.slate500,
  },

  progressSection: {
    gap: 5,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.slate400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressPct: {
    fontSize: 11,
    fontWeight: "700",
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

  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  overdueTag: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  overdueTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.danger,
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
    paddingVertical: 9,
  },
  openBtnPressed: {
    backgroundColor: colors.brandSoft,
  },
  openBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.brand,
    letterSpacing: 0.1,
  },

  // ── skeleton ──────────────────────────────────────
  skeletonList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  skeletonCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  skeletonLine: {
    height: 16,
    width: "100%",
    backgroundColor: colors.slate100,
    borderRadius: 6,
  },

  // ── empty state ───────────────────────────────────
  emptyState: {
    marginHorizontal: spacing.lg,
    paddingVertical: 48,
    alignItems: "center",
    gap: spacing.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.slate100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.sectionTitle,
    color: colors.ink,
    textAlign: "center",
  },
  emptyDesc: {
    ...typography.body,
    color: colors.slate500,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
});
