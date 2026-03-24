import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function DisbursementForm({ onSubmit, loading }: { onSubmit: (payload: { payment_reference: string; note?: string }) => void; loading?: boolean }) {
  const [paymentReference, setPaymentReference] = useState("");
  const [note, setNote] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ payment_reference: paymentReference, note });
      }}
    >
      <Input placeholder="Payment Reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
      <Input placeholder="Optional Note" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Disburse"}
      </Button>
    </form>
  );
}