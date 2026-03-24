import { Card } from "./Card";

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
};

export function StatCard({ title, value, subtitle }: Props) {
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
    </Card>
  );
}