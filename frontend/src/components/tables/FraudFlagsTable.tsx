import { useState } from "react";
import axios from "axios";
import clsx from "clsx";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import type { FraudFlag, FraudFlagResolution } from "@/features/qa/types";
import { useResolveFraudFlag } from "@/features/qa/hooks";
import { Table } from "@/components/ui/Table";

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-red-50 text-red-700 border-red-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DISMISSED: "bg-slate-50 text-slate-600 border-slate-200",
};

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    if (typeof data?.detail === "string") return data.detail;
    const first = data ? Object.values(data).flat()[0] : undefined;
    if (typeof first === "string") return first;
  }
  return "The fraud flag could not be resolved.";
}

function ResolveForm({ flag, onDone }: { flag: FraudFlag; onDone: () => void }) {
  const resolve = useResolveFraudFlag();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(resolution: FraudFlagResolution) {
    setError(null);
    try {
      await resolve.mutateAsync({ flagId: flag.id, resolution, note: note.trim() });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const disabled = resolve.isPending || !note.trim();
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="What did the investigation find? (required, recorded in the audit trail)"
        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => submit("RESOLVED")}
          title="Wrongdoing confirmed and remediated"
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 size={14} /> Resolved: issue remediated
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => submit("DISMISSED")}
          title="Investigation found no wrongdoing"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <XCircle size={14} /> Dismiss: false positive
        </button>
        <button type="button" onClick={onDone} className="px-2 text-sm font-medium text-slate-500 hover:text-slate-700">
          Cancel
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Resolving unblocks tranche release. A flagged milestone goes back to <strong>Rework Required</strong>, so fresh
        evidence must still pass QA before any payment.
      </p>
    </div>
  );
}

export function FraudFlagsTable({ items, canResolve = false }: { items: FraudFlag[]; canResolve?: boolean }) {
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  return (
    <Table title="Fraud Flags">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-5 py-3">Milestone</th>
            <th className="px-5 py-3">Type</th>
            <th className="px-5 py-3">Severity</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Details</th>
            {canResolve && <th className="px-5 py-3" />}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={canResolve ? 6 : 5} className="px-5 py-8 text-center text-slate-500">
                No fraud flags on this project.
              </td>
            </tr>
          )}
          {items.map((item) => (
            <FlagRows
              key={item.id}
              item={item}
              canResolve={canResolve}
              resolving={resolvingId === item.id}
              onResolve={() => setResolvingId(item.id)}
              onDone={() => setResolvingId(null)}
            />
          ))}
        </tbody>
      </table>
    </Table>
  );
}

function FlagRows({
  item,
  canResolve,
  resolving,
  onResolve,
  onDone,
}: {
  item: FraudFlag;
  canResolve: boolean;
  resolving: boolean;
  onResolve: () => void;
  onDone: () => void;
}) {
  const isOpen = item.status === "OPEN";
  return (
    <>
      <tr className="border-t border-slate-100 align-top">
        <td className="px-5 py-4">{item.milestone_name || "—"}</td>
        <td className="px-5 py-4">
          <span className="inline-flex items-center gap-1.5">
            <ShieldAlert size={14} className={isOpen ? "text-red-500" : "text-slate-400"} />
            {item.flag_type.replace(/_/g, " ").toLowerCase()}
          </span>
        </td>
        <td className="px-5 py-4">{item.severity}</td>
        <td className="px-5 py-4">
          <span
            className={clsx(
              "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              STATUS_STYLE[item.status] ?? STATUS_STYLE.DISMISSED
            )}
          >
            {item.status}
          </span>
        </td>
        <td className="max-w-md px-5 py-4">
          <p className="text-slate-700">{item.description}</p>
          {item.flagged_by_name && <p className="mt-1 text-xs text-slate-400">Raised by {item.flagged_by_name}</p>}
          {!isOpen && item.resolution_note && (
            <p className="mt-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
              {item.resolved_by_name ?? "Resolved"}: {item.resolution_note}
            </p>
          )}
        </td>
        {canResolve && (
          <td className="px-5 py-4 text-right">
            {isOpen && !resolving && (
              <button
                type="button"
                onClick={onResolve}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Resolve
              </button>
            )}
          </td>
        )}
      </tr>
      {resolving && (
        <tr>
          <td colSpan={canResolve ? 6 : 5} className="px-5 pb-4">
            <ResolveForm flag={item} onDone={onDone} />
          </td>
        </tr>
      )}
    </>
  );
}
