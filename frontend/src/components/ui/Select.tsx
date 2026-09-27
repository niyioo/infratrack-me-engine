import React from "react";
import clsx from "clsx";

type Props = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: Props) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 disabled:bg-slate-100 disabled:text-slate-400",
        className
      )}
    >
      {children}
    </select>
  );
}
