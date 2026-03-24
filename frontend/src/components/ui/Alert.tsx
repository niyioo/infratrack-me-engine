import clsx from "clsx";

type Props = {
  title?: string;
  message: string;
  variant?: "info" | "success" | "warning" | "error";
};

const styles = {
  info: "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-800"
};

export function Alert({ title, message, variant = "info" }: Props) {
  return (
    <div className={clsx("rounded-xl border px-4 py-3", styles[variant])}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <p className="text-sm">{message}</p>
    </div>
  );
}