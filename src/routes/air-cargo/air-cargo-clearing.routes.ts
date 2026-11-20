/**
 * @file air-cargo-clearing.routes.ts
 * @description Fastify routes for IATA Air Cargo Messaging (FWB/FHL/FSU), CASS Billing Reconciliation, and Corresponding Agent Network Clearing & Netting.
 * @module @atlas/routes/air-cargo/air-cargo-clearing
 * @see {@link docs/adr/0029-air-cargo-messaging-cass-and-agent-network-clearing.md}
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AirCargoMessagingService } from "../../services/air-cargo/air-cargo-messaging.service.js";
import { AgentNetworkClearingService } from "../../services/clearing/agent-network-clearing.service.js";
import { logger } from "../../config/logger.js";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  buildErrorResponses,
  buildParamSchema,
} from "../openapi.schemas.js";

const AIR_CARGO_CLEARING_TAG = ["Air Cargo Messaging & Clearing"] as const;

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const dispatchFwbSchema = z.object({
  airlinePrefix: z.string().length(3),
  awbSerial7: z.string().length(7),
  originAirport: z.string().length(3),
  destinationAirport: z.string().length(3),
  flightNumber: z.string().min(3),
  flightDayMonth: z.string().min(5),
  shipperName: z.string().min(1),
  shipperAddress: z.string().min(1),
  shipperCity: z.string().min(1),
  shipperCountry: z.string().length(2),
  consigneeName: z.string().min(1),
  consigneeAddress: z.string().min(1),
  consigneeCity: z.string().min(1),
  consigneeCountry: z.string().length(2),
  pieces: z.number().int().positive(),
  grossWeightKg: z.number().positive(),
  volumeCbm: z.number().nonnegative().optional(),
  chargeableWeightKg: z.number().positive().optional(),
  ratePerKg: z.number().positive(),
  currency: z.string().length(3).optional(),
  natureOfGoods: z.string().min(1),
  specialHandlingCodes: z.array(z.string()).optional(),
  fuelSurcharge: z.number().nonnegative().optional(),
  securitySurcharge: z.number().nonnegative().optional(),
  issuingAgentName: z.string().optional(),
  tenantId: z.string().optional(),
});

const dispatchFhlSchema = z.object({
  airlinePrefix: z.string().length(3),
  mawbSerial7: z.string().length(7),
  originAirport: z.string().length(3),
  destinationAirport: z.string().length(3),
  totalPieces: z.number().int().positive(),
  totalGrossWeightKg: z.number().positive(),
  items: z
    .array(
      z.object({
        hawbNumber: z.string().min(1),
        originAirport: z.string().length(3),
        destinationAirport: z.string().length(3),
        pieces: z.number().int().positive(),
        grossWeightKg: z.number().positive(),
        natureOfGoods: z.string().min(1),
        shipperName: z.string().min(1),
        shipperCity: z.string().min(1),
        shipperCountry: z.string().length(2),
        consigneeName: z.string().min(1),
        consigneeCity: z.string().min(1),
        consigneeCountry: z.string().length(2),
      }),
    )
    .min(1),
  tenantId: z.string().optional(),
});

const ingestFsuSchema = z.object({
  teletypeRaw: z.string().min(1),
  tenantId: z.string().optional(),
});

const recordAgentNoteSchema = z.object({
  entryNumber: z.string().optional(),
  noteType: z.enum(["DEBIT_NOTE", "CREDIT_NOTE"]),
  agentCompanyId: z.string().min(1),
  shipmentId: z.string().optional(),
  hblOrHawbNumber: z.string().min(1),
  currency: z.string().length(3),
  amount: z.number().positive(),
  exchangeRateToEur: z.number().positive().optional(),
  description: z.string().min(1),
  verifiedGrossProfitEur: z.number().optional(),
  agentProfitSharePercent: z.number().min(0).max(100).optional(),
  tenantId: z.string().optional(),
});

const calculateProfitShareSchema = z.object({
  agentCompanyId: z.string().min(1),
  shipmentId: z.string().min(1),
  hblOrHawbNumber: z.string().min(1),
  clientGrossRevenueEur: z.number().nonnegative(),
  carrierFreightCostEur: z.number().nonnegative(),
  originTerminalFeesEur: z.number().nonnegative(),
  destinationTerminalFeesEur: z.number().nonnegative(),
  splitPercentageAgent: z.number().min(0).max(100).optional(),
  tenantId: z.string().optional(),
});

const executeNettingSchema = z.object({
  agentCompanyId: z.string().min(1),
  targetCurrency: z.string().length(3).optional(),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  tenantId: z.string().optional(),
});

// ============================================================================
// ROUTES PLUGIN
// ============================================================================

export const airCargoClearingRoutes: FastifyPluginAsync = async (fastify) => {
  const messagingService = new AirCargoMessagingService();
  const clearingService = new AgentNetworkClearingService();

  // 1. Dispatch e-AWB FWB v16
  fastify.post(
    "/messaging/fwb",
    {
      schema: {
        tags: [...AIR_CARGO_CLEARING_TAG],
        summary:
          "Dispatch an IATA Cargo-IMP FWB v16 Master Air Waybill message",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const parsed = dispatchFwbSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parsed.error.format(),
          });
        }

        const result = await messagingService.dispatchMasterFwb(
          parsed.data,
          parsed.data.tenantId,
        );
        return reply.status(201).send(result);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error dispatching Cargo-IMP FWB");
        return reply.status(400).send({
          error: "Failed to dispatch Cargo-IMP FWB",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 2. Dispatch e-AWB Consolidation FHL v4
  fastify.post(
    "/messaging/fhl",
    {
      schema: {
        tags: [...AIR_CARGO_CLEARING_TAG],
        summary:
          "Dispatch an IATA Cargo-IMP FHL v4 House Manifest consolidation message",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const parsed = dispatchFhlSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parsed.error.format(),
          });
        }

        const result = await messagingService.dispatchHouseFhl(
          parsed.data,
          parsed.data.tenantId,
        );
        return reply.status(201).send(result);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error dispatching Cargo-IMP FHL");
        return reply.status(400).send({
          error: "Failed to dispatch Cargo-IMP FHL",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 3. Ingest Airline Status Update FSU
  fastify.post(
    "/messaging/fsu",
    {
      schema: {
        tags: [...AIR_CARGO_CLEARING_TAG],
        summary: "Ingest an airline Cargo-IMP FSU teletype status update",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const parsed = ingestFsuSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parsed.error.format(),
          });
        }

        const result = await messagingService.ingestAirlineStatusUpdateFsu(
          parsed.data.teletypeRaw,
          parsed.data.tenantId,
        );
        return reply.status(200).send(result);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error ingesting Cargo-IMP FSU");
        return reply.status(400).send({
          error: "Failed to ingest Cargo-IMP FSU",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 4. Retrieve AWB Messaging Audit Log
  fastify.get<{ Params: { awbNumber: string } }>(
    "/messaging/awb/:awbNumber",
    {
      schema: {
        tags: [...AIR_CARGO_CLEARING_TAG],
        summary: "Retrieve Cargo-IMP FWB/FHL/FSU audit log for an Air Waybill",
        params: buildParamSchema(
          "awbNumber",
          "IATA Air Waybill identifier (e.g. 176-12345675).",
        ),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { awbNumber } = request.params;
        const messages = await messagingService.getMessagesByAwb(awbNumber);
        return reply.status(200).send({ awbNumber, messages });
      } catch (error: unknown) {
        logger.error({ err: error }, "Error fetching AWB messages");
        return reply.status(500).send({
          error: "Failed to fetch AWB messages",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 5. Post Debit Note or Credit Note to Agent Clearing Ledger
  fastify.post(
    "/clearing/agent-notes",
    {
      schema: {
        tags: [...AIR_CARGO_CLEARING_TAG],
        summary:
          "Post a bilateral Debit Note or Credit Note to the agent clearing ledger",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const parsed = recordAgentNoteSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parsed.error.format(),
          });
        }

        const result = await clearingService.recordAgentNote(parsed.data);
        return reply.status(201).send(result);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error recording agent note");
        return reply.status(400).send({
          error: "Failed to record agent note",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 6. Calculate & Post Profit Share
  fastify.post(
    "/clearing/profit-share/calculate",
    {
      schema: {
        tags: [...AIR_CARGO_CLEARING_TAG],
        summary:
          "Calculate and post corresponding agent profit share allocation",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const parsed = calculateProfitShareSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parsed.error.format(),
          });
        }

        const result = await clearingService.calculateAndPostProfitShare(
          parsed.data.agentCompanyId,
          {
            shipmentId: parsed.data.shipmentId,
            hblOrHawbNumber: parsed.data.hblOrHawbNumber,
            clientGrossRevenueEur: parsed.data.clientGrossRevenueEur,
            carrierFreightCostEur: parsed.data.carrierFreightCostEur,
            originTerminalFeesEur: parsed.data.originTerminalFeesEur,
            destinationTerminalFeesEur: parsed.data.destinationTerminalFeesEur,
            splitPercentageAgent: parsed.data.splitPercentageAgent,
          },
          parsed.data.tenantId,
        );

        return reply.status(200).send(result);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error calculating agent profit share");
        return reply.status(400).send({
          error: "Failed to calculate agent profit share",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 7. Execute Bilateral Period Netting
  fastify.post(
    "/clearing/settlements/netting",
    {
      schema: {
        tags: [...AIR_CARGO_CLEARING_TAG],
        summary:
          "Execute bilateral agent network period netting and settlement",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const parsed = executeNettingSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            error: "Validation failed",
            details: parsed.error.format(),
          });
        }

        const result = await clearingService.executePeriodNetting(
          parsed.data.agentCompanyId,
          parsed.data.targetCurrency || "USD",
          parsed.data.periodStart,
          parsed.data.periodEnd,
          parsed.data.tenantId,
        );

        return reply.status(200).send(result);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error executing period netting");
        return reply.status(400).send({
          error: "Failed to execute period netting",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // 8. Get Open Clearing Balance for Agent
  fastify.get<{ Params: { agentId: string } }>(
    "/clearing/agents/:agentId/balance",
    {
      schema: {
        tags: [...AIR_CARGO_CLEARING_TAG],
        summary: "Retrieve open bilateral clearing ledger balance for an agent",
        params: buildParamSchema("agentId", "Agent company identifier."),
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { agentId } = request.params;
        const balance = await clearingService.getAgentClearingBalance(agentId);
        return reply.status(200).send(balance);
      } catch (error: unknown) {
        logger.error({ err: error }, "Error fetching agent clearing balance");
        return reply.status(500).send({
          error: "Failed to fetch agent clearing balance",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
};

export default airCargoClearingRoutes;
