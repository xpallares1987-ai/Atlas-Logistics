import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  DcsaHubService,
  DcsaEventType,
  DcsaEventClassifierCode,
  DcsaEventPayload,
} from "../services/dcsa/dcsa-hub.service.js";
import { DcsaEblService } from "../services/dcsa/dcsa-ebl.service.js";

const dcsaEventSchema = z.object({
  eventId: z.string().optional(),
  eventType: z.enum(["EQUIPMENT", "TRANSPORT", "SHIPMENT"]),
  eventClassifierCode: z.enum(["ACT", "EST", "PLN"]).default("ACT"),
  eventDateTime: z.string(),
  eventTypeCode: z.string(),
  carrierBookingReference: z.string().optional(),
  transportDocumentReference: z.string().optional(),
  equipmentReference: z.string().optional(),
  location: z
    .object({
      unLocationCode: z.string(),
      locationName: z.string().optional(),
      facilityCode: z.string().optional(),
    })
    .optional(),
  vessel: z
    .object({
      vesselIMONumber: z.string().optional(),
      vesselName: z.string(),
    })
    .optional(),
  carrierVoyageNumber: z.string().optional(),
  sealNumber: z.string().optional(),
  disruptionReason: z.string().optional(),
  delayHours: z.number().optional(),
});

const subscriptionSchema = z.object({
  carrierCode: z.string().min(2),
  callbackUrl: z.string().url(),
  secretToken: z.string().optional(),
  eventTypeFilters: z.array(z.string()).optional(),
  bookingReference: z.string().optional(),
  equipmentReference: z.string().optional(),
});

const issueEblSchema = z.object({
  shipmentId: z.string().min(1),
  documentReference: z.string().min(1),
  transportDocumentTypeCode: z.enum(["BOL", "SWB"]).optional(),
  isToOrder: z.boolean().optional(),
  carrierCode: z.string().min(2),
  carrierName: z.string().min(2),
  shipper: z.object({
    name: z.string().min(1),
    address: z.string().optional(),
    countryCode: z.string().optional(),
    email: z.string().optional(),
  }),
  consignee: z.object({
    name: z.string().min(1),
    address: z.string().optional(),
    countryCode: z.string().optional(),
    email: z.string().optional(),
  }),
  notifyParty: z
    .object({
      name: z.string(),
      address: z.string().optional(),
    })
    .optional(),
  portOfLoading: z.string().min(2),
  portOfDischarge: z.string().min(2),
  placeOfReceipt: z.string().optional(),
  placeOfDelivery: z.string().optional(),
  vesselName: z.string().min(2),
  voyageNumber: z.string().min(1),
  cargoItems: z
    .array(
      z.object({
        description: z.string(),
        grossWeightKg: z.number(),
        volumeCbm: z.number(),
        hsCode: z.string().optional(),
        containerNumber: z.string(),
      }),
    )
    .optional(),
  numberOfPackages: z.number().default(1),
  freightPaymentTerms: z.enum(["PREPAID", "COLLECT"]).optional(),
  signerName: z.string().min(1),
  signerTitle: z.string().optional(),
  details: z.string().optional(),
});

const transferEblSchema = z.object({
  toParty: z.string().min(1),
  toRole: z.enum(["SHIPPER", "BANK", "CONSIGNEE", "CARRIER"]),
  transferType: z
    .enum([
      "ORIGINAL_ISSUE",
      "PLEDGE_TO_BANK",
      "SPECIAL_ENDORSEMENT",
      "SURRENDER_FOR_RELEASE",
      "VOID_RECORD",
    ])
    .optional(),
  signerName: z.string().min(1),
  signerTitle: z.string().optional(),
  details: z.string().optional(),
});

const surrenderEblSchema = z.object({
  carrierName: z.string().optional(),
  signerName: z.string().min(1),
  notes: z.string().optional(),
});

