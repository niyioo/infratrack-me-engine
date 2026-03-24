import { Badge } from "@/components/ui/Badge";

export function RiskBadge({ risk }: { risk: string }) {
  const normalized = risk.toUpperCase();
  if (normalized === "LOW") return <Badge label="Low" variant="green" />;
  if (normalized === "MEDIUM") return <Badge label="Medium" variant="amber" />;
  if (normalized === "HIGH") return <Badge label="High" variant="red" />;
  if (normalized === "CRITICAL") return <Badge label="Critical" variant="red" />;
  return <Badge label={risk} variant="gray" />;
}