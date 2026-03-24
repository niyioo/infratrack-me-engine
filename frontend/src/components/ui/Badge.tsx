import clsx from "clsx";

type Variant = "gray" | "green" | "red" | "amber" | "blue";

const styles: Record<Variant, string> = {
  gray: "bg-slate-100 text-slate-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700"
};

export function Badge({ label, variant = "gray" }: { label: string; variant?: Variant }) {
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", styles[variant])}>
      {label}
    </span>
  );
}