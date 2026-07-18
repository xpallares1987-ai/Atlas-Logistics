import { Type, Schema } from '@google/genai';
import { z } from 'zod';

// Zod Schema for validation after Gemini parsing
export const invoiceDataSchema = z.object({
  invoiceNumber: z.string(),
  supplierName: z.string(),
  issueDate: z.string().optional(),
  currency: z.string().length(3).default('USD'),
  totalAmount: z.number(),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number().default(1),
    unitPrice: z.number(),
    total: z.number()
  })).optional()
});

export type ParsedInvoiceData = z.infer<typeof invoiceDataSchema>;

// Gemini Structured Output Schema
export const geminiInvoiceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    invoiceNumber: { type: Type.STRING, description: "The invoice or reference number" },
    supplierName: { type: Type.STRING, description: "The name of the company issuing the invoice" },
    issueDate: { type: Type.STRING, description: "Date of issue (YYYY-MM-DD)" },
    currency: { type: Type.STRING, description: "3-letter currency code (e.g., USD, EUR)" },
    totalAmount: { type: Type.NUMBER, description: "The total amount due" },
    lineItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unitPrice: { type: Type.NUMBER },
          total: { type: Type.NUMBER }
        }
      }
    }
  },
  required: ["invoiceNumber", "supplierName", "totalAmount", "currency"]
};