export const dcsaRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Ingest DCSA 3.0 Telemetry Event (from Ocean Carrier Webhook or Terminal)
   */
  fastify.post("/events", async (request, reply) => {
    try {
      const parsed = dcsaEventSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: "Invalid DCSA event payload",
          details: parsed.error.issues,
        });
      }

      const sigHeader =
        (request.headers["x-dcsa-signature"] as string) ||
        (request.headers["dcsa-signature"] as string) ||
        undefined;

      const carrierCode =
        (request.headers["x-carrier-code"] as string) || undefined;
      const rawPayload = JSON.stringify(request.body);

      const result = await DcsaHubService.processEvent(parsed.data, {
        rawPayload,
        signatureHeader: sigHeader,
        carrierCode,
        skipSignatureCheck: !sigHeader,
      });

      return reply.status(201).send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to process DCSA event",
      });
    }
  });

  /**
   * Query historical DCSA telemetry event ledger
   */
  fastify.get("/events", async (request, reply) => {
    try {
      const query = request.query as { limit?: string };
      const limit = query.limit ? parseInt(query.limit, 10) : 50;
      const events = await DcsaHubService.listEvents(limit);

      return reply.send({
        success: true,
        data: events,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to list DCSA events",
      });
    }
  });

  /**
   * Create a Webhook Subscription (DCSA Event Subscriptions API v3)
   */
  fastify.post("/event-subscriptions", async (request, reply) => {
    try {
      const parsed = subscriptionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: "Invalid subscription payload",
          details: parsed.error.issues,
        });
      }

      const subscription = await DcsaHubService.createSubscription(parsed.data);

      return reply.status(201).send({
        success: true,
        data: subscription,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to create DCSA subscription",
      });
    }
  });

  /**
   * Query registered DCSA webhook subscriptions
   */
  fastify.get("/event-subscriptions", async (_request, reply) => {
    try {
      const subscriptions = await DcsaHubService.listSubscriptions();
      return reply.send({
        success: true,
        data: subscriptions,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to list DCSA subscriptions",
      });
    }
  });

  /**
   * Interactive Simulator: Trigger realistic carrier event with HMAC signature
   */
  fastify.post("/simulate-event", async (request, reply) => {
    try {
      const body = (request.body || {}) as {
        carrierCode?: "MSCU" | "MAEU" | "CMDU" | "HLCU";
        eventType?: DcsaEventType;
        eventTypeCode?: string;
        bookingReference?: string;
        containerNumber?: string;
        locode?: string;
        isDisruption?: boolean;
        disruptionReason?: string;
      };

      const result = await DcsaHubService.simulateCarrierEvent({
        carrierCode: body.carrierCode || "MSCU",
        eventType: body.eventType || "EQUIPMENT",
        eventTypeCode: body.eventTypeCode || "LOAD",
        bookingReference: body.bookingReference,
        containerNumber: body.containerNumber,
        locode: body.locode,
        isDisruption: body.isDisruption,
        disruptionReason: body.disruptionReason,
      });

      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to simulate DCSA carrier event",
      });
    }
  });

  // ==========================================================================
  // DCSA e-BL v3.0 Maritime Lifecycle & UNCITRAL MLETR Endpoints
  // ==========================================================================

  /**
   * POST /api/dcsa/ebl/issue
   * Issue a canonical DCSA 3.0 Electronic Bill of Lading
   */
  fastify.post("/ebl/issue", async (request, reply) => {
    try {
      const parsed = issueEblSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: "Invalid DCSA e-BL payload",
          details: parsed.error.issues,
        });
      }

      const result = await DcsaEblService.issueEbl(parsed.data);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to issue DCSA e-BL",
      });
    }
  });

  /**
   * GET /api/dcsa/ebl
   * List transferable electronic Bills of Lading
   */
  fastify.get("/ebl", async (request, reply) => {
    try {
      const query = request.query as { shipmentId?: string };
      const ebls = await DcsaEblService.listEbls(query.shipmentId);
      return reply.send({
        success: true,
        count: ebls.length,
        data: ebls,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to list DCSA e-BLs",
      });
    }
  });

  /**
   * GET /api/dcsa/ebl/:id
   * Get single e-BL with endorsement ledger history
   */
  fastify.get("/ebl/:id", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const ebl = await DcsaEblService.getEbl(params.id);
      if (!ebl) {
        return reply.status(404).send({
          success: false,
          error: `DCSA e-BL '${params.id}' not found`,
        });
      }
      return reply.send({
        success: true,
        data: ebl,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to get DCSA e-BL",
      });
    }
  });

  /**
   * POST /api/dcsa/ebl/:id/transfer
   * Transfer title of property to a new legitimate holder
   */
  fastify.post("/ebl/:id/transfer", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const parsed = transferEblSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: "Invalid transfer payload",
          details: parsed.error.issues,
        });
      }

      const result = await DcsaEblService.transferEbl(params.id, {
        recordId: params.id,
        ...parsed.data,
      });
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to transfer DCSA e-BL title",
      });
    }
  });

  /**
   * POST /api/dcsa/ebl/:id/endorse
   * Endorse e-BL (alias for special endorsement or bank pledge)
   */
  fastify.post("/ebl/:id/endorse", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const parsed = transferEblSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: "Invalid endorsement payload",
          details: parsed.error.issues,
        });
      }

      const result = await DcsaEblService.endorseEbl(params.id, {
        recordId: params.id,
        ...parsed.data,
      });
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to endorse DCSA e-BL",
      });
    }
  });

  /**
   * POST /api/dcsa/ebl/:id/surrender
   * Surrender e-BL to ocean carrier to authorize cargo release
   */
  fastify.post("/ebl/:id/surrender", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const parsed = surrenderEblSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: "Invalid surrender payload",
          details: parsed.error.issues,
        });
      }

      const result = await DcsaEblService.surrenderEbl(params.id, {
        recordId: params.id,
        ...parsed.data,
      });
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to surrender DCSA e-BL",
      });
    }
  });

  /**
   * GET /api/dcsa/ebl/:id/verify
   * Verify cryptographic hash chain integrity of the endorsements ledger
   */
  fastify.get("/ebl/:id/verify", async (request, reply) => {
    try {
      const params = request.params as { id: string };
      const result = await DcsaEblService.verifyEblChain(params.id);
      return reply.send({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: err.message || "Failed to verify DCSA e-BL chain",
      });
    }
  });
};

export default dcsaRoutes;
