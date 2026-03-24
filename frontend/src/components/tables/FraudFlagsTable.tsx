import type { FraudFlag } from "@/features/qa/types";
import { Table } from "@/components/ui/Table";

export function FraudFlagsTable({ items }: { items: FraudFlag[] }) {
  return (
    <Table title="Fraud Flags">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-5 py-3">Type</th>
            <th className="px-5 py-3">Severity</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Description</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-slate-100">
              <td className="px-5 py-4">{item.flag_type}</td>
              <td className="px-5 py-4">{item.severity}</td>
              <td className="px-5 py-4">{item.status}</td>
              <td className="px-5 py-4">{item.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Table>
  );
}