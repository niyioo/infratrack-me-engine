import type { Disbursement } from "@/features/finance/types";
import { Table } from "@/components/ui/Table";

export function DisbursementTable({ items }: { items: Disbursement[] }) {
  return (
    <Table title="Disbursements">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-5 py-3">Project</th>
            <th className="px-5 py-3">Tranche</th>
            <th className="px-5 py-3">Amount</th>
            <th className="px-5 py-3">Payment Ref</th>
            <th className="px-5 py-3">Released At</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-slate-100">
              <td className="px-5 py-4">
                <div>
                  <p className="font-medium text-slate-900">{item.project_title}</p>
                  <p className="text-slate-500">{item.project_code}</p>
                </div>
              </td>
              <td className="px-5 py-4">{item.tranche_name}</td>
              <td className="px-5 py-4">{item.amount}</td>
              <td className="px-5 py-4">{item.payment_reference}</td>
              <td className="px-5 py-4">{item.release_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Table>
  );
}
