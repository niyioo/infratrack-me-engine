import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, MessageSquareText, Search } from "lucide-react";
import { trackReport, type ReportStatus } from "@/api";

const STATUS_STYLE: Record<string, string> = {
  Received: "bg-slate-100 text-slate-700",
  "Under review": "bg-brand-soft text-brand",
  "Site visit scheduled": "bg-amber-50 text-amber-700",
  "Escalated for investigation": "bg-red-50 text-red-700",
  Resolved: "bg-emerald-50 text-emerald-700",
  Closed: "bg-slate-100 text-slate-500",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function TrackPage() {
  const { code: routeCode } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(routeCode ?? "");
  const [report, setReport] = useState<ReportStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routeCode) return;
    setCode(routeCode);
    setLoading(true);
    setError(null);
    setReport(null);
    trackReport(routeCode)
      .then(setReport)
      .catch((err: Error & { status?: number }) =>
        setError(err.status === 404 ? "No report found with that code. Check it and try again." : err.message)
      )
      .finally(() => setLoading(false));
  }, [routeCode]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) navigate(`/track/${trimmed}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Track your report</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the code you received after sending your report.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="CR-XXXXXXXX"
          autoCapitalize="characters"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-base uppercase tracking-wider placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={!code.trim() || loading}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong disabled:bg-slate-300"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Check
        </button>
      </form>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {report && (
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold tracking-wider text-slate-400">{report.tracking_code}</p>
              <p className="mt-1 font-semibold leading-snug text-slate-900">{report.project_title}</p>
              <p className="mt-0.5 text-sm text-slate-500">{report.category_label}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[report.status_label] ?? STATUS_STYLE.Received}`}
            >
              {report.status_label}
            </span>
          </header>

          <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Sent</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{formatDate(report.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Last update</dt>
              <dd className="mt-0.5 font-medium text-slate-800">{formatDate(report.updated_at)}</dd>
            </div>
          </dl>

          {report.public_response && (
            <div className="mx-5 mb-5 flex gap-3 rounded-xl bg-brand-soft p-4">
              <MessageSquareText size={18} className="mt-0.5 shrink-0 text-brand" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">Response from the team</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{report.public_response}</p>
              </div>
            </div>
          )}
        </article>
      )}
    </div>
  );
}
