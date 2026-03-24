import type { EvidenceSubmission } from "@/features/evidence/types";
import { Card } from "@/components/ui/Card";

export function ProjectEvidenceGallery({ items }: { items: EvidenceSubmission[] }) {
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold">Evidence Gallery</h3>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No evidence submitted yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium">{item.source_type}</p>
              <p className="text-xs text-slate-500">Status: {item.submission_status}</p>
              <p className="text-xs text-slate-500">Geo: {item.geo_validation_status}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}