import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Item = {
  date: string;
  risk_score: number;
};

export function RiskTrendChart({ data }: { data: Item[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="risk_score" stroke="#dc2626" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}