import { z } from "zod";

// Helper to preprocess xml2js values that could be empty objects/arrays
const xmlString = z.preprocess((val) => {
  if (val === null || val === undefined) {
    return undefined;
  }
  if (typeof val === "object") {
    // Empty object `{}` or with attributes parsed by xml2js
    return undefined;
  }
  return String(val);
}, z.string().optional());

export const BoardingItemSchema = z.object({
  Origin: xmlString,
  CustomerOrder: xmlString,
  Warehouse: xmlString,
  POL: xmlString,
  FinalDestination: xmlString,
  BoardingDate: xmlString,
  DeliveryDate: xmlString,
  ForecastArrivalDate: xmlString,
  ReelsCount: xmlString,
  Weight: xmlString,
  ExtAddrNumber: xmlString,
});

export const ReceptionItemSchema = z.object({
  Origin: xmlString,
  Warehouse: xmlString,
  Status: xmlString,
  LoadCode: xmlString,
  PlateNumber: xmlString,
  ForecastArrivalDate: xmlString,
  ExtAddrNumber: xmlString,
  FinalDestination: xmlString,
  CustomerOrder: xmlString,
  ItemNumber: xmlString,
  ReelYear: xmlString,
  PaperCode: xmlString,
  ProductDescription: xmlString,
  Grammage: xmlString,
  Diameter: xmlString,
  RollWidth: xmlString,
  RollLength: xmlString,
  Weight: xmlString,
});

export const StockItemSchema = z.object({
  Origin: xmlString,
  WarehouseID: xmlString,
  CustomerCode: xmlString,
  ProductCode: xmlString,
  ID: xmlString,
  ProductDescription: xmlString,
  BasisWeight: xmlString,
  Diameter: xmlString,
  RollWidth: xmlString,
  Weight: xmlString,
  LoadCode: xmlString,
  CustomerName: xmlString,
});

export const ReceptionContentSchema = z.object({
  LoadCode: z.preprocess((val) => {
    if (val === null || val === undefined || typeof val === "object") {
      return "";
    }
    return String(val);
  }, z.string()),
  Reels: z
    .object({
      ReelItem: z.union([z.array(z.unknown()), z.unknown()]).optional(),
    })
    .optional(),
});

export const WarehouseInfoSchema = z.object({
  Warehouse: z
    .array(
      z.object({
        Code: z.preprocess(
          (val) =>
            val === null || val === undefined || typeof val === "object"
              ? ""
              : String(val),
          z.string(),
        ),
        Name: z.preprocess(
          (val) =>
            val === null || val === undefined || typeof val === "object"
              ? ""
              : String(val),
          z.string(),
        ),
      }),
    )
    .optional(),
});

export const ExternalWarehousesSchema = z.object({
  ExternalWarehouses: z.object({
    Shipments: z
      .object({
        BoardingItem: z
          .union([z.array(BoardingItemSchema), BoardingItemSchema])
          .optional(),
      })
      .optional(),
    Receptions: z
      .object({
        ReceptionItem: z
          .union([z.array(ReceptionItemSchema), ReceptionItemSchema])
          .optional(),
      })
      .optional(),
    Stock: z
      .object({
        StockItem: z
          .union([z.array(StockItemSchema), StockItemSchema])
          .optional(),
      })
      .optional(),
    ReceptionsContent: ReceptionContentSchema.optional(),
    WarehouseInfo: WarehouseInfoSchema.optional(),
  }),
});

export type BoardingItem = z.infer<typeof BoardingItemSchema>;
export type ReceptionItem = z.infer<typeof ReceptionItemSchema>;
export type StockItem = z.infer<typeof StockItemSchema>;

// ============================================================================
// API VALIDATION SCHEMAS (END-TO-END)
// ============================================================================

export const CreateShipmentSchema = z.object({
  body: z
    .object({
      referenceNumber: z.string().min(1, "Reference Number is required"),
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
      vessel: z.string().optional(),
      voyage: z.string().optional(),
      documentBase64: z.string().optional(),
      documentName: z.string().optional(),
      documentMimeType: z.string().optional(),
    })
    .passthrough(),
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
      vessel: z.string().optional(),
      voyage: z.string().optional(),
    })
    .passthrough(),
});

export const CreateQuoteSchema = z.object({
  body: z
    .object({
      quoteNumber: z.string().min(1),
      customerId: z.string().uuid(),
      originLocationId: z.string().uuid().optional(),
      destinationLocationId: z.string().uuid().optional(),
      equipment: z.string().min(1),
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
      invoiceNumber: z.string().min(1),
      type: z.enum(["AR", "AP", "CN", "DN"]),
      partyId: z.string().uuid(),
      shipmentId: z.string().uuid().optional(),
      currency: z.string().length(3).default("USD"),
      subtotal: z.number().nonnegative().optional(),
      taxAmount: z.number().nonnegative().optional(),
      totalAmount: z.number().nonnegative(),
      dueDate: z.string().or(z.date()),
      lines: z
        .array(
          z.object({
            description: z.string().min(1),
            quantity: z.number().min(1).default(1),
            unitPrice: z.number().nonnegative(),
            amount: z.number().nonnegative(),
            taxRate: z.number().nonnegative().optional(),
          }),
        )
        .optional(),
    })
    .passthrough(),
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
    .passthrough(),
});
