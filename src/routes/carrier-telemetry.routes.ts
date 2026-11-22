/**
 * @file carrier-telemetry.routes.ts
 * @description Fastify REST routes for Multi-Modal Carrier Telemetry Ingestion (DCSA, FSU, AIS).
 * Implements two-tier asynchronous buffering, multi-key entity resolution,
 * live telemetry stream, and interactive operator simulation (ADR 0034).
 * @module @atlas/api/routes/carrier-telemetry
 * @see {@link docs/adr/0034-carrier-track-and-trace-async-ingestion-and-predictive-resolution.md}
 */

import { FastifyPluginAsync } from "fastify";
import {
  CarrierTelemetryIngestionService,
  RawTelemetryIngressInput,
} from "../services/carrier-telemetry-ingestion.service.js";
import {
  buildErrorResponses,
  openApiArray,
  openApiObject,
} from "./openapi.schemas.js";
import { DEFAULT_OPERATOR_ACTOR } from "../scm/kernel/primitives.js";

// ============================================================================
// 1. OPENAPI RESPONSE & REQUEST SCHEMAS
// ============================================================================

const INGRESS_RESPONSE_SCHEMA = openApiObject({
  status: { type: "string" },
  eventId: { type: "string" },
  eventFingerprint: { type: "string" },
  duplicate: { type: "boolean" },
  receivedAt: { type: "string" },
});

const TELEMETRY_FEED_ITEM_PROPERTIES = {
  eventId: { type: "string" },
  eventType: { type: "string" },
  eventDateTime: { type: "string" },
  eventTypeCode: { type: "string" },
  transportMode: { type: "string" },
  sourceType: { type: "string" },
  carrierBookingReference: {
    anyOf: [{ type: "string" }, { type: "null" }],
  },
  transportDocumentReference: {
    anyOf: [{ type: "string" }, { type: "null" }],
  },
  airWaybillNumber: {
    anyOf: [{ type: "string" }, { type: "null" }],
  },
  equipmentReference: {
    anyOf: [{ type: "string" }, { type: "null" }],
  },
  locationLocode: { type: "string" },
  vesselName: {
    anyOf: [{ type: "string" }, { type: "null" }],
  },
  vesselImoNumber: {
    anyOf: [{ type: "string" }, { type: "null" }],
  },
  processedStatus: { type: "string" },
  resolvedPoId: {
    anyOf: [{ type: "string" }, { type: "null" }],
  },
  matchedMilestoneCode: {
    anyOf: [{ type: "string" }, { type: "null" }],
  },
  createdAt: { anyOf: [{ type: "string" }, { type: "number" }] },
};

