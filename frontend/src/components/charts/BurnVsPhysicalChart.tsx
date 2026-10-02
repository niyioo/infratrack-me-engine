type Item = {
  name: string;
  physical: number;
  financial: number;
};

export function BurnVsPhysicalChart({ data }: { data: Item[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_72px_72px] gap-3 text-xs uppercase tracking-wide text-slate-500">
        <span>Project</span>
        <span className="text-right">Physical</span>
        <span className="text-right">Financial</span>
      </div>

      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.name} className="grid grid-cols-[minmax(0,1fr)_72px_72px] gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-500">Gap {Math.round(item.financial - item.physical)}%</p>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Physical</span>
                    <span>{Math.round(item.physical)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-slate-900"
                      style={{ width: `${Math.max(0, Math.min(item.physical, 100))}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Financial</span>
                    <span>{Math.round(item.financial)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-slate-400"
                      style={{ width: `${Math.max(0, Math.min(item.financial, 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end text-sm font-medium text-slate-900">
              {Math.round(item.physical)}%
            </div>
            <div className="flex items-center justify-end text-sm font-medium text-slate-600">
              {Math.round(item.financial)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
