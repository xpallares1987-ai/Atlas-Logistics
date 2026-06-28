import { z } from 'zod';

export const shipmentStatusSchema = z.enum(['Booked', 'Received', 'OnBoard', 'Discharged', 'Delivered']);
export const shipmentModeSchema = z.enum(['Ocean FCL', 'Ocean LCL', 'Air', 'Road']);

export const shipmentSchema = z.object({
  id: z.number().int().positive(),
  customer_id: z.number().int().positive().nullable().optional(),
  booking_reference: z.string().max(100).nullable().optional(),
  tracking_number: z.string().max(100),
  carrier_id: z.number().int().positive(),
  mode: shipmentModeSchema,
  origin_port: z.string().max(10),
  destination_port: z.string().max(10),
  status: shipmentStatusSchema,
  estimated_departure: z.string().datetime().nullable().optional(),
  estimated_arrival: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const createShipmentSchema = shipmentSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
}).partial({
  mode: true,
  origin_port: true,
  destination_port: true,
  status: true,
});

export const updateShipmentSchema = createShipmentSchema.partial();

export const shipmentEventSchema = z.object({
  id: z.number().int().positive(),
  shipment_id: z.number().int().positive(),
  status: shipmentStatusSchema,
  location: z.string().max(255).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  event_time: z.string().datetime(),
  created_at: z.string().datetime().optional(),
});

export const createShipmentEventSchema = shipmentEventSchema.omit({ 
  id: true, 
  shipment_id: true, 
  created_at: true 
});
