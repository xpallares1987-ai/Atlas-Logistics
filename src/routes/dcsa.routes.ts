import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  DcsaHubService,
  DcsaEventType,
  DcsaEventClassifierCode,
  DcsaEventPayload,
} from "../services/dcsa/dcsa-hub.service.js";

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
};

export default dcsaRoutes;
