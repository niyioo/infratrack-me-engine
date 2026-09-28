import { useMemo, useState } from "react";
import axios from "axios";
import clsx from "clsx";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Flag,
  MapPin,
  RefreshCw,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import { PageShell } from "@/app/layouts/PageShell";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { QueryStateCard } from "@/components/ui/QueryStateCard";
import { useEvidenceSubmissions } from "@/features/evidence/hooks";
import type { EvidenceSubmission } from "@/features/evidence/types";
import { useMilestones } from "@/features/milestones/hooks";
import { useCreateQaReview, useQaReviews } from "@/features/qa/hooks";
import { formatDate } from "@/lib/utils/format";

// GPS fix of the primary photo (where the officer actually stood), not the site pin.
function formatCaptureLocation(submission: EvidenceSubmission) {
  const files = submission.files ?? [];
  const file = files.find((f) => f.is_primary) ?? files[0];
  if (file?.latitude == null || file?.longitude == null) return "Not recorded";
  const lat = `${Math.abs(file.latitude).toFixed(5)}°${file.latitude >= 0 ? "N" : "S"}`;
  const lng = `${Math.abs(file.longitude).toFixed(5)}°${file.longitude >= 0 ? "E" : "W"}`;
  return `${lat}, ${lng}`;
}

// ─── types ────────────────────────────────────────────────────────────────────
type Decision = "APPROVED" | "REWORK_REQUIRED" | "REJECTED" | "FLAGGED";

// ─── decision config ──────────────────────────────────────────────────────────
const DECISIONS: {
  value: Decision;
  label: string;
  icon: React.ElementType;
  btnClass: string;
  ringClass: string;
}[] = [
  {
    value: "APPROVED",
    label: "Approve",
    icon: CheckCircle2,
    btnClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300",
    ringClass: "ring-2 ring-emerald-500 border-emerald-300 bg-emerald-100",
  },
  {
    value: "REWORK_REQUIRED",
    label: "Request Rework",
    icon: RefreshCw,
    btnClass:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300",
    ringClass: "ring-2 ring-amber-500 border-amber-300 bg-amber-100",
  },
  {
    value: "REJECTED",
    label: "Reject",
    icon: XCircle,
    btnClass: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300",
    ringClass: "ring-2 ring-red-500 border-red-300 bg-red-100",
  },
  {
    value: "FLAGGED",
    label: "Flag Fraud",
    icon: Flag,
    btnClass:
      "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-300",
    ringClass: "ring-2 ring-purple-500 border-purple-300 bg-purple-100",
  },
];

function extractApiError(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as Record<string, unknown> | undefined;
  if (!data) return fallback;
  if (typeof data.detail === "string") return data.detail;
  // DRF field errors: { field: ["message"] }
  const first = Object.values(data).flat()[0];
  return typeof first === "string" ? first : fallback;
}

