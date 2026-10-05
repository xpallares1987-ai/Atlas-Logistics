import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  EQUIPMENT_CATALOG,
  STOWAGE_DEMO_PRESETS,
  optimizeStowage3D,
  calculateCenterOfGravity,
  calculateAxleWeightDistribution,
  checkImoSegregationInContainer,
  ContainerTypeKey,
  PlacedCargoItem,
} from "@atlas/shared";

const CargoItemInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  lengthM: z.number().positive(),
  widthM: z.number().positive(),
  heightM: z.number().positive(),
  weightKg: z.number().positive(),
  stackable: z.boolean().default(true),
  maxStackWeightKg: z.number().optional(),
  allowRotation: z.boolean().default(true),
  hazardClass: z.string().optional(),
  color: z.string().optional(),
  unNumber: z.string().optional(),
});

const OptimizeStowageRequestSchema = z.object({
  containerType: z.enum([
    "20ft_dry",
    "40ft_dry",
    "40ft_hc",
    "45ft_hc",
    "53ft_van",
    "megatrailer_136",
    "air_uld_ld3",
  ] as [ContainerTypeKey, ...ContainerTypeKey[]]),
  items: z.array(CargoItemInputSchema),
  options: z
    .object({
      centerPayload: z.boolean().default(true),
    })
    .optional(),
});

const AxleEvaluationRequestSchema = z.object({
  containerType: z.enum([
    "20ft_dry",
    "40ft_dry",
    "40ft_hc",
    "45ft_hc",
    "53ft_van",
    "megatrailer_136",
    "air_uld_ld3",
  ] as [ContainerTypeKey, ...ContainerTypeKey[]]),
  items: z.array(
    CargoItemInputSchema.extend({
      placed: z.boolean().default(true),
      x: z.number(),
      y: z.number(),
      z: z.number(),
      rotated: z.boolean().default(false),
      effectiveWidthM: z.number(),
      effectiveLengthM: z.number(),
      effectiveHeightM: z.number(),
    })
  ),
  roadConfig: z
    .object({
      tractorTareKg: z.number().optional(),
      chassisTareKg: z.number().optional(),
      steerAxleTareKg: z.number().optional(),
      driveAxleTareKg: z.number().optional(),
      trailerBogieTareKg: z.number().optional(),
      steerMaxLegalKg: z.number().optional(),
      driveMaxLegalKg: z.number().optional(),
      trailerTridemMaxLegalKg: z.number().optional(),
      gcvwMaxLegalKg: z.number().optional(),
      kingpinToTridemDistanceM: z.number().optional(),
      tractorWheelbaseM: z.number().optional(),
      fifthWheelOffsetM: z.number().optional(),
    })
    .optional(),
});

export const stowageRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/stowage/equipment
  fastify.get("/equipment", async () => {
    return {
      success: true,
      equipment: EQUIPMENT_CATALOG,
    };
  });

  // GET /api/stowage/presets
  fastify.get("/presets", async () => {
    return {
      success: true,
      presets: STOWAGE_DEMO_PRESETS,
    };
  });

  // POST /api/stowage/optimize
  fastify.post("/optimize", async (request, reply) => {
    try {
      const parsed = OptimizeStowageRequestSchema.parse(request.body);
      const container = EQUIPMENT_CATALOG[parsed.containerType];
      if (!container) {
        return reply.code(400).send({
          success: false,
          error: `Equipo desconocido: ${parsed.containerType}`,
        });
      }

      const result = optimizeStowage3D(container, parsed.items, {
        centerPayload: parsed.options?.centerPayload ?? true,
      });

      return reply.send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.code(400).send({
        success: false,
        error: err.errors ? err.errors : err.message,
      });
    }
  });

  // POST /api/stowage/axle-distribution
  fastify.post("/axle-distribution", async (request, reply) => {
    try {
      const parsed = AxleEvaluationRequestSchema.parse(request.body);
      const container = EQUIPMENT_CATALOG[parsed.containerType];
      if (!container) {
        return reply.code(400).send({
          success: false,
          error: `Equipo desconocido: ${parsed.containerType}`,
        });
      }

      const distribution = calculateAxleWeightDistribution(
        container,
        parsed.items as PlacedCargoItem[],
        parsed.roadConfig as any
      );

      const cog = calculateCenterOfGravity(container, parsed.items as PlacedCargoItem[]);
      const imo = checkImoSegregationInContainer(parsed.items as PlacedCargoItem[]);

      return reply.send({
        success: true,
        data: {
          axleDistribution: distribution,
          centerOfGravity: cog,
          imoSegregation: imo,
        },
      });
    } catch (err: any) {
      return reply.code(400).send({
        success: false,
        error: err.errors ? err.errors : err.message,
      });
    }
  });
};

export default stowageRoutes;
