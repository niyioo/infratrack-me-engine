import { ReactNode } from "react";
import clsx from "clsx";

export type StatCardVariant = "default" | "success" | "warning" | "danger" | "info";

type TrendDirection = "up" | "down" | "flat";

const variantConfig: Record<
  StatCardVariant,
  { border: string; iconBg: string; iconColor: string; valueColor: string }
> = {
  default: {
    border: "border-l-brand",
    iconBg: "bg-brand-soft",
    iconColor: "text-brand",
    valueColor: "text-slate-900",
  },
  success: {
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    valueColor: "text-emerald-700",
  },
  warning: {
    border: "border-l-amber-400",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    valueColor: "text-amber-700",
  },
  danger: {
    border: "border-l-red-500",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    valueColor: "text-red-700",
  },
  info: {
    border: "border-l-accent",
    iconBg: "bg-accent-soft",
    iconColor: "text-accent",
    valueColor: "text-slate-900",
  },
};

const trendArrow: Record<TrendDirection, string> = { up: "↑", down: "↓", flat: "→" };

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  variant?: StatCardVariant;
  trend?: {
    direction: TrendDirection;
    label: string;
    /** Whether "up" is good. Defaults to true (up=green, down=red). Set false to invert (up=red, down=green). */
    upIsGood?: boolean;
  };
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
  trend,
}: Props) {
  const v = variantConfig[variant];

  function trendColor(direction: TrendDirection, upIsGood: boolean) {
    if (direction === "flat") return "text-slate-500";
    const isPositive = direction === "up" ? upIsGood : !upIsGood;
    return isPositive ? "text-emerald-600" : "text-red-600";
  }

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-card",
        "border-l-[3px] p-5",
        v.border,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {title}
          </p>
          <p className={clsx("mt-2 text-3xl font-bold tabular-nums leading-none", v.valueColor)}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          )}
          {trend && (
            <p
              className={clsx(
                "mt-2 text-xs font-semibold",
                trendColor(trend.direction, trend.upIsGood ?? true),
              )}
            >
              {trendArrow[trend.direction]} {trend.label}
            </p>
          )}
        </div>

        {icon && (
          <div
            className={clsx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              v.iconBg,
            )}
          >
            <span className={v.iconColor}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
