import { PageShell } from "@/app/layouts/PageShell";
import { DisbursementTable } from "@/components/tables/DisbursementTable";
import { QueryStateCard } from "@/components/ui/QueryStateCard";
import { useDisbursements } from "@/features/finance/hooks";

export function DisbursementHistoryPage() {
  const { data: disbursements = [], isLoading, isError } = useDisbursements();

  return (
    <PageShell
      title="Disbursement History"
      description="Auditable record of released tranches, payment references, and release timestamps."
    >
      {isLoading ? (
        <QueryStateCard
          state="loading"
          title="Loading disbursement history"
          description="Retrieving released tranche records and payment references."
        />
      ) : isError ? (
        <QueryStateCard
          state="error"
          title="Disbursement history unavailable"
          description="Released tranche records could not be loaded right now."
        />
      ) : disbursements.length === 0 ? (
        <QueryStateCard
          state="empty"
          title="No disbursements recorded"
          description="Approved and released tranches will appear here with their payment references."
        />
      ) : (
        <DisbursementTable items={disbursements} />
      )}
    </PageShell>
  );
}
