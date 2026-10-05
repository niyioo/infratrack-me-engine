import clsx from "clsx";

export type TabItem = {
  key: string;
  label: string;
};

type Props = {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
};

export function Tabs({ items, active, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={clsx(
            "rounded-lg px-4 py-2 text-sm font-medium",
            active === item.key
              ? "bg-brand text-white shadow-brand"
              : "bg-brand-soft/60 text-brand-strong hover:bg-brand-soft"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
