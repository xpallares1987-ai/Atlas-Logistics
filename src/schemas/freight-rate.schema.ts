import { z } from 'zod';

export const createFreightRateSchema = z.object({
  carrierId: z.number().int().positive(),
  originPort: z.string().min(2).max(100),
  destinationPort: z.string().min(2).max(100),
  currency: z.string().length(3),
  baseRate: z.number().positive(),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime()
});

export type CreateFreightRateDto = z.infer<typeof createFreightRateSchema>;