import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Item = {
  tranche: string;
  amount: number;
};

export function TrancheHistoryChart({ data }: { data: Item[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="tranche" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="amount" stroke="#0f172a" fill="#cbd5e1" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}