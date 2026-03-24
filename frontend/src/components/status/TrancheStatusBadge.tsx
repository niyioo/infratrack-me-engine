import { Badge } from "@/components/ui/Badge";

export function TrancheStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  if (normalized === "DISBURSED") return <Badge label="Disbursed" variant="green" />;
  if (normalized === "ELIGIBLE") return <Badge label="Eligible" variant="blue" />;
  if (normalized === "LOCKED") return <Badge label="Locked" variant="gray" />;
  if (normalized === "ON_HOLD") return <Badge label="On Hold" variant="amber" />;
  if (normalized.includes("OVERRIDE")) return <Badge label={status} variant="amber" />;
  return <Badge label={status} variant="gray" />;
}