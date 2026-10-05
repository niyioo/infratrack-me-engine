import { useMemo, useState } from "react";
import axios from "axios";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import {
  useApproveGeoFenceException,
  useRejectGeoFenceException
} from "@/features/evidence/hooks";
import type { GeoFenceExceptionRequest } from "@/features/evidence/types";

type Props = {
  items: GeoFenceExceptionRequest[];
  canReview: boolean;
  loading?: boolean;
};

function formatDistance(distance: number) {
  return `${Math.round(distance).toLocaleString()} m`;
}

export function GeoFenceExceptionsPanel({ items, canReview, loading = false }: Props) {
  const approveMutation = useApproveGeoFenceException();
  const rejectMutation = useRejectGeoFenceException();
  const [decisionNotes, setDecisionNotes] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  const pendingItems = useMemo(() => items.filter((item) => item.status === "PENDING"), [items]);

  async function handleApprove(exceptionId: number) {
    setFeedback(null);
    try {
      await approveMutation.mutateAsync({
        exceptionId,
        payload: { decision_note: decisionNotes[exceptionId] || "" }
      });
      setFeedback("Geo-fence exception approved successfully.");
    } catch (error) {
      setFeedback(
        axios.isAxiosError(error)
          ? (error.response?.data?.detail as string | undefined) || "Unable to approve exception."
          : "Unable to approve exception."
      );
    }
  }

  async function handleReject(exceptionId: number) {
    setFeedback(null);
    try {
      await rejectMutation.mutateAsync({
        exceptionId,
        payload: { decision_note: decisionNotes[exceptionId] || "" }
      });
      setFeedback("Geo-fence exception rejected successfully.");
    } catch (error) {
      setFeedback(
        axios.isAxiosError(error)
          ? (error.response?.data?.detail as string | undefined) || "Unable to reject exception."
          : "Unable to reject exception."
      );
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Geo-Fence Exceptions</h3>
          <p className="mt-1 text-sm text-slate-500">
            Review blocked evidence submissions that were captured outside the approved project radius.
          </p>
        </div>
        <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
          {pendingItems.length} pending
        </div>
      </div>

      {feedback ? (
        <div className="mt-4">
          <Alert
            variant={feedback.includes("successfully") ? "success" : "error"}
            message={feedback}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 flex items-center gap-3">
          <Spinner />
          <p className="text-sm text-slate-500">Loading geo-fence exceptions...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No geo-fence exceptions"
            description="Blocked location exceptions will appear here when field submissions need manual review."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((item) => {
            const isPending = item.status === "PENDING";
            const isMutating = approveMutation.isPending || rejectMutation.isPending;

            return (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Exception #{item.id} {item.submission ? `for submission ${item.submission}` : ""}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Status: {item.status}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600">
                    Distance from site: <span className="font-medium">{formatDistance(item.distance_from_site_meters)}</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-slate-500">Coordinates</p>
                    <p className="mt-1">
                      {item.current_latitude}, {item.current_longitude}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-500">Created</p>
                    <p className="mt-1">{item.created_at}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs uppercase text-slate-500">Reason</p>
                  <p className="mt-1 text-sm text-slate-700">{item.reason}</p>
                </div>

                {item.decision_note ? (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs uppercase text-slate-500">Decision Note</p>
                    <p className="mt-1 text-sm text-slate-700">{item.decision_note}</p>
                  </div>
                ) : null}

                {canReview && isPending ? (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={decisionNotes[item.id] ?? ""}
                      onChange={(event) =>
                        setDecisionNotes((current) => ({ ...current, [item.id]: event.target.value }))
                      }
                      rows={3}
                      placeholder="Add an optional decision note for the audit trail..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <div className="flex gap-3">
                      <Button onClick={() => handleApprove(item.id)} disabled={isMutating} type="button">
                        Approve Exception
                      </Button>
                      <Button
                        onClick={() => handleReject(item.id)}
                        disabled={isMutating}
                        type="button"
                        className="bg-white text-slate-900 border border-slate-300"
                      >
                        Reject Exception
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
