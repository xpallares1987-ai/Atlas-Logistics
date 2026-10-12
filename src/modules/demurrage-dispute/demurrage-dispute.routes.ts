/**
 * @file demurrage-dispute.routes.ts
 * @description Fastify routes for Demurrage & Detention Dispute Resolver API.
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { demurrageDisputeService } from "./demurrage-dispute.service.js";

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
  jurisdiction: z.enum(["US_FMC_OSRA_2022", "EU_PORT_STANDARD", "ES_PUERTOS_ESTADO"]),
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
  auditResult: z.any(),
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

export const demurrageDisputeRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/demurrage-dispute/presets
   * Retrieves high-impact dispute regulatory demo presets.
   */
  fastify.get("/presets", async (_request, reply) => {
    const presets = demurrageDisputeService.getPresets();
    return reply.status(200).send(presets);
  });

  /**
   * GET /api/demurrage-dispute/containers
   * Retrieves monitored active container clocks with free-time status.
   */
  fastify.get("/containers", async (_request, reply) => {
    const containers = demurrageDisputeService.getActiveContainers();
    return reply.status(200).send(containers);
  });

  /**
   * POST /api/demurrage-dispute/audit
   * Audits carrier invoice against EDI milestones and clock pause suspensions.
   */
  fastify.post("/audit", async (request, reply) => {
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
    } catch (err: any) {
      request.log.error(err, "Demurrage audit failed");
      return reply.status(500).send({ error: "AUDIT_EXECUTION_FAILED", message: err.message });
    }
  });

  /**
   * POST /api/demurrage-dispute/generate-pack
   * Builds evidentiary dispute dossier with statutory notices.
   */
  fastify.post("/generate-pack", async (request, reply) => {
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
    } catch (err: any) {
      request.log.error(err, "Failed to generate dispute pack");
      return reply.status(500).send({ error: "PACK_GENERATION_FAILED", message: err.message });
    }
  });

  /**
   * POST /api/demurrage-dispute/dispatch-email
   * Dispatches formal dispute letter to carrier claims department.
   */
  fastify.post("/dispatch-email", async (request, reply) => {
    const parse = DispatchEmailRequestSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: "INVALID_DISPATCH_REQUEST",
        details: parse.error.issues,
      });
    }

    try {
      const receipt = demurrageDisputeService.dispatchDisputeEmail(parse.data);
      return reply.status(200).send(receipt);
    } catch (err: any) {
      request.log.error(err, "Failed to dispatch dispute email");
      return reply.status(500).send({ error: "EMAIL_DISPATCH_FAILED", message: err.message });
    }
  });

  /**
   * GET /api/demurrage-dispute/history
   * Retrieves dispute ledger and dispatch receipts.
   */
  fastify.get("/history", async (_request, reply) => {
    const history = demurrageDisputeService.getHistory();
    return reply.status(200).send(history);
  });
};

export default demurrageDisputeRoutes;
