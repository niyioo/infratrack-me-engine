import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

type Item = {
  name: string;
  physical: number;
  financial: number;
};

export function BurnVsPhysicalChart({ data }: { data: Item[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="physical" name="Physical %" fill="#0f172a" />
          <Bar dataKey="financial" name="Financial %" fill="#64748b" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}