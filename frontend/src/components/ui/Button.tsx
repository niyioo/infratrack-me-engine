import React from "react";
import clsx from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className, ...props }: Props) {
  return (
    <button
      {...props}
      className={clsx(
        "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  );
}