import { useState } from "react";
import { PageShell } from "@/app/layouts/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { Table } from "@/components/ui/Table";
import { DisbursementForm } from "@/components/forms/DisbursementForm";
import { TrancheStatusBadge } from "@/components/status/TrancheStatusBadge";
import {
  useTranches,
  useEvaluateTranche,
  useDisburseTranche
} from "@/features/finance/hooks";

export function FinanceQueuePage() {
  const { data: tranches = [], isLoading } = useTranches();
  const evaluateMutation = useEvaluateTranche();
  const disburseMutation = useDisburseTranche();

  const [selectedTrancheId, setSelectedTrancheId] = useState<number | null>(null);
  const [eligibility, setEligibility] = useState<any | null>(null);

  async function handleEvaluate(trancheId: number) {
    const result = await evaluateMutation.mutateAsync(trancheId);
    setEligibility(result);
    setSelectedTrancheId(trancheId);
  }

  async function handleDisburse(payload: { payment_reference: string; note?: string }) {
    if (!selectedTrancheId) return;

    await disburseMutation.mutateAsync({
      trancheId: selectedTrancheId,
      payload
    });

    setEligibility(null);
    setSelectedTrancheId(null);
  }

  return (
    <PageShell
      title="Finance Queue"
      description="Evaluate tranche eligibility and control funding disbursement."
    >
      {isLoading ? (
        <Card className="p-10">
          <div className="flex items-center gap-3">
            <Spinner />
            <p className="text-sm text-slate-500">Loading finance queue...</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Tranche Table */}
          <Table title="Funding Tranches">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Tranche</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tranches.map((tranche) => (
                  <tr key={tranche.id} className="border-t border-slate-100">
                    <td className="px-5 py-4">{tranche.project}</td>
                    <td className="px-5 py-4">{tranche.tranche_name}</td>
                    <td className="px-5 py-4">
                      ₦{Number(tranche.planned_amount).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <TrancheStatusBadge status={tranche.current_status} />
                    </td>
                    <td className="px-5 py-4">
                      <Button
                        size="sm"
                        onClick={() => handleEvaluate(tranche.id)}
                        disabled={evaluateMutation.isPending}
                      >
                        Evaluate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Table>

          {/* Eligibility Result */}
          {eligibility && (
            <Card className="p-6">
              <h3 className="text-base font-semibold">Eligibility Evaluation</h3>

              {eligibility.eligible ? (
                <Alert
                  variant="success"
                  title="Eligible for Disbursement"
                  message="All rules passed. Tranche can be released."
                />
              ) : (
                <Alert
                  variant="error"
                  title="Not Eligible"
                  message="Some conditions failed. Disbursement blocked."
                />
              )}

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">Rules Passed</p>
                  <ul className="mt-2 list-disc pl-5 text-sm text-green-600">
                    {eligibility.rules_passed.map((rule: string) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-800">Rules Failed</p>
                  <ul className="mt-2 list-disc pl-5 text-sm text-red-600">
                    {eligibility.rules_failed.map((rule: string) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Disbursement Form */}
              {eligibility.eligible && (
                <div className="mt-6">
                  <DisbursementForm
                    onSubmit={handleDisburse}
                    loading={disburseMutation.isPending}
                  />
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </PageShell>
  );
}