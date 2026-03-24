import { Badge } from "@/components/ui/Badge";

export function MilestoneStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  if (normalized === "APPROVED") return <Badge label="Approved" variant="green" />;
  if (normalized === "REJECTED") return <Badge label="Rejected" variant="red" />;
  if (normalized === "REWORK_REQUIRED") return <Badge label="Rework Required" variant="amber" />;
  if (normalized === "UNDER_REVIEW") return <Badge label="Under Review" variant="blue" />;
  if (normalized === "SUBMITTED") return <Badge label="Submitted" variant="blue" />;
  if (normalized === "FLAGGED") return <Badge label="Flagged" variant="red" />;
  return <Badge label={status} variant="gray" />;
}