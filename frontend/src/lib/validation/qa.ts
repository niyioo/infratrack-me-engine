import { z } from "zod";

export const qaReviewSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "REWORK_REQUIRED", "FLAGGED"]),
  comments: z.string().optional()
});