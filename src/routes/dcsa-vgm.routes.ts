/**
 * @file dcsa-vgm.routes.ts
 * @description Fastify REST routes for DCSA v3.0 Container Lifecycles and SOLAS Verified Gross Mass (VGM) declarations.
 * Endpoints for VGM declaration, EDIFACT VERMAS transmission, carrier acknowledgment webhooks, and DCSA event ingestion.
 * @module @atlas/api/routes/dcsa-vgm
 * @see {@link docs/adr/0038-customs-mtls-and-regulatory-filing-gateway.md}
 */

import { FastifyPluginAsync } from "fastify";
import {
  dcsaVgmService,
  type DeclareVgmInput,
  type IngestDcsaEventInput,
} from "../services/dcsa-vgm.service.js";
import {
  buildErrorResponses,
  openApiArray,
  openApiObject,
} from "./openapi.schemas.js";
import { DEFAULT_OPERATOR_ACTOR } from "../scm/kernel/primitives.js";

// ============================================================================
// 1. OPENAPI TYPEBOX SCHEMAS
// ============================================================================

const VGM_PROPERTIES = {
  id: { type: "string" },
  tenantId: { anyOf: [{ type: "string" }, { type: "null" }] },
  containerId: { type: "string" },
  shipmentId: { anyOf: [{ type: "string" }, { type: "null" }] },
  containerNumber: { type: "string" },
  vgmWeightKg: { type: "number" },
  weighingMethod: { type: "string" },
  authorizedPerson: { type: "string" },
  signatureDate: {
    anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
  },
  certificateBlobUrl: { anyOf: [{ type: "string" }, { type: "null" }] },
  ediTransmittedAt: {
    anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
  },
  createdAt: { anyOf: [{ type: "string" }, { type: "number" }] },
  updatedAt: { anyOf: [{ type: "string" }, { type: "number" }] },
};

const VGM_SCHEMA = openApiObject(VGM_PROPERTIES);

const DECLARE_VGM_RESPONSE_SCHEMA = openApiObject({
  vgmRecord: VGM_SCHEMA,
  declarationReference: { type: "string" },
  edifactVermas: { type: "string" },
  dcsaJson: openApiObject({}),
});

const DCSA_EVENT_PROPERTIES = {
  eventId: { type: "string" },
  eventType: { type: "string" },
  eventClassifierCode: { type: "string" },
  eventDateTime: { type: "string" },
  carrierBookingReference: { anyOf: [{ type: "string" }, { type: "null" }] },
  transportDocumentReference: { anyOf: [{ type: "string" }, { type: "null" }] },
  equipmentReference: { anyOf: [{ type: "string" }, { type: "null" }] },
  eventTypeCode: { type: "string" },
  locationLocode: { type: "string" },
  vesselImoNumber: { anyOf: [{ type: "string" }, { type: "null" }] },
  vesselName: { anyOf: [{ type: "string" }, { type: "null" }] },
  voyageNumber: { anyOf: [{ type: "string" }, { type: "null" }] },
  processedStatus: { type: "string" },
};

const DCSA_EVENT_SCHEMA = openApiObject(DCSA_EVENT_PROPERTIES);

// ============================================================================
// 2. FASTIFY PLUGIN IMPLEMENTATION
// ============================================================================