// ─── geo status badge ─────────────────────────────────────────────────────────
function GeoStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    PASSED: {
      label: "Geo Validated",
      classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    FAILED: {
      label: "Geo Failed",
      classes: "bg-red-50 text-red-700 border-red-200",
    },
    PENDING: {
      label: "Geo Pending",
      classes: "bg-amber-50 text-amber-700 border-amber-200",
    },
    EXCEPTION_REQUESTED: {
      label: "Exception Pending",
      classes: "bg-orange-50 text-orange-700 border-orange-200",
    },
    EXCEPTION_APPROVED: {
      label: "Exception Approved",
      classes: "bg-blue-50 text-blue-700 border-blue-200",
    },
  };
  const c = config[status] ?? { label: status, classes: "bg-slate-50 text-slate-600 border-slate-200" };
  return (
    <span className={clsx("rounded-full border px-2.5 py-0.5 text-xs font-semibold", c.classes)}>
      {c.label}
    </span>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export function MilestoneReviewPage() {
  const {
    data: submissions = [],
    isLoading: evidenceLoading,
    isError: evidenceError,
  } = useEvidenceSubmissions({ submission_status: "SUBMITTED" });
  const {
    data: milestones = [],
    isLoading: milestonesLoading,
    isError: milestonesError,
  } = useMilestones();
  const { data: reviews = [] } = useQaReviews();
  const createReview = useCreateQaReview();

  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [itemScores, setItemScores] = useState<Record<number, number>>({});
  const [comments, setComments] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reviewableSubmissions = useMemo(
    () =>
      submissions.filter(
        (s) =>
          s.submission_status === "SUBMITTED" &&
          // The backend refuses QA until any geo-fence exception is resolved.
          !s.requires_exception_review &&
          !reviews.some((r) => r.evidence_submission === s.id)
      ),
    [reviews, submissions]
  );

  const selectedSubmission =
    reviewableSubmissions.find((s) => s.id === selectedSubmissionId) ??
    reviewableSubmissions[0] ??
    null;

  const selectedMilestone =
    milestones.find((m) => m.id === selectedSubmission?.milestone) ?? null;

  function handleSelectSubmission(id: number) {
    setSelectedSubmissionId(id);
    setItemScores({});
    setComments("");
    setDecision(null);
    setFeedback(null);
  }

  async function handleSubmit(chosenDecision: Decision) {
    if (!selectedSubmission || !selectedMilestone) return;

    setFeedback(null);
    setSubmitting(true);
    try {
      await createReview.mutateAsync({
        evidence_submission_id: selectedSubmission.id,
        decision: chosenDecision,
        comments,
        item_scores: selectedMilestone.checklist_items.map((item) => ({
          checklist_item_id: item.id,
          score_awarded: Number(itemScores[item.id] ?? 0),
          comment: "",
        })),
      });
      setFeedback({ message: "QA review submitted successfully.", variant: "success" });
      setSelectedSubmissionId(null);
      setItemScores({});
      setComments("");
      setDecision(null);
    } catch (error) {
      setDecision(null);
      setFeedback({ message: extractApiError(error, "The QA review could not be submitted."), variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  const loading = evidenceLoading || milestonesLoading;
  const hasError = evidenceError || milestonesError;

  if (loading) {
    return (
      <PageShell
        title="Milestone Review Queue"
        description="Review submitted evidence, score milestone checklists, and record QA decisions."
      >
        <QueryStateCard
          state="loading"
          title="Loading review queue"
          description="Preparing submitted evidence and milestone checklist context."
        />
      </PageShell>
    );
  }

  if (hasError) {
    return (
      <PageShell
        title="Milestone Review Queue"
        description="Review submitted evidence, score milestone checklists, and record QA decisions."
      >
        <QueryStateCard
          state="error"
          title="Review queue unavailable"
          description="Submitted evidence or milestone checklist data could not be loaded."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Milestone Review Queue"
      description="Review submitted evidence, score milestone checklists, and record QA decisions with traceable outcomes."
    >
      {reviewableSubmissions.length === 0 ? (
        <QueryStateCard
          state="empty"
          title="No submissions awaiting QA"
          description="Submitted evidence will appear here once it is ready for review."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.1fr]">
          {/* ── LEFT: submission queue ───────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-slate-900">Submission Queue</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {reviewableSubmissions.length} pending review
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {reviewableSubmissions.map((submission) => {
                const isActive = submission.id === selectedSubmission?.id;
                return (
                  <button
                    key={submission.id}
                    type="button"
                    onClick={() => handleSelectSubmission(submission.id)}
                    className={clsx(
                      "group w-full rounded-xl border p-4 text-left transition-all",
                      isActive
                        ? "border-brand bg-brand-soft shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {submission.project_title}
                        </p>
                        <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                          {submission.project_code} · {submission.milestone_name}
                        </p>
                      </div>
                      <ChevronRight
                        size={15}
                        className={clsx(
                          "mt-0.5 shrink-0 transition-colors",
                          isActive ? "text-brand" : "text-slate-300 group-hover:text-slate-400"
                        )}
                      />
                    </div>

                    {/* Meta row */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User size={11} />
                        {submission.submitted_by_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText size={11} />
                        {submission.file_count} file{submission.file_count !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatDate(submission.submitted_at)}
                      </span>
                    </div>

                    {/* Badges */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <GeoStatusBadge status={submission.geo_validation_status} />
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        {submission.source_type.replace(/_/g, " ")}
                      </span>
                      {submission.requires_exception_review && (
                        <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                          Exception Required
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: review panel ──────────────────────────────── */}
          <div className="flex flex-col gap-4">
            {feedback ? <Alert variant={feedback.variant} message={feedback.message} /> : null}

            {selectedSubmission ? (
              <>
                {/* Submission context */}
                <Card className="overflow-hidden p-0">
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                    <p className="text-sm font-semibold text-slate-700">Submission Details</p>
                  </div>
                  <div className="divide-y divide-slate-50 px-5">
                    {[
                      {
                        label: "Project",
                        icon: Shield,
                        value: `${selectedSubmission.project_title} (${selectedSubmission.project_code})`,
                      },
                      {
                        label: "Milestone",
                        icon: Flag,
                        value: selectedSubmission.milestone_name,
                      },
                      {
                        label: "Captured at",
                        icon: MapPin,
                        value: formatCaptureLocation(selectedSubmission),
                      },
                      {
                        label: "Submitted by",
                        icon: User,
                        value: selectedSubmission.submitted_by_name,
                      },
                      {
                        label: "Submitted",
                        icon: Clock,
                        value: formatDate(selectedSubmission.submitted_at),
                      },
                    ].map(({ label, icon: Icon, value }) => (
                      <div key={label} className="flex items-center justify-between py-3">
                        <span className="flex items-center gap-2 text-sm text-slate-500">
                          <Icon size={14} className="text-slate-400" />
                          {label}
                        </span>
                        <span className="text-sm font-medium text-slate-900">{value}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-3">
                      <span className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin size={14} className="text-slate-400" />
                        Geo Validation
                      </span>
                      <GeoStatusBadge status={selectedSubmission.geo_validation_status} />
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="flex items-center gap-2 text-sm text-slate-500">
                        <FileText size={14} className="text-slate-400" />
                        Evidence Files
                      </span>
                      <span className="rounded-full bg-brand-soft px-3 py-0.5 text-sm font-semibold text-brand">
                        {selectedSubmission.file_count} file
                        {selectedSubmission.file_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Checklist scoring */}
                {selectedMilestone && selectedMilestone.checklist_items.length > 0 ? (
                  <Card className="overflow-hidden p-0">
                    <div className="border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                      <p className="text-sm font-semibold text-slate-700">Checklist Scoring</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Score each item against the submitted evidence.
                      </p>
                    </div>
                    <div className="divide-y divide-slate-50 px-5">
                      {selectedMilestone.checklist_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 py-3.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800">{item.title}</p>
                            {item.is_required && (
                              <p className="mt-0.5 text-xs text-slate-400">Required</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={item.max_score}
                              value={itemScores[item.id] ?? ""}
                              onChange={(e) =>
                                setItemScores((prev) => ({
                                  ...prev,
                                  [item.id]: Math.min(
                                    item.max_score,
                                    Math.max(0, Number(e.target.value))
                                  ),
                                }))
                              }
                              placeholder="0"
                              className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-semibold text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                            <span className="text-xs text-slate-400">/ {item.max_score}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ) : null}

                {/* Comments */}
                <Card className="p-5">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Reviewer Comments
                    <span className="ml-1 font-normal text-slate-400">
                      (required for rework, reject or flag)
                    </span>
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    placeholder="Add any observations, notes, or context for this decision…"
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </Card>

                {/* Decision buttons */}
                <Card className="p-5">
                  <p className="mb-1 text-sm font-semibold text-slate-700">Record Decision</p>
                  <p className="mb-4 text-xs text-slate-400">
                    Selecting a decision will immediately submit this review and move the
                    submission to the corresponding workflow state.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {DECISIONS.map(({ value, label, icon: Icon, btnClass, ringClass }) => {
                      const isSelected = decision === value;
                      const needsComment = value !== "APPROVED" && !comments.trim();
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={submitting || needsComment}
                          title={needsComment ? "Add a reviewer comment to use this decision" : undefined}
                          onClick={() => {
                            setDecision(value);
                            handleSubmit(value);
                          }}
                          className={clsx(
                            "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60",
                            isSelected ? ringClass : btnClass
                          )}
                        >
                          <Icon size={15} />
                          {submitting && isSelected ? "Submitting…" : label}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                    <AlertTriangle size={11} className="text-amber-400" />
                    This action is permanent and will be recorded in the audit trail.
                  </p>
                </Card>
              </>
            ) : (
              <Card className="flex h-64 items-center justify-center p-6">
                <EmptyState
                  title="No submission selected"
                  description="Choose an evidence submission from the queue to begin review."
                />
              </Card>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
