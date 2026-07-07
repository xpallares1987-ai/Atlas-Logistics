import { z } from "zod";

export const invoiceStatusSchema = z.enum([
  "Draft",
  "Issued",
  "Paid",
  "Overdue",
  "Cancelled",
]);
export const invoiceTypeSchema = z.enum(["AR", "AP"]);

export const invoiceItemSchema = z.object({
  id: z.number().int().positive(),
  invoice_id: z.number().int().positive(),
  description: z.string().max(255),
  quantity: z.number().int().positive(),
  unit_price: z.number(),
  total_price: z.number(),
});

export const createInvoiceItemSchema = invoiceItemSchema.omit({
  id: true,
  invoice_id: true,
  total_price: true,
});

export const invoiceSchema = z.object({
  id: z.number().int().positive(),
  shipment_id: z.number().int().positive(),
  customer_id: z.number().int().positive().nullable().optional(),
  carrier_id: z.number().int().positive().nullable().optional(),
  type: invoiceTypeSchema,
  invoice_number: z.string().max(100),
  status: invoiceStatusSchema,
  due_date: z.string(), // YYYY-MM-DD
  total_amount: z.number(),
  currency: z.string().max(3),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  items: z.array(invoiceItemSchema).optional(),
});

export const createInvoiceSchema = invoiceSchema
  .omit({
    id: true,
    status: true,
    total_amount: true,
    created_at: true,
    updated_at: true,
    items: true,
  })
  .extend({
    items: z.array(createInvoiceItemSchema).optional(),
  });

export const updateInvoiceSchema = z.object({
  status: invoiceStatusSchema,
});
