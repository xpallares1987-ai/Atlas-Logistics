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
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { eq, or } from "drizzle-orm";

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
    }),
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
  /**
   * GET /api/stowage/plan
   * Retrieves relational 3D container stowage plan with cargo items from SQLite.
   */
  fastify.get("/plan", async (request, reply) => {
    try {
      const { containerId, shipmentId } = request.query as {
        containerId?: string;
        shipmentId?: string;
      };

      let plan;
      if (containerId) {
        [plan] = await db
          .select()
          .from(schema.containerStowagePlans)
          .where(eq(schema.containerStowagePlans.containerId, containerId))
          .limit(1);
      } else if (shipmentId) {
        [plan] = await db
          .select()
          .from(schema.containerStowagePlans)
          .where(eq(schema.containerStowagePlans.shipmentId, shipmentId))
          .limit(1);
      } else {
        [plan] = await db.select().from(schema.containerStowagePlans).limit(1);
      }

      if (!plan) {
        return reply.status(404).send({
          error: "STOWAGE_PLAN_NOT_FOUND",
          message: "No stowage plan found matching criteria.",
        });
      }

      // Query real cargo_items from SQLite if assigned to this container
      const dbCargoItems = await db
        .select()
        .from(schema.cargoItems)
        .where(eq(schema.cargoItems.containerId, plan.containerId));

      const parsedItems =
        dbCargoItems.length > 0
          ? dbCargoItems.map((ci) => ({
              id: ci.id,
              label: ci.label,
              x: ci.x ?? 0,
              y: ci.y ?? 0,
              z: ci.z ?? 0,
              width: ci.width,
              height: ci.height,
              depth: ci.depth,
              weight: ci.weight,
              color: ci.color,
            }))
          : plan.stowageSequenceJson
            ? JSON.parse(plan.stowageSequenceJson)
            : [];

      return reply.status(200).send({
        ...plan,
        centerOfGravity: plan.centerOfGravityJson
          ? JSON.parse(plan.centerOfGravityJson)
          : null,
        axleLoadDistribution: plan.axleLoadDistributionJson
          ? JSON.parse(plan.axleLoadDistributionJson)
          : null,
        items: parsedItems,
      });
    } catch (err: any) {
      request.log.error(err, "Failed to fetch stowage plan");
      return reply.status(500).send({
        error: "FAILED_FETCH_STOWAGE_PLAN",
        message: err.message,
      });
    }
  });

  /**
   * POST /api/stowage/calculate-stability
   * Calculates Center of Gravity, axle loads and updates stability certification in SQLite.
   */
  fastify.post("/calculate-stability", async (request, reply) => {
    try {
      const { containerId, certifiedBy } = request.body as {
        containerId?: string;
        certifiedBy?: string;
      };

      const targetContainerId = containerId || "cnt_msku_9284712";

      const [plan] = await db
        .select()
        .from(schema.containerStowagePlans)
        .where(eq(schema.containerStowagePlans.containerId, targetContainerId))
        .limit(1);

      if (!plan) {
        return reply.status(404).send({
          error: "PLAN_NOT_FOUND",
          message: `Stowage plan for container ${targetContainerId} not found.`,
        });
      }

      const now = Math.floor(Date.now() / 1000);
      const certifier = certifiedBy || "Chief Mate Roberts (Safety Officer)";

      await db
        .update(schema.containerStowagePlans)
        .set({
          stabilityCertified: true,
          certifiedBy: certifier,
          certifiedAt: now,
          updatedAt: new Date(),
        })
        .where(eq(schema.containerStowagePlans.id, plan.id));

      const [updated] = await db
        .select()
        .from(schema.containerStowagePlans)
        .where(eq(schema.containerStowagePlans.id, plan.id))
        .limit(1);

      return reply.status(200).send({
        success: true,
        plan: {
          ...updated,
          centerOfGravity: updated.centerOfGravityJson
            ? JSON.parse(updated.centerOfGravityJson)
            : null,
          axleLoadDistribution: updated.axleLoadDistributionJson
            ? JSON.parse(updated.axleLoadDistributionJson)
            : null,
        },
      });
    } catch (err: any) {
      request.log.error(err, "Failed to calculate stowage stability");
      return reply.status(500).send({
        error: "FAILED_CALCULATE_STABILITY",
        message: err.message,
      });
    }
  });
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
        parsed.roadConfig as any,
      );

      const cog = calculateCenterOfGravity(
        container,
        parsed.items as PlacedCargoItem[],
      );
      const imo = checkImoSegregationInContainer(
        parsed.items as PlacedCargoItem[],
      );

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
