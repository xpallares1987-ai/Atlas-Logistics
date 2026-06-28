import { z } from 'zod';

export const quoteStatusSchema = z.enum(['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired']);

export const quoteOptionSchema = z.object({
  id: z.number().int().positive(),
  quote_id: z.number().int().positive(),
  freight_rate_id: z.number().int().positive(),
  margin_percentage: z.number().nullable().optional(),
  total_price: z.number(),
});

export const createQuoteOptionSchema = quoteOptionSchema.omit({
  id: true,
  quote_id: true
});

export const quoteSchema = z.object({
  id: z.number().int().positive(),
  customer_id: z.number().int().positive(),
  origin_port: z.string().max(100),
  destination_port: z.string().max(100),
  valid_until: z.string(), // YYYY-MM-DD
  status: quoteStatusSchema,
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  options: z.array(quoteOptionSchema).optional()
});

export const createQuoteSchema = quoteSchema.omit({
  id: true,
  status: true,
  created_at: true,
  updated_at: true,
  options: true
}).extend({
  options: z.array(createQuoteOptionSchema).optional()
});

export const updateQuoteSchema = z.object({
  status: quoteStatusSchema,
  valid_until: z.string().optional()
});
