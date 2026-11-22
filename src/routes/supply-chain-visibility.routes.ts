/**
 * @file supply-chain-visibility.routes.ts
 * @description Fastify REST routes for Supply Chain Visibility, milestone event tracking,
 * predictive SLA exception management, and resolution workflows (ADR 0033).
 * @module @atlas/api/routes/supply-chain-visibility
 * @see {@link docs/adr/0033-supply-chain-visibility-and-predictive-milestone-tracking.md}
 */

import { FastifyPluginAsync } from "fastify";
import {
  getPurchaseOrderTimeline,
  ingestVisibilityEvent,
  listSupplyChainExceptions,
  resolveSupplyChainException,
  scanSupplyChainExceptions,
  IngestVisibilityEventInput,
  ResolveExceptionInput,
} from "../services/supply-chain-visibility.service.js";
import { getCurrentTenant } from "../lib/tenancy/index.js";
import {
  OPENAPI_ID_PARAMS_SCHEMA,
  buildErrorResponses,
  openApiArray,
  openApiObject,
} from "./openapi.schemas.js";
import {
  MilestoneCategory,
  MilestoneStatus,
  MilestoneDataSource,
  ExceptionCategory,
  ExceptionSeverity,
  ExceptionStatus,
} from "../db/schema/supply_chain_visibility.js";

const MILESTONE_EVENT_PROPERTIES = {
  id: { type: "string" },
  tenantId: { type: "string" },
  poId: { type: "string" },
  poLineItemId: { anyOf: [{ type: "string" }, { type: "null" }] },
  bookingId: { anyOf: [{ type: "string" }, { type: "null" }] },
  shipmentId: { anyOf: [{ type: "string" }, { type: "null" }] },
  containerNumber: { anyOf: [{ type: "string" }, { type: "null" }] },
  milestoneCode: { type: "string" },
  milestoneCategory: { type: "string" },
  status: { type: "string" },
  plannedTimestamp: { type: "string" },
  estimatedTimestamp: { anyOf: [{ type: "string" }, { type: "null" }] },
  actualTimestamp: { anyOf: [{ type: "string" }, { type: "null" }] },
  delayHours: { type: "number" },
  locationCode: { anyOf: [{ type: "string" }, { type: "null" }] },
  locationName: { anyOf: [{ type: "string" }, { type: "null" }] },
  vesselName: { anyOf: [{ type: "string" }, { type: "null" }] },
  voyageNumber: { anyOf: [{ type: "string" }, { type: "null" }] },
  carrierCode: { anyOf: [{ type: "string" }, { type: "null" }] },
  dataSource: { type: "string" },
  notes: { anyOf: [{ type: "string" }, { type: "null" }] },
  createdAt: { anyOf: [{ type: "string" }, { type: "number" }] },
  updatedAt: {
    anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
  },
} as const;

const EXCEPTION_PROPERTIES = {
  id: { type: "string" },
  tenantId: { type: "string" },
  poId: { type: "string" },
  bookingId: { anyOf: [{ type: "string" }, { type: "null" }] },
  shipmentId: { anyOf: [{ type: "string" }, { type: "null" }] },
  milestoneEventId: { anyOf: [{ type: "string" }, { type: "null" }] },
  exceptionCode: { type: "string" },
  exceptionCategory: { type: "string" },
  severity: { type: "string" },
  status: { type: "string" },
  title: { type: "string" },
  description: { type: "string" },
  impactSummary: { anyOf: [{ type: "string" }, { type: "null" }] },
  delayEstimateHours: { type: "number" },
  financialRiskAmount: { type: "string" },
  financialRiskCurrency: { type: "string" },
  suggestedMitigations: {
    anyOf: [
      { type: "array", items: { type: "object", additionalProperties: true } },
      { type: "string" },
      { type: "null" },
    ],
  },
  poNumber: { anyOf: [{ type: "string" }, { type: "null" }] },
  bookingNumber: { anyOf: [{ type: "string" }, { type: "null" }] },
  resolvedBy: { anyOf: [{ type: "string" }, { type: "null" }] },
  resolvedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
  resolutionNotes: { anyOf: [{ type: "string" }, { type: "null" }] },
  createdAt: { anyOf: [{ type: "string" }, { type: "number" }] },
  updatedAt: {
    anyOf: [{ type: "string" }, { type: "number" }, { type: "null" }],
  },
} as const;

