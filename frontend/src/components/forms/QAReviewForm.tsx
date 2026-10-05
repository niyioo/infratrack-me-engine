import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/Button";

type Props = {
  checklistItems: { id: number; title: string; max_score: number }[];
  onSubmit: (payload: {
    decision: string;
    comments: string;
    item_scores: { checklist_item_id: number; score_awarded: number; comment: string }[];
  }) => void;
};

type FormValues = {
  decision: string;
  comments: string;
  item_scores: Record<string, number>;
};

export function QAReviewForm({ checklistItems, onSubmit }: Props) {
  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      decision: "APPROVED",
      comments: "",
      item_scores: {}
    }
  });

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit((values) => {
        onSubmit({
          decision: values.decision,
          comments: values.comments,
          item_scores: checklistItems.map((item) => ({
            checklist_item_id: item.id,
            score_awarded: Number(values.item_scores?.[item.id] ?? 0),
            comment: ""
          }))
        });
      })}
    >
      <div>
        <label className="mb-2 block text-sm font-medium">Decision</label>
        <select {...register("decision")} className="w-full rounded-lg border border-slate-300 px-3 py-2">
          <option value="APPROVED">Approve</option>
          <option value="REJECTED">Reject</option>
          <option value="REWORK_REQUIRED">Request Rework</option>
          <option value="FLAGGED">Flag Suspected Fraud</option>
        </select>
      </div>

      <div className="space-y-3">
        {checklistItems.map((item) => (
          <div key={item.id}>
            <label className="mb-2 block text-sm font-medium">
              {item.title} (max {item.max_score})
            </label>
            <input
              type="number"
              min={0}
              max={item.max_score}
              {...register(`item_scores.${item.id}` as `item_scores.${string}`)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Comments</label>
        <textarea
          {...register("comments")}
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <Button type="submit">Submit Review</Button>
    </form>
  );
}
