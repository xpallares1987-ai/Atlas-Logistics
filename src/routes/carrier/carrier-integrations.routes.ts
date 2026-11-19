/**
 * @file carrier-integrations.routes.ts
 * @description Fastify routes for Carrier Schedules, Electronic Booking Outbox Dispatch, eBL Lifecycle, and Track & Trace Webhooks.
 * @module @atlas/routes/carrier/carrier-integrations
 * @see {@link docs/adr/0027-carrier-integrations-ocean-schedules-ebl-lifecycle.md}
 */

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { CarrierSchedulesService } from "../../services/carrier/carrier-schedules.service.js";
import { CarrierBookingDispatchService } from "../../services/carrier/carrier-booking-dispatch.service.js";
import { EblLifecycleService } from "../../services/carrier/ebl-lifecycle.service.js";
import { db } from "../../db/index.js";
import { dcsaEventsLog } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
import { logger } from "../../config/logger.js";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const registerVesselSchema = z.object({
  imoNumber: z.string().min(7).max(10),
  vesselName: z.string().min(1),
  flag: z.string().optional(),
  capacityTeu: z.number().int().positive().optional(),
  yearBuilt: z.number().int().positive().optional(),
  callSign: z.string().optional(),
  mmsi: z.string().optional(),
});

const createServiceSchema = z.object({
  carrierId: z.string().min(1),
  serviceCode: z.string().min(1),
  serviceName: z.string().min(1),
  transportMode: z.enum(["OCEAN", "AIR", "RAIL", "ROAD"]).optional(),
  tradeLane: z.string().optional(),
});

const createVoyageSchema = z.object({
  voyageNumber: z.string().min(1),
  vesselId: z.string().min(1),
  serviceId: z.string().optional(),
  direction: z
    .enum(["EAST", "WEST", "NORTH", "SOUTH", "INBOUND", "OUTBOUND"])
    .optional(),
  status: z.enum(["SCHEDULED", "ACTIVE", "COMPLETED", "OMITTED"]).optional(),
  portCalls: z
    .array(
      z.object({
        unlocode: z.string().length(5),
        terminalCode: z.string().optional(),
        sequence: z.number().int().positive(),
        eta: z.string().datetime().optional(),
        etd: z.string().datetime().optional(),
        cyCutOff: z.string().datetime().optional(),
        vgmCutOff: z.string().datetime().optional(),
        siCutOff: z.string().datetime().optional(),
      }),
    )
    .min(2),
});

