import { ReactNode } from "react";
import { Alert } from "./Alert";
import { EmptyState } from "./EmptyState";
import { Spinner } from "./Spinner";

type Props = {
  state: "loading" | "error" | "empty";
  title: string;
  description: string;
  action?: ReactNode;
};

export function QueryStateCard({ state, title, description, action }: Props) {
  if (state === "loading") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <div className="flex items-center gap-3">
          <Spinner />
          <div>
            <p className="text-sm font-medium text-slate-900">{title}</p>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <Alert title={title} message={description} variant="error" />
        {action}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <EmptyState title={title} description={description} />
      {action}
    </div>
  );
}
