import { useState } from "react";
import { FileDown } from "lucide-react";
import { downloadProjectReport } from "@/features/projects/api";
import { getApiErrorMessage } from "@/lib/api/errors";

/** Downloads the fingerprinted PDF monitoring report for one project. */
export function ProjectReportButton({ project }: { project: { id: number; project_code: string } }) {
  const [state, setState] = useState<{ busy: boolean; error?: string; fingerprint?: string }>({ busy: false });

  async function handleClick() {
    setState({ busy: true });
    try {
      const fingerprint = await downloadProjectReport(project);
      setState({ busy: false, fingerprint });
    } catch (error) {
      setState({ busy: false, error: getApiErrorMessage(error, "The report could not be generated.") });
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={state.busy}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileDown size={16} />
        {state.busy ? "Generating…" : "Download report"}
      </button>
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state.fingerprint ? (
        <p className="text-xs text-slate-500" title={state.fingerprint}>
          Fingerprint {state.fingerprint.slice(0, 12)}…
        </p>
      ) : null}
    </div>
  );
}