interface ListExceptionsQuery {
  poId?: string;
  bookingId?: string;
  status?: ExceptionStatus;
  severity?: ExceptionSeverity;
  category?: ExceptionCategory;
  limit?: string;
}

export const supplyChainVisibilityRoutes: FastifyPluginAsync = async (
  fastify,
) => {
  // 1. Get Purchase Order Timeline & Visibility
  fastify.get<{
    Params: { id: string };
  }>(
    "/purchase-orders/:id/timeline",
    {
      schema: {
        tags: ["SCM Visibility"],
        summary:
          "Get full chronological milestone timeline and exceptions for a PO",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        response: {
          200: openApiObject(
            {
              po: { type: "object", additionalProperties: true },
              milestones: openApiArray(
                MILESTONE_EVENT_PROPERTIES,
                "Milestones",
              ),
              exceptions: openApiArray(EXCEPTION_PROPERTIES, "Exceptions"),
              metrics: openApiObject({
                totalMilestones: { type: "number" },
                completedMilestones: { type: "number" },
                progressPercentage: { type: "number" },
                activeExceptionsCount: { type: "number" },
                criticalExceptionsCount: { type: "number" },
              }),
            },
            "PO Visibility Timeline",
          ),
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const tenant = getCurrentTenant();
        const tenantId = tenant?.organizationId || "tenant_default";
        const { id } = request.params;

        const timeline = await getPurchaseOrderTimeline(id, tenantId);
        return reply.send(timeline);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load timeline";
        if (msg.includes("not found")) {
          return reply.code(404).send({ error: "Not Found", message: msg });
        }
        return reply
          .code(500)
          .send({ error: "Internal Server Error", message: msg });
      }
    },
  );

  // 2. Ingest Milestone Visibility Event
  fastify.post<{
    Body: {
      poId: string;
      poLineItemId?: string | null;
      bookingId?: string | null;
      shipmentId?: string | null;
      containerNumber?: string | null;
      milestoneCode: string;
      milestoneCategory: MilestoneCategory;
      status?: MilestoneStatus;
      plannedTimestamp: string;
      estimatedTimestamp?: string | null;
      actualTimestamp?: string | null;
      locationCode?: string | null;
      locationName?: string | null;
      latitude?: string | null;
      longitude?: string | null;
      vesselName?: string | null;
      voyageNumber?: string | null;
      carrierCode?: string | null;
      dataSource?: MilestoneDataSource;
      notes?: string | null;
    };
  }>(
    "/events",
    {
      schema: {
        tags: ["SCM Visibility"],
        summary: "Ingest a supply chain tracking milestone event",
        body: openApiObject({
          poId: { type: "string", description: "Target Purchase Order ID" },
          poLineItemId: { type: "string" },
          bookingId: { type: "string" },
          shipmentId: { type: "string" },
          containerNumber: { type: "string" },
          milestoneCode: { type: "string", description: "Milestone code" },
          milestoneCategory: {
            type: "string",
            enum: ["SUPPLIER_PRODUCTION", "CARRIER_TRANSIT", "FINAL_DELIVERY"],
          },
          status: {
            type: "string",
            enum: ["PLANNED", "ESTIMATED", "ACTUAL", "CANCELLED"],
          },
          plannedTimestamp: {
            type: "string",
            description: "Planned ISO timestamp",
          },
          estimatedTimestamp: { type: "string" },
          actualTimestamp: { type: "string" },
          locationCode: { type: "string" },
          locationName: { type: "string" },
          vesselName: { type: "string" },
          voyageNumber: { type: "string" },
          carrierCode: { type: "string" },
          dataSource: {
            type: "string",
            enum: [
              "SUPPLIER_PORTAL",
              "DCSA_EVENT",
              "AIS_TELEMETRY",
              "MANUAL_OVERRIDE",
              "SYSTEM_DERIVED",
            ],
          },
          notes: { type: "string" },
        }),
        response: {
          201: openApiObject({
            milestone: openApiObject(MILESTONE_EVENT_PROPERTIES),
            triggeredException: {
              anyOf: [openApiObject(EXCEPTION_PROPERTIES), { type: "null" }],
            },
          }),
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const tenant = getCurrentTenant();
        const tenantId = tenant?.organizationId || "tenant_default";

        const input: IngestVisibilityEventInput = {
          ...request.body,
          tenantId,
        };

        const result = await ingestVisibilityEvent(input);

        return reply.code(201).send(result);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to ingest milestone event";
        if (msg.includes("not found")) {
          return reply.code(404).send({ error: "Not Found", message: msg });
        }
        return reply.code(400).send({ error: "Bad Request", message: msg });
      }
    },
  );

  // 3. List Supply Chain Exceptions
  fastify.get<{
    Querystring: ListExceptionsQuery;
  }>(
    "/exceptions",
    {
      schema: {
        tags: ["SCM Visibility"],
        summary: "List active or historical supply chain exceptions",
        querystring: openApiObject({
          poId: { type: "string" },
          bookingId: { type: "string" },
          status: { type: "string" },
          severity: { type: "string" },
          category: { type: "string" },
          limit: { type: "string" },
        }),
        response: {
          200: openApiArray(EXCEPTION_PROPERTIES, "Supply Chain Exceptions"),
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const tenant = getCurrentTenant();
        const tenantId = tenant?.organizationId || "tenant_default";
        const query = request.query || {};

        const results = await listSupplyChainExceptions({
          tenantId,
          poId: query.poId,
          bookingId: query.bookingId,
          status: query.status,
          severity: query.severity,
          category: query.category,
          limit: query.limit ? Number(query.limit) : 50,
        });

        return reply.send(results);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to list exceptions";
        return reply
          .code(500)
          .send({ error: "Internal Server Error", message: msg });
      }
    },
  );

  // 4. Resolve Supply Chain Exception
  fastify.post<{
    Params: { id: string };
    Body: {
      resolutionNotes: string;
      resolvedBy?: string;
    };
  }>(
    "/exceptions/:id/resolve",
    {
      schema: {
        tags: ["SCM Visibility"],
        summary:
          "Record operator resolution and mitigation for a supply chain exception",
        params: OPENAPI_ID_PARAMS_SCHEMA,
        body: openApiObject({
          resolutionNotes: {
            type: "string",
            description: "Operator mitigation and resolution explanation",
          },
          resolvedBy: { type: "string" },
        }),
        response: {
          200: openApiObject(EXCEPTION_PROPERTIES, "Resolved Exception"),
          ...buildErrorResponses([400, 401, 403, 404, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const tenant = getCurrentTenant();
        const tenantId = tenant?.organizationId || "tenant_default";
        const { id } = request.params;

        const input: ResolveExceptionInput = {
          resolutionNotes: request.body.resolutionNotes,
          resolvedBy: request.body.resolvedBy,
        };

        const updated = await resolveSupplyChainException(id, tenantId, input);

        return reply.send(updated);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to resolve exception";
        if (msg.includes("not found")) {
          return reply.code(404).send({ error: "Not Found", message: msg });
        }
        return reply.code(400).send({ error: "Bad Request", message: msg });
      }
    },
  );

  // 5. Automated Exception Scan / Sweeper
  fastify.post(
    "/scan",
    {
      schema: {
        tags: ["SCM Visibility"],
        summary:
          "Trigger automated predictive exception detection scan across active POs",
        response: {
          200: openApiObject({
            scannedPosCount: { type: "number" },
            detectedExceptionsCount: { type: "number" },
            exceptions: openApiArray(EXCEPTION_PROPERTIES),
          }),
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      try {
        const tenant = getCurrentTenant();
        const tenantId = tenant?.organizationId || "tenant_default";

        const scanResult = await scanSupplyChainExceptions(tenantId);

        return reply.send(scanResult);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to execute scan";
        return reply
          .code(500)
          .send({ error: "Internal Server Error", message: msg });
      }
    },
  );
};

export default supplyChainVisibilityRoutes;
