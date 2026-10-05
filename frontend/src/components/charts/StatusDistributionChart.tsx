type Item = {
  name: string;
  value: number;
  color: string;
};

export function StatusDistributionChart({ data }: { data: Item[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex h-80 w-full flex-col items-center justify-center gap-6 md:flex-row md:justify-between">
      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="h-52 w-52 -rotate-90">
          <circle cx="100" cy="100" r={radius} fill="transparent" stroke="#e2e8f0" strokeWidth="28" />
          {data.map((entry) => {
            const segmentLength = total > 0 ? (entry.value / total) * circumference : 0;
            const circle = (
              <circle
                key={entry.name}
                cx="100"
                cy="100"
                r={radius}
                fill="transparent"
                stroke={entry.color}
                strokeWidth="28"
                strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += segmentLength;
            return circle;
          })}
        </svg>
        <div className="absolute text-center">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
          <p className="text-2xl font-semibold text-slate-900">{total}</p>
        </div>
      </div>

      <div className="grid flex-1 gap-3">
        {data.map((entry) => {
          const percentage = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div key={entry.name} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm font-medium text-slate-800">{entry.name}</span>
                </div>
                <span className="text-sm text-slate-500">{percentage}%</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{entry.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