const TELEMETRY_SIMULATE_RESPONSE_SCHEMA = openApiObject({
  ingress: INGRESS_RESPONSE_SCHEMA,
  processed: {
    anyOf: [
      {
        type: "object",
        additionalProperties: true,
        properties: {
          eventId: { type: "string" },
          canonicalMilestoneCode: { type: "string" },
          macroPhase: { type: "string" },
          milestoneUpdated: { type: "boolean" },
          autoResolvedCount: { type: "number" },
          autoResolvedExceptionCategory: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          resolvedContext: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
      { type: "null" },
    ],
  },
});

// ============================================================================
// 2. ROUTE DEFINITIONS
// ============================================================================

export const carrierTelemetryRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Fast Ingress Endpoint (<25ms)
   * Buffers raw telemetry events into SQLite WAL with status 'QUEUED'
   */
  app.post<{
    Body: RawTelemetryIngressInput;
  }>(
    "/ingress",
    {
      schema: {
        description: "Buffer raw multi-modal carrier telemetry in <25ms",
        tags: ["Carrier Telemetry", "SCM"],
        body: {
          type: "object",
          additionalProperties: true,
        },
        response: {
          200: INGRESS_RESPONSE_SCHEMA,
          202: INGRESS_RESPONSE_SCHEMA,
          ...buildErrorResponses([400, 500]),
        },
      },
    },
    async (request, reply) => {
      const result =
        await CarrierTelemetryIngestionService.bufferInboundTelemetry(
          request.body,
        );

      const statusCode = result.duplicate ? 200 : 202;
      return reply.code(statusCode).send(result);
    },
  );

  /**
   * Process a single queued event by ID
   */
  app.post<{
    Params: { id: string };
  }>(
    "/events/:id/process",
    {
      schema: {
        description: "Process and resolve a single queued telemetry event",
        tags: ["Carrier Telemetry", "SCM"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
        response: {
          200: openApiObject({
            success: { type: "boolean" },
            result: {
              anyOf: [
                { type: "object", additionalProperties: true },
                { type: "null" },
              ],
            },
          }),
          ...buildErrorResponses([400, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      const processed =
        await CarrierTelemetryIngestionService.processTelemetryEvent(
          request.params.id,
          DEFAULT_OPERATOR_ACTOR,
        );

      if (!processed) {
        return reply.code(404).send({
          statusCode: 404,
          error: "Not Found",
          message: `Telemetry event with ID '${request.params.id}' not found`,
        });
      }

      return reply.send({ success: true, result: processed });
    },
  );

  /**
   * Trigger batch queue worker
   */
  app.post<{
    Querystring: { batchSize?: number };
  }>(
    "/process-queue",
    {
      schema: {
        description: "Process a batch of queued telemetry events",
        tags: ["Carrier Telemetry", "SCM"],
        querystring: {
          type: "object",
          properties: {
            batchSize: { type: "integer", default: 20 },
          },
        },
        response: {
          200: openApiObject({
            processed: { type: "number" },
            failed: { type: "number" },
          }),
          ...buildErrorResponses([500]),
        },
      },
    },
    async (request, reply) => {
      const batchSize = request.query.batchSize || 20;
      const stats =
        await CarrierTelemetryIngestionService.processQueuedTelemetry(
          batchSize,
          DEFAULT_OPERATOR_ACTOR,
        );

      return reply.send(stats);
    },
  );

  /**
   * Retrieve chronological live telemetry stream
   */
  app.get<{
    Querystring: { limit?: number };
  }>(
    "/feed",
    {
      schema: {
        description: "Retrieve chronological live carrier telemetry feed",
        tags: ["Carrier Telemetry", "SCM"],
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", default: 50 },
          },
        },
        response: {
          200: openApiArray(TELEMETRY_FEED_ITEM_PROPERTIES),
          ...buildErrorResponses([500]),
        },
      },
    },
    async (request, reply) => {
      const limit = Math.min(request.query.limit || 50, 100);
      const feed =
        await CarrierTelemetryIngestionService.getLiveTelemetryFeed(limit);
      return reply.send(feed);
    },
  );

  /**
   * Interactive Operator Simulation Endpoint (Zero Mocks Standard)
   * Buffers and immediately processes an event, returning full resolution telemetry
   */
  app.post<{
    Body: RawTelemetryIngressInput;
  }>(
    "/simulate",
    {
      schema: {
        description: "Simulate and immediately process carrier telemetry event",
        tags: ["Carrier Telemetry", "SCM"],
        body: {
          type: "object",
          additionalProperties: true,
        },
        response: {
          200: TELEMETRY_SIMULATE_RESPONSE_SCHEMA,
          ...buildErrorResponses([400, 500]),
        },
      },
    },
    async (request, reply) => {
      const ingressResult =
        await CarrierTelemetryIngestionService.bufferInboundTelemetry(
          request.body,
        );

      const processedResult =
        await CarrierTelemetryIngestionService.processTelemetryEvent(
          ingressResult.eventId,
          DEFAULT_OPERATOR_ACTOR,
        );

      return reply.send({
        ingress: ingressResult,
        processed: processedResult,
      });
    },
  );
};
