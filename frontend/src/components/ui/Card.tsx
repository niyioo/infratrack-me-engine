import { ReactNode } from "react";
import clsx from "clsx";

type Props = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: Props) {
  return (
    <div className={clsx("rounded-xl border border-slate-200/90 bg-white shadow-brand", className)}>
      {children}
    </div>
  );
}
