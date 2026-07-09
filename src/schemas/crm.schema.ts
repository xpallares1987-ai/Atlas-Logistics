import { z } from "zod";

export const customerStatusSchema = z.enum(["Active", "Inactive"]);

export const customerSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().max(255),
  industry: z.string().max(100).nullable().optional(),
  tax_id: z.string().max(100).nullable().optional(),
  type: z.string().max(50).nullable().optional(),
  street: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state_prov: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  postal_code: z.string().max(50).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().max(255).nullable().optional(),
  contact_person: z.string().max(255).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  status: customerStatusSchema,
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const createCustomerSchema = customerSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export const updateCustomerSchema = createCustomerSchema.partial();

export const contactSchema = z.object({
  id: z.number().int().positive(),
  customer_id: z.number().int().positive(),
  first_name: z.string().max(100),
  last_name: z.string().max(100),
  email: z.string().email().max(255),
  phone: z.string().max(50).nullable().optional(),
  is_primary: z.boolean(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const createContactSchema = contactSchema.omit({
  id: true,
  customer_id: true,
  created_at: true,
  updated_at: true,
});

export const rateAgreementSchema = z.object({
  id: z.number().int().positive(),
  customer_id: z.number().int().positive(),
  name: z.string().max(255),
  valid_from: z.string(), // YYYY-MM-DD
  valid_to: z.string(), // YYYY-MM-DD
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const createRateAgreementSchema = rateAgreementSchema
  .omit({ id: true, customer_id: true, created_at: true, updated_at: true })
  .extend({
    freight_rate_ids: z.array(z.number().int().positive()).optional(),
  });
