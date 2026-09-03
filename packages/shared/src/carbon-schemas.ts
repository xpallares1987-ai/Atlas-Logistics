import { z } from "zod";

export const carbonTransportModes = [
  "OCEAN_CONTAINER",
  "OCEAN_BULK",
  "AIR_FREIGHT",
  "AIR_BELLY",
  "ROAD_DIESEL",
  "ROAD_HVO",
  "ROAD_EV",
  "RAIL_ELECTRIC",
  "RAIL_DIESEL",
] as const;

export const carbonTransportModeSchema = z.enum(carbonTransportModes);

export const carbonLegCalculationSchema = z.object({
  originName: z.string().trim().min(1),
  destinationName: z.string().trim().min(1),
  mode: carbonTransportModeSchema,
  distanceKm: z.number().finite().positive(),
  weightKg: z.number().finite().positive(),
});

export const calculateCarbonSchema = z.object({
  entityType: z.enum(["SHIPMENT", "QUOTE", "SIMULATION"]).optional(),
  entityId: z.string().trim().min(1).optional(),
  referenceCode: z.string().trim().min(1).optional(),
  originCity: z.string().trim().min(1).optional(),
  destinationCity: z.string().trim().min(1).optional(),
  legs: z.array(carbonLegCalculationSchema).min(1),
});

export const compareGreenRouteSchema = z.object({
  legs: z.array(carbonLegCalculationSchema).min(1),
});

export const carbonOffsetSchema = z.object({
  calculationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  beneficiaryName: z.string().trim().min(1).default("Atlas Logistics Customer"),
});

export type CarbonTransportMode = z.infer<typeof carbonTransportModeSchema>;
export type CarbonLegCalculationInput = z.infer<
  typeof carbonLegCalculationSchema
>;
export type CalculateCarbonInput = z.infer<typeof calculateCarbonSchema>;
export type CompareGreenRouteInput = z.infer<typeof compareGreenRouteSchema>;
export type CarbonOffsetInput = z.infer<typeof carbonOffsetSchema>;
