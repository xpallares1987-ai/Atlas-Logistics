import { z } from "zod";

export const DataRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  date: z.string().datetime(),
});

export const DataSchema = z.array(DataRowSchema);
