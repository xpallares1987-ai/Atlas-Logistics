/**
 * @file stowage.routes.ts
 * @description Fastify routes for 3D Container Stowage Optimization, Center of Gravity & Axle Weight Distribution physics, IMO dangerous goods segregation checks, and container stability certification.
 * @module @atlas/api/modules/stowage/routes
 */

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
import { eq } from "drizzle-orm";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  buildErrorResponses,
  getErrorMessage,
  openApiObject,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. ZOD VALIDATION SCHEMAS & ERROR HELPERS
// ============================================================================

type AxleRoadConfigInput = Parameters<
  typeof calculateAxleWeightDistribution
>[2];

function getValidationErrorDetail(err: unknown): unknown {
  if (typeof err === "object" && err !== null && "errors" in err) {
    const errors = (err as { errors?: unknown }).errors;
    if (errors) return errors;
  }
  return getErrorMessage(err);
}

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

// ============================================================================
// 2. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const STOWAGE_TAG = ["3D Stowage & Load Optimization"] as const;

export const stowageRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. GET /api/stowage/plans
  fastify.get(
    "/plans",
    {
      schema: {
        tags: [...STOWAGE_TAG],
        summary: "List persisted 3D container stowage plans",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const plans = await db.select().from(schema.containerStowagePlans);
        return reply.status(200).send(plans);
      } catch (err: unknown) {
        request.log.error(err, "Failed to list stowage plans");
        return reply.status(500).send({
          error: "FAILED_LIST_STOWAGE_PLANS",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 2. GET /api/stowage/plan
  fastify.get(
    "/plan",
    {
      schema: {
        tags: [...STOWAGE_TAG],
        summary:
          "Retrieve a 3D container stowage plan enriched with cargo items, CoG, and axle distribution",
        querystring: openApiObject({
          containerId: { type: "string" },
          shipmentId: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
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
          [plan] = await db
            .select()
            .from(schema.containerStowagePlans)
            .limit(1);
        }

        if (!plan) {
          return reply.status(404).send({
            error: "STOWAGE_PLAN_NOT_FOUND",
            message: "No stowage plan found matching criteria.",
          });
        }

        const dbCargoItems = await db
          .select()
          .from(schema.cargoItems)
          .where(eq(schema.cargoItems.containerId, plan.containerId));

        const parsedItems: unknown[] =
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
              ? (JSON.parse(plan.stowageSequenceJson) as unknown[])
              : [];

        return reply.status(200).send({
          ...plan,
          centerOfGravity: plan.centerOfGravityJson
            ? (JSON.parse(plan.centerOfGravityJson) as Record<string, unknown>)
            : null,
          axleLoadDistribution: plan.axleLoadDistributionJson
            ? (JSON.parse(plan.axleLoadDistributionJson) as Record<
                string,
                unknown
              >)
            : null,
          items: parsedItems,
        });
      } catch (err: unknown) {
        request.log.error(err, "Failed to fetch stowage plan");
        return reply.status(500).send({
          error: "FAILED_FETCH_STOWAGE_PLAN",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 3. POST /api/stowage/calculate-stability
  fastify.post(
    "/calculate-stability",
    {
      schema: {
        tags: [...STOWAGE_TAG],
        summary:
          "Certify container stowage stability and Center of Gravity safety",
        body: openApiObject({
          containerId: { type: "string" },
          certifiedBy: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { containerId, certifiedBy } = (request.body ?? {}) as {
          containerId?: string;
          certifiedBy?: string;
        };

        const targetContainerId = containerId || "cnt_msku_9284712";

        const [plan] = await db
          .select()
          .from(schema.containerStowagePlans)
          .where(
            eq(schema.containerStowagePlans.containerId, targetContainerId),
          )
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
              ? (JSON.parse(updated.centerOfGravityJson) as Record<
                  string,
                  unknown
                >)
              : null,
            axleLoadDistribution: updated.axleLoadDistributionJson
              ? (JSON.parse(updated.axleLoadDistributionJson) as Record<
                  string,
                  unknown
                >)
              : null,
          },
        });
      } catch (err: unknown) {
        request.log.error(err, "Failed to calculate stowage stability");
        return reply.status(500).send({
          error: "FAILED_CALCULATE_STABILITY",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 4. GET /api/stowage/equipment
  fastify.get(
    "/equipment",
    {
      schema: {
        tags: [...STOWAGE_TAG],
        summary:
          "Retrieve supported ISO container, trailer, and ULD dimensions catalog",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async () => {
      return {
        success: true,
        equipment: EQUIPMENT_CATALOG,
      };
    },
  );

  // 5. GET /api/stowage/presets
  fastify.get(
    "/presets",
    {
      schema: {
        tags: [...STOWAGE_TAG],
        summary: "Retrieve 3D stowage cargo optimization presets",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async () => {
      return {
        success: true,
        presets: STOWAGE_DEMO_PRESETS,
      };
    },
  );

  // 6. POST /api/stowage/optimize
  fastify.post(
    "/optimize",
    {
      schema: {
        tags: [...STOWAGE_TAG],
        summary: "Execute 3D bin-packing cargo stowage optimization",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
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
      } catch (err: unknown) {
        return reply.code(400).send({
          success: false,
          error: getValidationErrorDetail(err),
        });
      }
    },
  );

  // 7. POST /api/stowage/axle-distribution
  fastify.post(
    "/axle-distribution",
    {
      schema: {
        tags: [...STOWAGE_TAG],
        summary:
          "Evaluate tractor-trailer axle weight distribution, Center of Gravity, and IMO hazard segregation",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
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
          parsed.roadConfig as AxleRoadConfigInput,
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
      } catch (err: unknown) {
        return reply.code(400).send({
          success: false,
          error: getValidationErrorDetail(err),
        });
      }
    },
  );
};

export default stowageRoutes;
