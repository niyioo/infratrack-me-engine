import React from "react";
import clsx from "clsx";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: Props) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500",
        className
      )}
    />
  );
}