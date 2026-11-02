import { z } from "zod";

// ============================================================================
// API VALIDATION SCHEMAS (SCM CORE END-TO-END)
// ============================================================================

export const CreateShipmentSchema = z.object({
  body: z
    .object({
      referenceNumber: z
        .string()
        .regex(/^[A-Z0-9-]+$/, "Invalid reference format")
        .max(100),
      status: z
        .enum([
          "DRAFT",
          "CONFIRMED",
          "DOCUMENTATION",
          "ON_BOARD",
          "BOOKED",
          "IN_TRANSIT",
          "ARRIVED",
          "CUSTOMS_CLEARED",
          "DELIVERED",
          "CANCELLED",
        ])
        .optional(),
      supplierId: z.string().uuid().optional(),
      billingPartyId: z.string().uuid().optional(),
      originLocationId: z.string().uuid().optional(),
      destinationLocationId: z.string().uuid().optional(),
      vessel: z.string().max(255).optional(),
      voyage: z.string().max(100).optional(),
      documentBase64: z.string().max(10485760).optional(), // Max 10MB approx
      documentName: z.string().max(255).optional(),
      documentMimeType: z.string().max(100).optional(),
    })
    .strict(),
});

export const UpdateShipmentSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid Shipment ID format"),
  }),
  body: z
    .object({
      status: z
        .enum([
          "DRAFT",
          "CONFIRMED",
          "DOCUMENTATION",
          "ON_BOARD",
          "BOOKED",
          "IN_TRANSIT",
          "ARRIVED",
          "CUSTOMS_CLEARED",
          "DELIVERED",
          "CANCELLED",
        ])
        .optional(),
      vessel: z.string().max(255).optional(),
      voyage: z.string().max(100).optional(),
    })
    .strict(),
});

export const CreateQuoteSchema = z.object({
  body: z
    .object({
      quoteNumber: z
        .string()
        .regex(/^[A-Z0-9-]+$/)
        .max(100),
      customerId: z.string().uuid().optional(),
      customer: z.string().optional(),
      origin: z.string().optional(),
      destination: z.string().optional(),
      carrier: z.string().optional(),
      originLocationId: z.string().uuid().optional(),
      destinationLocationId: z.string().uuid().optional(),
      equipment: z.string().max(100),
      buyRateTotal: z.number().nonnegative(),
      sellMargin: z.number(),
      sellRateTotal: z.number().nonnegative(),
      status: z
        .enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"])
        .optional(),
      validTo: z.string().or(z.date()),
    })
    .passthrough(),
});

export const CreateInvoiceSchema = z.object({
  body: z
    .object({
      invoiceNumber: z
        .string()
        .regex(/^[A-Z0-9-]+$/)
        .max(100),
      type: z.enum(["AR", "AP", "CN", "DN"]),
      partyId: z.string().uuid(),
      shipmentId: z.string().uuid().optional(),
      currency: z
        .string()
        .length(3)
        .regex(/^[A-Z]{3}$/)
        .default("USD"),
      subtotal: z.number().nonnegative().optional(),
      taxAmount: z.number().nonnegative().optional(),
      totalAmount: z.number().nonnegative(),
      dueDate: z.string().or(z.date()),
      lines: z
        .array(
          z.object({
            description: z.string().max(255),
            quantity: z.number().min(1).default(1),
            unitPrice: z.number().nonnegative(),
            amount: z.number().nonnegative(),
            taxRate: z.number().nonnegative().optional(),
          }),
        )
        .optional(),
    })
    .strict(),
});

export const BatchSyncJobSchema = z.object({
  body: z
    .object({
      jobs: z
        .array(
          z.object({
            id: z.string(),
            entity: z.enum([
              "shipments",
              "invoices",
              "warehouseTraffic",
              "warehouseInventory",
            ]),
            action: z.enum(["CREATE", "UPDATE", "DELETE"]),
            payload: z.any(),
          }),
        )
        .min(1, "At least one job is required"),
    })
    .strict(),
});
