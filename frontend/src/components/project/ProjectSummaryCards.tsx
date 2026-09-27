import { Banknote, HeartPulse, ShieldAlert, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import type { StatCardVariant } from "@/components/ui/StatCard";
import type { Project } from "@/features/projects/types";

function healthScoreVariant(score: number | null | undefined): StatCardVariant {
  if (score == null) return "default";
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "danger";
}

function riskVariant(risk: string | undefined): StatCardVariant {
  if (!risk) return "default";
  if (risk === "CRITICAL" || risk === "HIGH") return "danger";
  if (risk === "MEDIUM") return "warning";
  return "success";
}

export function ProjectSummaryCards({ project }: { project: Project }) {
  const budget = Number(project.budget_amount);
  const progress = project.physical_completion_percent;
  const healthScore = project.health_score;
  const risk = project.risk_status;

  const progressValue =
    progress !== undefined && progress !== null
      ? `${progress}% verified`
      : "Not tracked";

  const riskValue =
    project.health_band ??
    (project.requires_independent_validation ? "Validation Required" : "Standard Review");

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Project Budget"
        value={`₦${budget.toLocaleString()}`}
        icon={<Banknote size={18} />}
        variant="info"
        subtitle="Total committed budget"
      />
      <StatCard
        title="Health Score"
        value={healthScore ?? "--"}
        icon={<HeartPulse size={18} />}
        variant={healthScoreVariant(healthScore)}
        subtitle={
          healthScore != null
            ? healthScore >= 70
              ? "Project on track"
              : healthScore >= 40
                ? "Needs attention"
                : "Critical — act now"
            : "Score pending"
        }
      />
      <StatCard
        title="Physical Progress"
        value={progressValue}
        icon={<TrendingUp size={18} />}
        variant={
          progress != null && progress >= 70
            ? "success"
            : progress != null && progress >= 30
              ? "info"
              : "default"
        }
        subtitle={
          project.state && project.lga
            ? `${project.state} / ${project.lga}`
            : undefined
        }
      />
      <StatCard
        title="Risk Posture"
        value={riskValue}
        icon={<ShieldAlert size={18} />}
        variant={riskVariant(risk)}
        subtitle={
          risk === "CRITICAL" || risk === "HIGH"
            ? "Immediate review required"
            : risk === "MEDIUM"
              ? "Monitor closely"
              : "Within acceptable range"
        }
      />
    </div>
  );
}
