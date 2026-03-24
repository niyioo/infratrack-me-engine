import { z } from "zod";

export const projectSchema = z.object({
  project_code: z.string().min(2),
  title: z.string().min(3),
  state: z.string().min(2),
  lga: z.string().min(2),
  latitude: z.number(),
  longitude: z.number(),
  budget_amount: z.number().nonnegative()
});