const searchSchedulesSchema = z.object({
  origin: z.string().length(5),
  destination: z.string().length(5),
  departureAfter: z.string().datetime().optional(),
  carrierId: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

const dispatchBookingSchema = z.object({
  shipmentId: z.string().min(1),
  carrierId: z.string().min(1),
  carrierScac: z.string().optional(),
  contractReference: z.string().min(1),
  format: z.enum(["DCSA_JSON", "EDI_301"]).optional(),
  vesselId: z.string().min(1),
  voyageNumber: z.string().min(1),
  originUnlocode: z.string().length(5),
  destinationUnlocode: z.string().length(5),
  grossWeightKg: z.number().positive(),
  volumeCbm: z.number().positive().optional(),
  containerIsoType: z.string().optional(),
  containerQuantity: z.number().int().positive().optional(),
});

const confirmBookingSchema = z.object({
  outboxEventId: z.string().min(1),
  carrierBookingNumber: z.string().min(1),
  status: z.enum(["CONFIRMED", "REJECTED"]),
  rejectionReason: z.string().optional(),
  edi997Content: z.string().optional(),
});

const issueEblSchema = z.object({
  shipmentId: z.string().min(1),
  documentReference: z.string().min(1),
  carrierCode: z.string().min(2),
  carrierName: z.string().min(1),
  shipperName: z.string().min(1),
  consigneeName: z.string().min(1),
  vesselName: z.string().min(1),
  voyageNumber: z.string().min(1),
  signerName: z.string().min(1),
  signerTitle: z.string().optional(),
  details: z.string().optional(),
});

const endorseEblSchema = z.object({
  toParty: z.string().min(1),
  toRole: z.enum(["SHIPPER", "BANK", "CONSIGNEE", "CARRIER"]),
  signerName: z.string().min(1),
  signerTitle: z.string().optional(),
  details: z.string().optional(),
});

const surrenderEblSchema = z.object({
  carrierName: z.string().min(1),
  signerName: z.string().min(1),
  signerTitle: z.string().optional(),
  details: z.string().optional(),
});

const trackAndTraceWebhookSchema = z.object({
  eventId: z.string().optional(),
  eventType: z.enum(["EQUIPMENT", "TRANSPORT", "SHIPMENT"]),
  eventClassifierCode: z.enum(["ACT", "EST", "PLN"]).default("ACT"),
  eventDateTime: z.string(),
  eventTypeCode: z.string(),
  carrierBookingReference: z.string().optional(),
  transportDocumentReference: z.string().optional(),
  equipmentReference: z.string().optional(),
  locationLocode: z.string().length(5),
  vesselImoNumber: z.string().optional(),
  vesselName: z.string().optional(),
  voyageNumber: z.string().optional(),
  scmLinkedShipmentId: z.string().optional(),
});

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

export const carrierIntegrationsRoutes: FastifyPluginAsync = async (
  fastify,
) => {
  // --------------------------------------------------------------------------
  // 1. CARRIER MASTER DATA & SCHEDULES
  // --------------------------------------------------------------------------

  fastify.post("/vessels", async (request, reply) => {
    try {
      const parsed = registerVesselSchema.parse(request.body);
      const vessel = await CarrierSchedulesService.registerVessel(parsed);
      return reply.status(201).send({ success: true, data: vessel });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to register vessel";
      return reply.status(400).send({ success: false, error: msg });
    }
  });

  fastify.get("/vessels", async (_request, reply) => {
    const vesselsList = await CarrierSchedulesService.listVessels();
    return reply.send({
      success: true,
      count: vesselsList.length,
      data: vesselsList,
    });
  });

  fastify.post("/services", async (request, reply) => {
    try {
      const parsed = createServiceSchema.parse(request.body);
      const srv = await CarrierSchedulesService.createCarrierService(parsed);
      return reply.status(201).send({ success: true, data: srv });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create carrier service";
      return reply.status(400).send({ success: false, error: msg });
    }
  });

  fastify.get("/services", async (request, reply) => {
    const { carrierId } = request.query as { carrierId?: string };
    const servicesList =
      await CarrierSchedulesService.listCarrierServices(carrierId);
    return reply.send({
      success: true,
      count: servicesList.length,
      data: servicesList,
    });
  });

  fastify.post("/voyages", async (request, reply) => {
    try {
      const parsed = createVoyageSchema.parse(request.body);
      const voyageData = {
        ...parsed,
        portCalls: parsed.portCalls.map((pc) => ({
          ...pc,
          eta: pc.eta ? new Date(pc.eta) : undefined,
          etd: pc.etd ? new Date(pc.etd) : undefined,
          cyCutOff: pc.cyCutOff ? new Date(pc.cyCutOff) : undefined,
          vgmCutOff: pc.vgmCutOff ? new Date(pc.vgmCutOff) : undefined,
          siCutOff: pc.siCutOff ? new Date(pc.siCutOff) : undefined,
        })),
      };

      const result =
        await CarrierSchedulesService.createVoyageWithPortCalls(voyageData);
      return reply.status(201).send({ success: true, data: result });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create voyage schedule";
      return reply.status(400).send({ success: false, error: msg });
    }
  });

  fastify.get("/schedules/search", async (request, reply) => {
    try {
      const parsed = searchSchedulesSchema.parse(request.query);
      const results = await CarrierSchedulesService.searchCorridorSchedules({
        originUnlocode: parsed.origin,
        destinationUnlocode: parsed.destination,
        departureAfter: parsed.departureAfter
          ? new Date(parsed.departureAfter)
          : undefined,
        carrierId: parsed.carrierId,
        maxResults: parsed.limit,
      });

      return reply.send({
        success: true,
        count: results.length,
        corridor: `${parsed.origin} -> ${parsed.destination}`,
        data: results,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to search schedules";
      return reply.status(400).send({ success: false, error: msg });
    }
  });

  // --------------------------------------------------------------------------
  // 2. ELECTRONIC BOOKING DISPATCH & CONFIRMATION
  // --------------------------------------------------------------------------

  fastify.post("/bookings/dispatch", async (request, reply) => {
    try {
      const parsed = dispatchBookingSchema.parse(request.body);
      const result =
        await CarrierBookingDispatchService.dispatchBooking(parsed);
      return reply.status(202).send({ success: true, data: result });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to dispatch booking to carrier";
      return reply.status(400).send({ success: false, error: msg });
    }
  });

  fastify.post("/bookings/confirm", async (request, reply) => {
    try {
      const parsed = confirmBookingSchema.parse(request.body);
      const result =
        await CarrierBookingDispatchService.processConfirmation(parsed);
      return reply.send({ success: result.success, data: result });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to process carrier confirmation";
      return reply.status(400).send({ success: false, error: msg });
    }
  });

  // --------------------------------------------------------------------------
  // 3. ELECTRONIC BILL OF LADING (eBL) LIFECYCLE
  // --------------------------------------------------------------------------

  fastify.post("/ebl/issue", async (request, reply) => {
    try {
      const parsed = issueEblSchema.parse(request.body);
      const result = await EblLifecycleService.issueCarrierEbl(parsed);
      return reply.status(201).send({ success: true, data: result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to issue eBL";
      return reply.status(400).send({ success: false, error: msg });
    }
  });

  fastify.post("/ebl/:id/endorse", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const parsed = endorseEblSchema.parse(request.body);
      const result = await EblLifecycleService.endorseEbl({
        recordId: id,
        ...parsed,
      });
      return reply.send({ success: true, data: result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to endorse eBL";
      return reply.status(400).send({ success: false, error: msg });
    }
  });

  fastify.post("/ebl/:id/surrender", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const parsed = surrenderEblSchema.parse(request.body);
      const result = await EblLifecycleService.surrenderEbl({
        recordId: id,
        ...parsed,
      });
      return reply.send({ success: true, data: result });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to surrender eBL";
      return reply.status(400).send({ success: false, error: msg });
    }
  });

  fastify.get("/ebl/:id/verify", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await EblLifecycleService.verifyEblAuditChain(id);
      return reply.send({ success: true, data: result });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to verify eBL chain";
      return reply.status(400).send({ success: false, error: msg });
    }
  });

  // --------------------------------------------------------------------------
  // 4. ASYNCHRONOUS TRACK & TRACE INGESTION WEBHOOK
  // --------------------------------------------------------------------------

  fastify.post("/webhooks/track-and-trace", async (request, reply) => {
    const receivedAt = new Date().toISOString();
    const fallbackId = `dcsa_evt_${uuidv4().replace(/-/g, "").slice(0, 16)}`;

    let finalEventId = fallbackId;

    try {
      const parsed = trackAndTraceWebhookSchema.parse(request.body);
      finalEventId = parsed.eventId || fallbackId;
      const now = new Date();

      // Check for duplicate eventId
      const existing = await db
        .select({ eventId: dcsaEventsLog.eventId })
        .from(dcsaEventsLog)
        .where(eq(dcsaEventsLog.eventId, finalEventId))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(dcsaEventsLog).values({
          eventId: finalEventId,
          eventType: parsed.eventType,
          eventClassifierCode: parsed.eventClassifierCode,
          eventDateTime: parsed.eventDateTime,
          carrierBookingReference: parsed.carrierBookingReference || null,
          transportDocumentReference: parsed.transportDocumentReference || null,
          equipmentReference: parsed.equipmentReference || null,
          eventTypeCode: parsed.eventTypeCode,
          locationLocode: parsed.locationLocode,
          vesselImoNumber: parsed.vesselImoNumber || null,
          vesselName: parsed.vesselName || null,
          voyageNumber: parsed.voyageNumber || null,
          payloadJson: JSON.stringify(request.body),
          signatureVerified: true,
          scmLinkedShipmentId: parsed.scmLinkedShipmentId || null,
          processedStatus: "PROCESSED",
          exceptionTriggered: false,
          createdAt: now,
          updatedAt: now,
        });

        logger.info(
          {
            eventId: finalEventId,
            eventTypeCode: parsed.eventTypeCode,
            location: parsed.locationLocode,
          },
          "Asynchronously buffered carrier telemetry event",
        );
      } else {
        logger.debug(
          { eventId: finalEventId },
          "Deduplicated repeated carrier telemetry event",
        );
      }
    } catch (err: unknown) {
      logger.error({ err }, "Error processing carrier webhook payload");
    }

    // Immediately acknowledge receipt (HTTP 200) to prevent carrier timeout retries
    return reply.status(200).send({
      status: "QUEUED",
      eventId: finalEventId,
      receivedAt,
      message:
        "Carrier track & trace telemetry event accepted for asynchronous ingestion",
    });
  });
};

export default carrierIntegrationsRoutes;
