import { Badge } from "@/components/ui/Badge";

export function ProjectStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  if (normalized === "COMPLETED") return <Badge label="Completed" variant="green" />;
  if (normalized === "FLAGGED") return <Badge label="Flagged" variant="red" />;
  if (normalized === "DELAYED") return <Badge label="Delayed" variant="amber" />;
  if (normalized === "AWAITING_VERIFICATION") return <Badge label="Awaiting Verification" variant="blue" />;
  if (normalized === "ACTIVE") return <Badge label="Active" variant="blue" />;
  return <Badge label={status} variant="gray" />;
}