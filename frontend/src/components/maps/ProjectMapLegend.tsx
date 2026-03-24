export function ProjectMapLegend() {
  const items = [
    { color: "bg-blue-500", label: "Active / In Progress" },
    { color: "bg-green-500", label: "Completed" },
    { color: "bg-orange-500", label: "Delayed" },
    { color: "bg-red-500", label: "Flagged" }
  ];

  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${item.color}`} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}