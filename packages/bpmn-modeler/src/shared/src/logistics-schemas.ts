import { z } from 'zod';

// Helper to preprocess xml2js values that could be empty objects/arrays
const xmlString = z.preprocess((val) => {
  if (val === null || val === undefined) {
    return undefined;
  }
  if (typeof val === 'object') {
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
    if (val === null || val === undefined || typeof val === 'object') {
      return '';
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
            val === null || val === undefined || typeof val === 'object' ? '' : String(val),
          z.string()
        ),
        Name: z.preprocess(
          (val) =>
            val === null || val === undefined || typeof val === 'object' ? '' : String(val),
          z.string()
        ),
      })
    )
    .optional(),
});

export const ExternalWarehousesSchema = z.object({
  ExternalWarehouses: z.object({
    Shipments: z
      .object({
        BoardingItem: z.union([z.array(BoardingItemSchema), BoardingItemSchema]).optional(),
      })
      .optional(),
    Receptions: z
      .object({
        ReceptionItem: z.union([z.array(ReceptionItemSchema), ReceptionItemSchema]).optional(),
      })
      .optional(),
    Stock: z
      .object({
        StockItem: z.union([z.array(StockItemSchema), StockItemSchema]).optional(),
      })
      .optional(),
    ReceptionsContent: ReceptionContentSchema.optional(),
    WarehouseInfo: WarehouseInfoSchema.optional(),
  }),
});
