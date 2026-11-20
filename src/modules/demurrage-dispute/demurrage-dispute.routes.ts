/**
 * @file demurrage-dispute.routes.ts
 * @description Fastify routes for Demurrage & Detention (D&D) Dispute Resolver, FMC 46 CFR § 541 audits, clock-pause suspensions, evidentiary dispute packs, and carrier claim dispatch.
 * @module @atlas/api/modules/demurrage-dispute/routes
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { DemurrageAuditResult } from "@atlas/shared";
import { demurrageDisputeService } from "./demurrage-dispute.service.js";
import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  buildErrorResponses,
  getErrorMessage,
  openApiObject,
} from "../../routes/openapi.schemas.js";

// ============================================================================
// 1. ZOD VALIDATION SCHEMAS & PAYLOAD INTERFACES
// ============================================================================

const TariffTierSchema = z.object({
  fromDay: z.number(),
  toDay: z.number().optional(),
  dailyRate: z.number(),
  currency: z.string(),
});

const ClockSuspensionSchema = z.object({
  id: z.string(),
  code: z.enum([
    "TERMINAL_GATE_CLOSED",
    "APPOINTMENT_UNAVAILABLE",
    "CUSTOMS_PHYSICAL_EXAM",
    "CUSTOMS_VACIS_SCAN",
    "CHASSIS_SHORTAGE",
    "RAIL_EMBARGO",
    "PORT_STRIKE_FORCE_MAJEURE",
    "CARRIER_IT_OUTAGE",
  ]),
  reason: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  suspendedDays: z.number(),
  officialNoticeRef: z.string().optional(),
  evidenceAttachmentUrl: z.string().optional(),
  approved: z.boolean(),
});

const EDI315MilestoneSchema = z.object({
  id: z.string(),
  code: z.enum(["VD", "VA", "AL", "OA", "I", "CO", "CR"]),
  eventDescription: z.string(),
  timestamp: z.string(),
  locationCode: z.string(),
  locationName: z.string(),
  verified: z.boolean(),
  notes: z.string().optional(),
});

const CarrierInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string(),
  carrierName: z.string().min(1),
  carrierScac: z.string().min(1),
  billOfLading: z.string().min(1),
  containerNumber: z.string().min(1),
  chargeType: z.enum(["DEMURRAGE", "DETENTION", "PER_DIEM"]),
  jurisdiction: z.enum([
    "US_FMC_OSRA_2022",
    "EU_PORT_STANDARD",
    "ES_PUERTOS_ESTADO",
  ]),
  vesselVoyage: z.string().optional(),
  pod: z.string().optional(),
  terminalName: z.string().optional(),
  terminalHoursProvided: z.boolean().optional(),
  dischargeDate: z.string().optional(),
  availableDate: z.string().optional(),
  freeTimeStartDate: z.string().optional(),
  freeTimeEndDate: z.string().optional(),
  earliestReturnDate: z.string().optional(),
  freeDaysGranted: z.number().optional(),
  billedStartDate: z.string().optional(),
  billedEndDate: z.string().optional(),
  billedTotalDays: z.number().optional(),
  billedDailyRate: z.number().optional(),
  invoicedAmount: z.number(),
  currency: z.string(),
  disputeContactEmail: z.string().optional(),
  tariffTiers: z.array(TariffTierSchema).optional(),
});

const AuditRequestSchema = z.object({
  invoice: CarrierInvoiceSchema,
  suspensions: z.array(ClockSuspensionSchema),
  milestones: z.array(EDI315MilestoneSchema).optional(),
});

const GeneratePackRequestSchema = z.object({
  auditResult: z.custom<DemurrageAuditResult>(
    (val) => typeof val === "object" && val !== null,
    { message: "auditResult object is required" },
  ),
  shipperOrConsignee: z
    .object({
      companyName: z.string(),
      contactName: z.string(),
      email: z.string(),
      accountReference: z.string(),
    })
    .optional(),
  recipientEmail: z.string().optional(),
});

const DispatchEmailRequestSchema = z.object({
  dossierId: z.string().min(1),
  recipientEmail: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

interface CreateSuspensionBody {
  invoiceId?: string;
  startDate?: string;
  endDate?: string;
  daysSuspended?: number | string;
  reason?: string;
  justificationText?: string | null;
  evidenceDocumentId?: string | null;
}

interface CreateDisputeBody {
  invoiceId?: string;
  disputedAmountUsd?: number | string;
  revisedPayableUsd?: number | string;
  fmcRuleClause?: string;
  formalLetterPayload?: Record<string, unknown> | string | null;
}

// ============================================================================
// 2. FASTIFY ROUTE PLUGIN REGISTRATION
// ============================================================================

const DEMURRAGE_DISPUTE_TAG = ["Demurrage & Detention Disputes"] as const;

export const demurrageDisputeRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. GET /api/demurrage-dispute/invoices
  fastify.get(
    "/invoices",
    {
      schema: {
        tags: [...DEMURRAGE_DISPUTE_TAG],
        summary:
          "List demurrage and detention invoices enriched with clock suspensions and disputes",
        querystring: openApiObject({
          shipmentId: { type: "string" },
          containerNumber: { type: "string" },
        }),
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const { shipmentId, containerNumber } = request.query as {
          shipmentId?: string;
          containerNumber?: string;
        };

        const query = db.select().from(schema.demurrageInvoices);
        const conditions = [];
        if (shipmentId) {
          conditions.push(eq(schema.demurrageInvoices.shipmentId, shipmentId));
        }
        if (containerNumber) {
          conditions.push(
            eq(schema.demurrageInvoices.containerNumber, containerNumber),
          );
        }

        const invoices =
          conditions.length > 0
            ? await query.where(and(...conditions))
            : await query;

        const enrichedInvoices = await Promise.all(
          invoices.map(async (inv) => {
            const suspensions = await db
              .select()
              .from(schema.demurrageSuspensions)
              .where(eq(schema.demurrageSuspensions.invoiceId, inv.id));

            const disputes = await db
              .select()
              .from(schema.demurrageDisputes)
              .where(eq(schema.demurrageDisputes.invoiceId, inv.id));

            return {
              ...inv,
              tariffTiers: inv.tariffTiersJson
                ? (JSON.parse(inv.tariffTiersJson) as unknown[])
                : [],
              suspensions,
              disputes,
            };
          }),
        );

        return reply.status(200).send(enrichedInvoices);
      } catch (err: unknown) {
        request.log.error(err, "Failed to fetch demurrage invoices");
        return reply.status(500).send({
          error: "FAILED_FETCH_INVOICES",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 2. POST /api/demurrage-dispute/suspension
  fastify.post(
    "/suspension",
    {
      schema: {
        tags: [...DEMURRAGE_DISPUTE_TAG],
        summary:
          "Register a free-time clock suspension for a demurrage invoice",
        body: openApiObject({
          invoiceId: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          daysSuspended: { type: "number" },
          reason: { type: "string" },
          justificationText: { type: "string" },
          evidenceDocumentId: { type: "string" },
        }),
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          invoiceId,
          startDate,
          endDate,
          daysSuspended,
          reason,
          justificationText,
          evidenceDocumentId,
        } = (request.body ?? {}) as CreateSuspensionBody;

        if (
          !invoiceId ||
          !startDate ||
          !endDate ||
          daysSuspended == null ||
          !reason
        ) {
          return reply.status(400).send({
            error: "MISSING_REQUIRED_FIELDS",
            message:
              "invoiceId, startDate, endDate, daysSuspended, and reason are required.",
          });
        }

        const suspensionId = `dsusp_${randomUUID().substring(0, 8)}`;
        const newSuspension = {
          id: suspensionId,
          invoiceId,
          startDate,
          endDate,
          daysSuspended: Number(daysSuspended),
          reason,
          justificationText: justificationText || null,
          evidenceDocumentId: evidenceDocumentId || null,
          approved: true,
        };

        await db.insert(schema.demurrageSuspensions).values(newSuspension);

        return reply.status(201).send({
          success: true,
          suspension: newSuspension,
        });
      } catch (err: unknown) {
        request.log.error(err, "Failed to register demurrage suspension");
        return reply.status(500).send({
          error: "FAILED_CREATE_SUSPENSION",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 3. POST /api/demurrage-dispute/dispute
  fastify.post(
    "/dispute",
    {
      schema: {
        tags: [...DEMURRAGE_DISPUTE_TAG],
        summary:
          "Submit a formal statutory FMC/OSRA dispute against a carrier invoice",
        body: openApiObject({
          invoiceId: { type: "string" },
          disputedAmountUsd: { type: "number" },
          revisedPayableUsd: { type: "number" },
          fmcRuleClause: { type: "string" },
          formalLetterPayload: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        }),
        response: {
          201: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const {
          invoiceId,
          disputedAmountUsd,
          revisedPayableUsd,
          fmcRuleClause,
          formalLetterPayload,
        } = (request.body ?? {}) as CreateDisputeBody;

        if (
          !invoiceId ||
          disputedAmountUsd == null ||
          revisedPayableUsd == null ||
          !fmcRuleClause
        ) {
          return reply.status(400).send({
            error: "MISSING_REQUIRED_FIELDS",
            message:
              "invoiceId, disputedAmountUsd, revisedPayableUsd, and fmcRuleClause are required.",
          });
        }

        const disputeId = `ddisp_${randomUUID().substring(0, 8)}`;
        const newDispute = {
          id: disputeId,
          invoiceId,
          disputedAmountUsd: Number(disputedAmountUsd),
          revisedPayableUsd: Number(revisedPayableUsd),
          fmcRuleClause,
          status: "SUBMITTED" as const,
          formalLetterPayload: formalLetterPayload
            ? JSON.stringify(formalLetterPayload)
            : null,
          submittedAt: Math.floor(Date.now() / 1000),
        };

        await db.insert(schema.demurrageDisputes).values(newDispute);

        await db
          .update(schema.demurrageInvoices)
          .set({ status: "DISPUTED" })
          .where(eq(schema.demurrageInvoices.id, invoiceId));

        return reply.status(201).send({
          success: true,
          dispute: newDispute,
        });
      } catch (err: unknown) {
        request.log.error(err, "Failed to submit demurrage dispute");
        return reply.status(500).send({
          error: "FAILED_CREATE_DISPUTE",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 4. GET /api/demurrage-dispute/presets
  fastify.get(
    "/presets",
    {
      schema: {
        tags: [...DEMURRAGE_DISPUTE_TAG],
        summary: "Retrieve regulatory demurrage dispute reference presets",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      const presets = demurrageDisputeService.getPresets();
      return reply.status(200).send(presets);
    },
  );

  // 5. GET /api/demurrage-dispute/containers
  fastify.get(
    "/containers",
    {
      schema: {
        tags: [...DEMURRAGE_DISPUTE_TAG],
        summary: "Retrieve active container free-time dwell clocks",
        response: {
          200: OPENAPI_FLEXIBLE_ARRAY_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      const containers = demurrageDisputeService.getActiveContainers();
      return reply.status(200).send(containers);
    },
  );

  // 6. POST /api/demurrage-dispute/audit
  fastify.post(
    "/audit",
    {
      schema: {
        tags: [...DEMURRAGE_DISPUTE_TAG],
        summary:
          "Audit carrier demurrage invoice against EDI 315 milestones and clock suspensions",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const parse = AuditRequestSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({
          error: "INVALID_AUDIT_REQUEST",
          details: parse.error.issues,
        });
      }

      try {
        const result = demurrageDisputeService.auditInvoice(parse.data);
        return reply.status(200).send(result);
      } catch (err: unknown) {
        request.log.error(err, "Demurrage audit failed");
        return reply.status(500).send({
          error: "AUDIT_EXECUTION_FAILED",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 7. POST /api/demurrage-dispute/generate-pack
  fastify.post(
    "/generate-pack",
    {
      schema: {
        tags: [...DEMURRAGE_DISPUTE_TAG],
        summary: "Generate evidentiary demurrage dispute dossier pack",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const parse = GeneratePackRequestSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({
          error: "INVALID_GENERATE_PACK_REQUEST",
          details: parse.error.issues,
        });
      }

      try {
        const pack = demurrageDisputeService.generatePack(parse.data);
        return reply.status(200).send(pack);
      } catch (err: unknown) {
        request.log.error(err, "Failed to generate dispute pack");
        return reply.status(500).send({
          error: "PACK_GENERATION_FAILED",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 8. POST /api/demurrage-dispute/dispatch-email
  fastify.post(
    "/dispatch-email",
    {
      schema: {
        tags: [...DEMURRAGE_DISPUTE_TAG],
        summary: "Dispatch formal dispute claim email to carrier claims desk",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 403, 500]),
        },
      },
    },
    async (request, reply) => {
      const parse = DispatchEmailRequestSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({
          error: "INVALID_DISPATCH_REQUEST",
          details: parse.error.issues,
        });
      }

      try {
        const receipt = demurrageDisputeService.dispatchDisputeEmail(
          parse.data,
        );
        return reply.status(200).send(receipt);
      } catch (err: unknown) {
        request.log.error(err, "Failed to dispatch dispute email");
        return reply.status(500).send({
          error: "EMAIL_DISPATCH_FAILED",
          message: getErrorMessage(err),
        });
      }
    },
  );

  // 9. GET /api/demurrage-dispute/history
  fastify.get(
    "/history",
    {
      schema: {
        tags: [...DEMURRAGE_DISPUTE_TAG],
        summary: "Retrieve demurrage audit, dossier pack, and dispatch history",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 403, 500]),
        },
      },
    },
    async (_request, reply) => {
      const history = demurrageDisputeService.getHistory();
      return reply.status(200).send(history);
    },
  );
};

export default demurrageDisputeRoutes;
