import {
  AlertTriangle,
  Ban,
  Hammer,
  HardHat,
  HelpCircle,
  PauseCircle,
  ShieldAlert,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";

// Mirrors backend CitizenReportCategory (apps/citizen_reports/models.py).
export const CATEGORIES: { value: string; label: string; hint: string; icon: LucideIcon; positive?: boolean }[] = [
  { value: "NO_ACTIVITY", label: "No work happening", hint: "No workers or equipment on site", icon: PauseCircle },
  { value: "ABANDONED", label: "Looks abandoned", hint: "Work stopped for a long time", icon: Ban },
  { value: "POOR_QUALITY", label: "Poor quality work", hint: "Cracks, cheap materials, shortcuts", icon: Hammer },
  { value: "SAFETY_HAZARD", label: "Safety hazard", hint: "Open trenches, falling debris, unsafe site", icon: HardHat },
  { value: "NOT_AS_ANNOUNCED", label: "Not as announced", hint: "Different size, location or scope", icon: HelpCircle },
  { value: "SUSPECTED_FRAUD", label: "Suspected fraud", hint: "Ghost work, diverted materials, bribes", icon: ShieldAlert },
  { value: "OTHER", label: "Something else", hint: "Any other concern", icon: AlertTriangle },
  { value: "PROGRESS_UPDATE", label: "Good progress", hint: "Share that work is going well", icon: ThumbsUp, positive: true },
];
