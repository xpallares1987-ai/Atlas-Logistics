/**
 * @file rail.routes.ts
 * @description Fastify routes for Intermodal Rail Freight operations, UIC braking/axle-load physics, CIM consignment notes, train consists, and TAF-TSI XML messaging.
 * @module @atlas/api/modules/rail/routes
 */

import { FastifyPluginAsync } from "fastify";
import { db } from "../../db/index.js";
import {
  railCorridors,
  railTerminals,
  railWagons,
  railConsignments,
  railTrainConsists,
  railTrainWagonAllocations,
} from "../../db/schema/index.js";
import { eq, desc } from "drizzle-orm";
import {
  RailPhysicsService,
  TrainConsistBrakingInput,
  UicLineCategory,
} from "./rail-physics.service.js";
import { TafTsiXmlService } from "./taf-tsi-xml.service.js";
import { PDFService } from "../../services/pdf.service.js";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  getErrorMessage,
  openApiObject,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const RAIL_TAG = ["Intermodal Rail Freight"] as const;

export const railRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication hook (parent app.ts authMiddleware already enforces authentication)
  fastify.addHook("onRequest", async (req) => {
    try {
      if (req.headers.authorization) {
        await req.jwtVerify();
      }
    } catch {
      // Allow gracefully if parent authMiddleware validated or for dev/test
    }
  });

  // 1. GET /api/rail/corridors
  fastify.get(
    "/corridors",
    {
      schema: {
        tags: [...RAIL_TAG],
        summary: "List European and Eurasian intermodal rail freight corridors",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const corridors = await db.select().from(railCorridors);
        return reply.send(corridors);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 2. GET /api/rail/terminals
  fastify.get(
    "/terminals",
    {
      schema: {
        tags: [...RAIL_TAG],
        summary:
          "List intermodal railway freight terminals and gauge facilities",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const terminals = await db.select().from(railTerminals);
        return reply.send(terminals);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 3. GET /api/rail/wagons
  fastify.get(
    "/wagons",
    {
      schema: {
        tags: [...RAIL_TAG],
        summary: "List registered rail freight wagons and UIC technical specs",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const wagons = await db.select().from(railWagons);
        return reply.send(wagons);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 4. GET /api/rail/consignments
  fastify.get(
    "/consignments",
    {
      schema: {
        tags: [...RAIL_TAG],
        summary:
          "List CIM rail freight consignments with status, corridor, and text filtering",
        querystring: openApiObject({
          status: { type: "string" },
          corridorId: { type: "string" },
          q: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const { status, corridorId, q } = req.query as {
        status?: string;
        corridorId?: string;
        q?: string;
      };

      try {
        const list = await db
          .select()
          .from(railConsignments)
          .orderBy(desc(railConsignments.createdAt));

        let filtered = list;
        if (status && status !== "ALL") {
          filtered = filtered.filter((c) => c.status === status);
        }
        if (corridorId && corridorId !== "ALL") {
          filtered = filtered.filter((c) => c.corridorId === corridorId);
        }
        if (q) {
          const query = q.toLowerCase();
          filtered = filtered.filter(
            (c) =>
              c.cimNumber.toLowerCase().includes(query) ||
              c.senderName.toLowerCase().includes(query) ||
              c.consigneeName.toLowerCase().includes(query) ||
              c.railwayUndertakingRu.toLowerCase().includes(query),
          );
        }

        return reply.send(filtered);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 5. GET /api/rail/consignments/:id
  fastify.get(
    "/consignments/:id",
    {
      schema: {
        tags: [...RAIL_TAG],
        summary: "Retrieve a CIM rail consignment with its wagon allocations",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      try {
        const consignment = await db
          .select()
          .from(railConsignments)
          .where(eq(railConsignments.id, id))
          .get();

        if (!consignment) {
          return reply
            .status(404)
            .send({ error: "CIM Rail Consignment not found" });
        }

        const allocations = await db
          .select()
          .from(railTrainWagonAllocations)
          .where(eq(railTrainWagonAllocations.consignmentId, id));

        return reply.send({
          ...consignment,
          allocations,
        });
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 6. GET /api/rail/trains
  fastify.get(
    "/trains",
    {
      schema: {
        tags: [...RAIL_TAG],
        summary: "List block train consists ordered by creation date",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      try {
        const trains = await db
          .select()
          .from(railTrainConsists)
          .orderBy(desc(railTrainConsists.createdAt));
        return reply.send(trains);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 7. GET /api/rail/trains/:id
  fastify.get(
    "/trains/:id",
    {
      schema: {
        tags: [...RAIL_TAG],
        summary: "Retrieve train consist detail with ordered wagon allocations",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      try {
        const train = await db
          .select()
          .from(railTrainConsists)
          .where(eq(railTrainConsists.id, id))
          .get();

        if (!train) {
          return reply.status(404).send({ error: "Train consist not found" });
        }

        const allocations = await db
          .select()
          .from(railTrainWagonAllocations)
          .where(eq(railTrainWagonAllocations.trainConsistId, id));

        return reply.send({
          ...train,
          allocations,
        });
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 8. POST /api/rail/calculate-physics
  fastify.post(
    "/calculate-physics",
    {
      schema: {
        tags: [...RAIL_TAG],
        summary: "Calculate UIC train consist braking percentage and mass",
        body: openApiObject({
          wagons: { type: "array", items: OPENAPI_FLEXIBLE_OBJECT_SCHEMA },
          locomotiveMassTonnes: { type: "number" },
          locomotiveBrakedWeightTonnes: { type: "number" },
          requiredBrakingPercentage: { type: "number" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const input = req.body as TrainConsistBrakingInput;

      if (!input || !Array.isArray(input.wagons)) {
        return reply.status(400).send({ error: "wagons array is required" });
      }

      const result = RailPhysicsService.calculateTrainConsistBraking(input);
      return reply.send({
        success: true,
        result,
      });
    },
  );

  // 9. POST /api/rail/calculate-axle-load
  fastify.post(
    "/calculate-axle-load",
    {
      schema: {
        tags: [...RAIL_TAG],
        summary:
          "Calculate UIC wagon axle load and track line category compliance",
        body: openApiObject({
          wagonTareTonnes: { type: "number" },
          payloadTonnes: { type: "number" },
          numberOfAxles: { type: "number" },
          lineCategory: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (req, reply) => {
      const { wagonTareTonnes, payloadTonnes, numberOfAxles, lineCategory } =
        req.body as {
          wagonTareTonnes: number;
          payloadTonnes: number;
          numberOfAxles?: number;
          lineCategory?: UicLineCategory;
        };

      if (wagonTareTonnes === undefined || payloadTonnes === undefined) {
        return reply
          .status(400)
          .send({ error: "wagonTareTonnes and payloadTonnes are required" });
      }

      const result = RailPhysicsService.calculateAxleLoad(
        wagonTareTonnes,
        payloadTonnes,
        numberOfAxles || 4,
        lineCategory || "D",
      );

      return reply.send({
        success: true,
        result,
      });
    },
  );

  // 10. POST /api/rail/consignments/:id/status
  fastify.post(
    "/consignments/:id/status",
    {
      schema: {
        tags: [...RAIL_TAG],
        summary: "Transition CIM rail consignment operational status",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          status: {
            type: "string",
            enum: [
              "PLANNED",
              "TRAIN_FORMED",
              "IN_TRANSIT",
              "GAUGE_TRANSFERRED",
              "DELIVERED",
            ],
          },
          remarks: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { status, remarks } = req.body as {
        status:
          | "PLANNED"
          | "TRAIN_FORMED"
          | "IN_TRANSIT"
          | "GAUGE_TRANSFERRED"
          | "DELIVERED";
        remarks?: string;
      };

      if (!status) {
        return reply.status(400).send({ error: "status is required" });
      }

      try {
        const consignment = await db
          .select()
          .from(railConsignments)
          .where(eq(railConsignments.id, id))
          .get();

        if (!consignment) {
          return reply.status(404).send({ error: "Consignment not found" });
        }

        await db
          .update(railConsignments)
          .set({
            status,
            remarks: remarks || consignment.remarks,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(railConsignments.id, id));

        return reply.send({
          success: true,
          message: `Consignment ${consignment.cimNumber} updated to ${status}`,
        });
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "Database error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 11. GET /api/rail/consignments/:id/cim-pdf
  fastify.get(
    "/consignments/:id/cim-pdf",
    {
      schema: {
        tags: [...RAIL_TAG],
        summary: "Generate and stream official CIM Rail Consignment Note PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      try {
        const consignment = await db
          .select()
          .from(railConsignments)
          .where(eq(railConsignments.id, id))
          .get();

        if (!consignment) {
          return reply.status(404).send({ error: "Consignment not found" });
        }

        const allocations = await db
          .select()
          .from(railTrainWagonAllocations)
          .where(eq(railTrainWagonAllocations.consignmentId, id));

        const pdfBuffer = await PDFService.generateCimConsignmentNote(
          consignment,
          allocations,
        );

        return reply
          .header("Content-Type", "application/pdf")
          .header(
            "Content-Disposition",
            `inline; filename="CIM_${consignment.cimNumber}.pdf"`,
          )
          .send(pdfBuffer);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "PDF Generation Error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 12. GET /api/rail/trains/:id/braking-sheet-pdf
  fastify.get(
    "/trains/:id/braking-sheet-pdf",
    {
      schema: {
        tags: [...RAIL_TAG],
        summary: "Generate and stream UIC Train Braking Sheet PDF",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      try {
        const train = await db
          .select()
          .from(railTrainConsists)
          .where(eq(railTrainConsists.id, id))
          .get();

        if (!train) {
          return reply.status(404).send({ error: "Train not found" });
        }

        const allocations = await db
          .select()
          .from(railTrainWagonAllocations)
          .where(eq(railTrainWagonAllocations.trainConsistId, id));

        const pdfBuffer = await PDFService.generateTrainBrakingSheet(
          train,
          allocations,
        );

        return reply
          .header("Content-Type", "application/pdf")
          .header(
            "Content-Disposition",
            `inline; filename="Brake_Sheet_${train.trainRunNumber}.pdf"`,
          )
          .send(pdfBuffer);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "PDF Generation Error",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 13. GET /api/rail/trains/:id/taf-tsi-xml
  fastify.get(
    "/trains/:id/taf-tsi-xml",
    {
      schema: {
        tags: [...RAIL_TAG],
        summary: "Export ERA TAF-TSI Train Composition Message XML",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          ...buildErrorResponses([401, 403, 404, 500]),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      try {
        const train = await db
          .select()
          .from(railTrainConsists)
          .where(eq(railTrainConsists.id, id))
          .get();

        if (!train) {
          return reply.status(404).send({ error: "Train not found" });
        }

        const allocations = await db
          .select()
          .from(railTrainWagonAllocations)
          .where(eq(railTrainWagonAllocations.trainConsistId, id));

        const xmlString = TafTsiXmlService.generateTrainCompositionMessage(
          train,
          allocations,
        );

        return reply
          .header("Content-Type", "application/xml")
          .header(
            "Content-Disposition",
            `attachment; filename="TAF_TSI_${train.trainRunNumber}.xml"`,
          )
          .send(xmlString);
      } catch (err: unknown) {
        req.log.error(err);
        return reply.status(500).send({
          error: "XML Generation Error",
          message: getErrorMessage(err),
        });
      }
    },
  );
};
