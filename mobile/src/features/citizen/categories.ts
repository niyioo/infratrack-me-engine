import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

type IconName = ComponentProps<typeof Ionicons>["name"];

// Mirrors backend CitizenReportCategory (apps/citizen_reports/models.py).
export const CITIZEN_CATEGORIES: { value: string; label: string; hint: string; icon: IconName; positive?: boolean }[] = [
  { value: "NO_ACTIVITY", label: "No work happening", hint: "No workers or equipment on site", icon: "pause-circle-outline" },
  { value: "ABANDONED", label: "Looks abandoned", hint: "Work stopped for a long time", icon: "ban-outline" },
  { value: "POOR_QUALITY", label: "Poor quality work", hint: "Cracks, cheap materials, shortcuts", icon: "hammer-outline" },
  { value: "SAFETY_HAZARD", label: "Safety hazard", hint: "Open trenches, falling debris", icon: "warning-outline" },
  { value: "NOT_AS_ANNOUNCED", label: "Not as announced", hint: "Different size, place or scope", icon: "help-circle-outline" },
  { value: "SUSPECTED_FRAUD", label: "Suspected fraud", hint: "Ghost work, diverted materials", icon: "shield-outline" },
  { value: "OTHER", label: "Something else", hint: "Any other concern", icon: "chatbubble-ellipses-outline" },
  { value: "PROGRESS_UPDATE", label: "Good progress", hint: "Share that work is going well", icon: "thumbs-up-outline", positive: true },
];

/** Matches the server's minimum, so people learn before they submit. */
export const MIN_DESCRIPTION_LENGTH = 20;
export const MAX_DESCRIPTION_LENGTH = 2000;
