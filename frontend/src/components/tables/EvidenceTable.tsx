import type { EvidenceSubmission } from "@/features/evidence/types";
import { Table } from "@/components/ui/Table";

export function EvidenceTable({ items }: { items: EvidenceSubmission[] }) {
  return (
    <Table title="Evidence Submissions">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-5 py-3">Source</th>
            <th className="px-5 py-3">Submitted By</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Geo</th>
            <th className="px-5 py-3">Submitted At</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-slate-100">
              <td className="px-5 py-4">{item.source_type}</td>
              <td className="px-5 py-4">{item.submitted_by_name}</td>
              <td className="px-5 py-4">{item.submission_status}</td>
              <td className="px-5 py-4">{item.geo_validation_status}</td>
              <td className="px-5 py-4">{item.submitted_at || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Table>
  );
}