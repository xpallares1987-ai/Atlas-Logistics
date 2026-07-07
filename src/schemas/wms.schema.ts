import { z } from "zod";

export const movementTypeSchema = z.enum([
  "Receiving",
  "Putaway",
  "Picking",
  "Dispatch",
  "Adjustment",
]);

export const warehouseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().max(255),
  location_address: z.string().max(500),
});

export const stockItemSchema = z.object({
  id: z.number().int().positive(),
  warehouse_id: z.number().int().positive(),
  shipment_id: z.number().int().positive().nullable().optional(),
  sku: z.string().max(100),
  description: z.string().max(255),
  quantity_on_hand: z.number().int(),
  weight_kg: z.number().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const inventoryMovementSchema = z.object({
  id: z.number().int().positive(),
  stock_item_id: z.number().int().positive(),
  movement_type: movementTypeSchema,
  quantity_change: z.number().int(),
  reference_note: z.string().max(500).nullable().optional(),
  created_at: z.string().datetime().optional(),
});

export const receiveStockSchema = z.object({
  warehouse_id: z.number().int().positive(),
  shipment_id: z.number().int().positive().nullable().optional(),
  sku: z.string().max(100),
  description: z.string().max(255),
  quantity: z.number().int().positive(),
  weight_kg: z.number().nullable().optional(),
  reference_note: z.string().max(500).optional(),
});

export const dispatchStockSchema = z.object({
  stock_item_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  reference_note: z.string().max(500).optional(),
});
