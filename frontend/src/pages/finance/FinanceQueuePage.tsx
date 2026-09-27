import { useState } from "react";
import axios from "axios";
import clsx from "clsx";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lock,
  LockOpen,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { PageShell } from "@/app/layouts/PageShell";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { QueryStateCard } from "@/components/ui/QueryStateCard";
import { TrancheStatusBadge } from "@/components/status/TrancheStatusBadge";
import { useDisburseTranche, useEvaluateTranche, useTranches } from "@/features/finance/hooks";
import type { FundingTranche } from "@/features/finance/types";

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatAmount(amount: string) {
  return `₦${Number(amount).toLocaleString()}`;
}

// ─── sub-components ───────────────────────────────────────────────────────────
function RuleRow({ rule, passed }: { rule: string; passed: boolean }) {
  return (
    <div
      className={clsx(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        passed
          ? "border-emerald-100 bg-emerald-50"
          : "border-red-100 bg-red-50"
      )}
    >
      {passed ? (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
      ) : (
        <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
      )}
      <span
        className={clsx(
          "text-sm font-medium leading-5",
          passed ? "text-emerald-800" : "text-red-800"
        )}
      >
        {rule}
      </span>
    </div>
  );
}

function TrancheCard({
  tranche,
  isSelected,
  onSelect,
}: {
  tranche: FundingTranche;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "group w-full rounded-xl border p-4 text-left transition-all",
        isSelected
          ? "border-brand bg-brand-soft shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {tranche.project_title}
          </p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            {tranche.project_code} · {tranche.tranche_name}
          </p>
        </div>
        <ChevronRight
          size={15}
          className={clsx(
            "mt-0.5 shrink-0 transition-colors",
            isSelected ? "text-brand" : "text-slate-300 group-hover:text-slate-400"
          )}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-base font-bold text-slate-900">{formatAmount(tranche.planned_amount)}</p>
        <TrancheStatusBadge status={tranche.current_status} />
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Project status:{" "}
        <span className="font-medium text-slate-600">
          {tranche.project_status.replace(/_/g, " ")}
        </span>
      </p>
    </button>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export function FinanceQueuePage() {
  const { data: tranches = [], isLoading, isError } = useTranches();
  const evaluateMutation = useEvaluateTranche();
  const disburseMutation = useDisburseTranche();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    rules_passed: string[];
    rules_failed: string[];
  } | null>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const selectedTranche = tranches.find((t) => t.id === selectedId) ?? null;

  function handleSelectTranche(tranche: FundingTranche) {
    setSelectedId(tranche.id);
    setEligibility(null);
    setPaymentRef("");
    setNote("");
    setFeedback(null);
  }

  async function handleEvaluate() {
    if (!selectedId) return;
    setFeedback(null);
    setEvaluating(true);
    try {
      const result = await evaluateMutation.mutateAsync(selectedId);
      setEligibility(result);
    } catch (error) {
      setFeedback({
        message: axios.isAxiosError(error)
          ? (error.response?.data?.detail as string | undefined) ||
            "Unable to evaluate the selected tranche."
          : "Unable to evaluate the selected tranche.",
        variant: "error",
      });
    } finally {
      setEvaluating(false);
    }
  }

  async function handleDisburse() {
    if (!selectedId || !paymentRef.trim()) return;
    setFeedback(null);
    try {
      await disburseMutation.mutateAsync({
        trancheId: selectedId,
        payload: { payment_reference: paymentRef.trim(), note: note.trim() || undefined },
      });
      setEligibility(null);
      setSelectedId(null);
      setPaymentRef("");
      setNote("");
      setFeedback({ message: "Disbursement recorded successfully.", variant: "success" });
    } catch (error) {
      setFeedback({
        message: axios.isAxiosError(error)
          ? (error.response?.data?.detail as string | undefined) ||
            "Disbursement could not be completed."
          : "Disbursement could not be completed.",
        variant: "error",
      });
    }
  }

  if (isLoading) {
    return (
      <PageShell
        title="Finance Queue"
        description="Evaluate tranche eligibility and execute controlled disbursements."
      >
        <QueryStateCard
          state="loading"
          title="Loading finance queue"
          description="Preparing tranche eligibility and disbursement controls."
        />
      </PageShell>
    );
  }

  if (isError) {
    return (
      <PageShell
        title="Finance Queue"
        description="Evaluate tranche eligibility and execute controlled disbursements."
      >
        <QueryStateCard
          state="error"
          title="Finance queue unavailable"
          description="The finance queue could not be loaded. Please try again shortly."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Finance Queue"
      description="Evaluate tranche eligibility, review control conditions, and execute disbursements with traceable rules."
    >
      {feedback ? <Alert variant={feedback.variant} message={feedback.message} /> : null}

      {tranches.length === 0 ? (
        <QueryStateCard
          state="empty"
          title="No tranches awaiting review"
          description="Configured funding tranches will appear here for evaluation and controlled release."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.2fr]">
          {/* ── LEFT: tranche list ───────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-base font-semibold text-slate-900">Funding Tranches</p>
              <p className="mt-0.5 text-sm text-slate-500">
                {tranches.length} tranche{tranches.length !== 1 ? "s" : ""} configured
              </p>
            </div>

            <div className="space-y-3">
              {tranches.map((tranche) => (
                <TrancheCard
                  key={tranche.id}
                  tranche={tranche}
                  isSelected={tranche.id === selectedId}
                  onSelect={() => handleSelectTranche(tranche)}
                />
              ))}
            </div>
          </div>

          {/* ── RIGHT: evaluation + disbursement panel ───────────── */}
          <div className="flex flex-col gap-4">
            {selectedTranche ? (
              <>
                {/* Tranche header */}
                <Card className="overflow-hidden p-0">
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                    <p className="text-sm font-semibold text-slate-700">Tranche Details</p>
                  </div>
                  <div className="divide-y divide-slate-50 px-5">
                    {[
                      { label: "Project", value: selectedTranche.project_title },
                      { label: "Tranche", value: selectedTranche.tranche_name },
                      { label: "Amount", value: formatAmount(selectedTranche.planned_amount) },
                      {
                        label: "Budget Share",
                        value: `${Number(selectedTranche.percentage_of_budget).toFixed(1)}%`,
                      },
                      {
                        label: "Planned Release",
                        value: selectedTranche.planned_release_date ?? "Not set",
                      },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-3">
                        <span className="text-sm text-slate-500">{label}</span>
                        <span className="text-sm font-medium text-slate-900">{value}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-slate-500">Current Status</span>
                      <TrancheStatusBadge status={selectedTranche.current_status} />
                    </div>
                  </div>
                </Card>

                {/* Evaluate button / results */}
                <Card className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Eligibility Check</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Run the configured rule engine against the current project state.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleEvaluate}
                      disabled={evaluating}
                      className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCw size={14} className={clsx(evaluating && "animate-spin")} />
                      {evaluating ? "Evaluating…" : "Run Check"}
                    </button>
                  </div>

                  {eligibility && (
                    <div className="mt-5 space-y-4">
                      {/* Summary banner */}
                      <div
                        className={clsx(
                          "flex items-start gap-3 rounded-xl border p-4",
                          eligibility.eligible
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-red-200 bg-red-50"
                        )}
                      >
                        {eligibility.eligible ? (
                          <BadgeCheck size={20} className="shrink-0 text-emerald-600" />
                        ) : (
                          <AlertTriangle size={20} className="shrink-0 text-red-500" />
                        )}
                        <div>
                          <p
                            className={clsx(
                              "text-sm font-semibold",
                              eligibility.eligible ? "text-emerald-900" : "text-red-900"
                            )}
                          >
                            {eligibility.eligible
                              ? "All rules passed — eligible for release"
                              : "Disbursement blocked — rules failed"}
                          </p>
                          <p
                            className={clsx(
                              "mt-0.5 text-xs",
                              eligibility.eligible ? "text-emerald-700" : "text-red-700"
                            )}
                          >
                            {eligibility.eligible
                              ? "This tranche meets all configured finance control conditions."
                              : "Review the failed conditions below before proceeding."}
                          </p>
                        </div>
                      </div>

                      {/* Rules list */}
                      {eligibility.rules_passed.length + eligibility.rules_failed.length > 0 && (
                        <div className="space-y-2">
                          {eligibility.rules_failed.map((rule) => (
                            <RuleRow key={rule} rule={rule} passed={false} />
                          ))}
                          {eligibility.rules_passed.map((rule) => (
                            <RuleRow key={rule} rule={rule} passed={true} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* Disbursement form — always visible, locked until eligible */}
                <Card className="overflow-hidden p-0">
                  <div
                    className={clsx(
                      "flex items-center gap-3 border-b px-5 py-3.5",
                      eligibility?.eligible
                        ? "border-emerald-100 bg-emerald-50"
                        : "border-slate-100 bg-slate-50"
                    )}
                  >
                    {eligibility?.eligible ? (
                      <LockOpen size={15} className="text-emerald-600" />
                    ) : (
                      <Lock size={15} className="text-slate-400" />
                    )}
                    <p
                      className={clsx(
                        "text-sm font-semibold",
                        eligibility?.eligible ? "text-emerald-800" : "text-slate-600"
                      )}
                    >
                      {eligibility?.eligible ? "Release Authorisation" : "Release Locked"}
                    </p>
                    {!eligibility && (
                      <span className="ml-auto text-xs text-slate-400">
                        Run eligibility check first
                      </span>
                    )}
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Payment Reference{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="e.g. TRF-2024-0042"
                        disabled={!eligibility?.eligible}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Release Note{" "}
                        <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="Add context for this release…"
                        disabled={!eligibility?.eligible}
                        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </div>

                    {/* Release button — locked vs unlocked */}
                    {eligibility?.eligible ? (
                      <button
                        type="button"
                        onClick={handleDisburse}
                        disabled={!paymentRef.trim() || disburseMutation.isPending}
                        className={clsx(
                          "flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-bold text-white transition-all",
                          !paymentRef.trim() || disburseMutation.isPending
                            ? "cursor-not-allowed bg-emerald-300"
                            : "bg-emerald-600 shadow-lg hover:bg-emerald-700 active:scale-[0.99]"
                        )}
                      >
                        <Banknote size={16} />
                        {disburseMutation.isPending
                          ? "Processing…"
                          : `Release ${formatAmount(selectedTranche.planned_amount)}`}
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-semibold text-slate-400">
                        <Lock size={14} />
                        Release Tranche — Locked
                      </div>
                    )}

                    {eligibility && !eligibility.eligible && (
                      <p className="flex items-center gap-1.5 text-xs text-red-500">
                        <AlertTriangle size={11} />
                        {eligibility.rules_failed.length} rule
                        {eligibility.rules_failed.length !== 1 ? "s" : ""} must pass before this
                        tranche can be released.
                      </p>
                    )}

                    {!eligibility && (
                      <p className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock size={11} />
                        Run an eligibility check above to unlock the release controls.
      </p>
                    )}
                  </div>
                </Card>
              </>
            ) : (
              <Card className="flex h-64 items-center justify-center p-6">
                <EmptyState
                  title="No tranche selected"
                  description="Select a funding tranche from the list to evaluate its eligibility and authorize release."
                />
              </Card>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