export const dcsaVgmRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/dcsa/v3/vgm/declare
   * Declares container Verified Gross Mass (SOLAS VGM) and generates EDIFACT VERMAS.
   */
  fastify.post<{ Body: DeclareVgmInput }>(
    "/api/dcsa/v3/vgm/declare",
    {
      schema: {
        description:
          "Declares container Verified Gross Mass (SOLAS VGM) with ISO 6346 validation and VERMAS synthesis",
        tags: ["DCSA v3.0 & VGM"],
        body: openApiObject({
          containerId: { type: "string" },
          shipmentId: { type: "string" },
          containerNumber: { type: "string" },
          isoSizeType: { type: "string" },
          bookingReference: { type: "string" },
          weighingMethod: { type: "string", enum: ["METHOD_1", "METHOD_2"] },
          tareWeightKg: { type: "number" },
          scaleGrossWeightKg: { type: "number" },
          cargoNetMassKg: { type: "number" },
          packagingMassKg: { type: "number" },
          securingDunnageMassKg: { type: "number" },
          maxPayloadKg: { type: "number" },
          authorizedPerson: { type: "string" },
          weighingPartyName: { type: "string" },
          certifiedScaleId: { type: "string" },
          solasApprovalNumber: { type: "string" },
          tenantId: { type: "string" },
        }),
        response: {
          201: DECLARE_VGM_RESPONSE_SCHEMA,
          ...buildErrorResponses([400, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = DEFAULT_OPERATOR_ACTOR;
        const result = await dcsaVgmService.declareVgm({
          ...request.body,
          actor,
        });
        return reply.code(201).send(result);
      } catch (err: unknown) {
        request.log.error(err, "Failed to declare SOLAS VGM");
        return reply.code(400).send({
          statusCode: 400,
          error: "Bad Request",
          message:
            err instanceof Error ? err.message : "VGM declaration failed",
        });
      }
    },
  );

  /**
   * GET /api/dcsa/v3/vgm
   * Lists VGM declarations.
   */
  fastify.get<{
    Querystring: {
      containerId?: string;
      containerNumber?: string;
      shipmentId?: string;
      tenantId?: string;
      limit?: number;
      offset?: number;
    };
  }>(
    "/api/dcsa/v3/vgm",
    {
      schema: {
        description:
          "Lists container Verified Gross Mass (SOLAS VGM) declarations",
        tags: ["DCSA v3.0 & VGM"],
        querystring: openApiObject({
          containerId: { type: "string" },
          containerNumber: { type: "string" },
          shipmentId: { type: "string" },
          tenantId: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
        }),
        response: {
          200: openApiArray(VGM_PROPERTIES),
          ...buildErrorResponses([400, 500]),
        },
      },
    },
    async (request, reply) => {
      const list = await dcsaVgmService.listVgmDeclarations(request.query);
      return reply.code(200).send(list);
    },
  );

  /**
   * POST /api/dcsa/v3/vgm/:id/ack
   * Ingests carrier or terminal VERMAS acknowledgment.
   */
  fastify.post<{ Params: { id: string }; Body: { rawPayload: string } }>(
    "/api/dcsa/v3/vgm/:id/ack",
    {
      schema: {
        description:
          "Ingests carrier or terminal VERMAS EDIFACT or JSON acknowledgment",
        tags: ["DCSA v3.0 & VGM"],
        params: openApiObject({ id: { type: "string" } }),
        body: openApiObject({ rawPayload: { type: "string" } }),
        response: {
          200: openApiObject({
            updatedRecord: VGM_SCHEMA,
            ack: openApiObject({
              status: { type: "string" },
              acknowledgedAt: { type: "string" },
              reference: { anyOf: [{ type: "string" }, { type: "null" }] },
              rejectionReason: {
                anyOf: [{ type: "string" }, { type: "null" }],
              },
            }),
          }),
          ...buildErrorResponses([400, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = DEFAULT_OPERATOR_ACTOR;
        const result = await dcsaVgmService.processVermasAck(
          request.params.id,
          request.body.rawPayload,
          actor,
        );
        return reply.code(200).send(result);
      } catch (err: unknown) {
        request.log.error(err, "Failed to process VERMAS acknowledgment");
        const msg = err instanceof Error ? err.message : "VERMAS ack failed";
        const code = msg.includes("not found") ? 404 : 400;
        return reply.code(code).send({
          statusCode: code,
          error: code === 404 ? "Not Found" : "Bad Request",
          message: msg,
        });
      }
    },
  );

  /**
   * POST /api/dcsa/v3/events
   * Ingests a DCSA v3.0 operational telemetry event.
   */
  fastify.post<{ Body: IngestDcsaEventInput }>(
    "/api/dcsa/v3/events",
    {
      schema: {
        description:
          "Ingests an operational event adhering to DCSA v3.0 standard",
        tags: ["DCSA v3.0 & VGM"],
        body: openApiObject({
          eventType: {
            type: "string",
            enum: ["EQUIPMENT", "TRANSPORT", "SHIPMENT"],
          },
          eventClassifierCode: { type: "string", enum: ["ACT", "EST", "PLN"] },
          eventDateTime: { type: "string" },
          carrierBookingReference: { type: "string" },
          transportDocumentReference: { type: "string" },
          equipmentReference: { type: "string" },
          eventTypeCode: { type: "string" },
          locationLocode: { type: "string" },
          vesselImoNumber: { type: "string" },
          vesselName: { type: "string" },
          voyageNumber: { type: "string" },
          payloadJson: { type: "string" },
        }),
        response: {
          201: DCSA_EVENT_SCHEMA,
          ...buildErrorResponses([400, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = DEFAULT_OPERATOR_ACTOR;
        const event = await dcsaVgmService.ingestDcsaEvent({
          ...request.body,
          actor,
        });
        return reply.code(201).send(event);
      } catch (err: unknown) {
        request.log.error(err, "Failed to ingest DCSA v3.0 event");
        return reply.code(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: err instanceof Error ? err.message : "DCSA ingestion failed",
        });
      }
    },
  );
};
