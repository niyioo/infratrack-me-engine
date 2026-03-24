import { z } from "zod";

export const disbursementSchema = z.object({
  payment_reference: z.string().min(3),
  note: z.string().optional()
});