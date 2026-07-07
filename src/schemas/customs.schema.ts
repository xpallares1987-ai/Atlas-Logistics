import { z } from "zod";

export const customsStatusSchema = z.enum([
  "Pending",
  "Submitted",
  "UnderReview",
  "Cleared",
  "Rejected",
]);

export const hsCodeSchema = z.object({
  id: z.number().int().positive(),
  code: z.string().max(20),
  description: z.string().max(255),
  duty_rate: z.number(),
});

export const createHsCodeSchema = hsCodeSchema.omit({
  id: true,
});

export const customsDeclarationItemSchema = z.object({
  id: z.number().int().positive(),
  declaration_id: z.number().int().positive(),
  hs_code_id: z.number().int().positive(),
  commercial_description: z.string().max(255),
  declared_value: z.number(),
  currency: z.string().max(3),
  weight_kg: z.number(),
});

export const createCustomsDeclarationItemSchema =
  customsDeclarationItemSchema.omit({
    id: true,
    declaration_id: true,
  });

export const customsDeclarationSchema = z.object({
  id: z.number().int().positive(),
  shipment_id: z.number().int().positive(),
  broker_name: z.string().max(100).nullable().optional(),
  status: customsStatusSchema,
  submission_date: z.string().datetime().nullable().optional(),
  clearance_date: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  items: z.array(customsDeclarationItemSchema).optional(),
});

export const createCustomsDeclarationSchema = customsDeclarationSchema
  .omit({
    id: true,
    status: true,
    submission_date: true,
    clearance_date: true,
    created_at: true,
    updated_at: true,
    items: true,
  })
  .extend({
    items: z.array(createCustomsDeclarationItemSchema).optional(),
  });

export const updateCustomsStatusSchema = z.object({
  status: customsStatusSchema,
  submission_date: z.string().datetime().optional(),
  clearance_date: z.string().datetime().optional(),
});
