import { ReactNode } from "react";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
};

export function Drawer({ open, title, onClose, children }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40">
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="text-sm text-slate-500">Close</button>
        </div>
        <div className="h-[calc(100%-65px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}