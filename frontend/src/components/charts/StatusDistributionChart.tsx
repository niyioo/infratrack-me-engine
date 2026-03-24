import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

type Item = {
  name: string;
  value: number;
  color: string;
};

export function StatusDistributionChart({ data }: { data: Item[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={90}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}