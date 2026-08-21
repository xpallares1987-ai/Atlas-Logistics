import { z } from "zod";

export const ShipmentIdParamsSchema = z.object({
  id: z.string().regex(/^s-\d+$/),
});
