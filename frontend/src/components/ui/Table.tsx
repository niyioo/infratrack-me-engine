import { ReactNode } from "react";
import { Card } from "./Card";

type Props = {
  title?: string;
  children: ReactNode;
};

export function Table({ title, children }: Props) {
  return (
    <Card>
      {title ? (
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
      ) : null}
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}