import crypto from "crypto";
import { db } from "../../db/index.js";
import {
  ediInterchanges,
  ediMessages,
  ediPartners,
  shipments,
} from "../../db/schema/index.js";
import { eq, desc } from "drizzle-orm";
import { EdiTokenizer, EdiDocumentAST } from "./edi-tokenizer.js";
import { EdifactService, EdifactIftminInstruction } from "./edifact.service.js";
import { EdifactDesadvService } from "./edifact-desadv.service.js";
import { EdifactIftstaService } from "./edifact-iftsta.service.js";
import {
  X12Service,
  X12LoadTenderInstruction,
  X12OceanShippingInstruction,
  X12OceanInvoice,
  X12OceanStatusEvent,
} from "./x12.service.js";
import { raiseOperationalException } from "../../scm/contexts/operational-intelligence/operational-exceptions.context.js";
import { ingestOperationalTrackingEvent } from "../../scm/contexts/tracking-events/tracking-events.context.js";
import { DEFAULT_OPERATOR_ACTOR } from "../../scm/kernel/primitives.js";
import { DomainEventBus } from "../../lib/events/domain-event-bus.js";
import { logger } from "../../config/logger.js";

const eventBus = new DomainEventBus();

export interface InboundProcessingResult {
  interchangeId: string;
  controlNumber: string;
  standard: "EDIFACT" | "ANSI_X12";
  senderId: string;
  receiverId: string;
  status: "APPLIED" | "ACKNOWLEDGED" | "FAILED";
  ackPayload: string;
  acknowledgment?: string;
  messagesProcessed: number;
  extractedMilestones: string[];
  exceptionsDetected: number;
  details: any[];
  events?: any[];
}

export class EdiDispatcherService {
  /**
   * Process an incoming raw EDI stream (from SFTP, AS2 gateway, or REST webhook)
   */
  public static async processInboundPayload(
    rawPayload: string,
  ): Promise<InboundProcessingResult> {
    const raw = (rawPayload || "").trim();
    if (!raw) {
      throw new Error("Empty EDI payload received.");
    }

    const standard = EdiTokenizer.detectStandard(raw);
    if (standard === "UNKNOWN") {
      throw new Error(
        "Unrecognized EDI format. Expected EDIFACT (UNA/UNB) or ANSI X12 (ISA).",
      );
    }

    const ast: EdiDocumentAST = EdiTokenizer.tokenize(raw);
    const interchangeId = `ic_${crypto.randomUUID().substring(0, 8)}`;
    const extractedMilestones: string[] = [];
    let exceptionsDetected = 0;
    const messageDetails: any[] = [];

    let senderId = "UNKNOWN";
    let receiverId = "ATLASLOG";
    let controlNumber = `CTRL-${Date.now()}`;
    let ackPayload = "";

    if (standard === "EDIFACT") {
      const isDesadv = ast.segments.some((s) => {
        if (s.tag !== "UNH") return false;
        const el = s.elements[1];
        if (!el) return false;
        if (typeof el === "string") return el.includes("DESADV");
        return (el as any).components?.some(
          (c: string) => c && c.includes("DESADV"),
        );
      });

      if (isDesadv) {
        const desadv = EdifactDesadvService.parse(ast);
        const unb = ast.segments.find((s) => s.tag === "UNB");
        if (unb) {
          const s = unb.elements[1];
          const r = unb.elements[2];
          senderId = typeof s === "object" ? (s as any).components?.[0] : s;
          receiverId = typeof r === "object" ? (r as any).components?.[0] : r;
          controlNumber = desadv.despatchAdviceNumber;
        }

        ackPayload = EdifactIftstaService.generateCONTRL(
          senderId,
          receiverId,
          controlNumber,
          "ACCEPTED",
        );

        const partner = await this.findPartnerBySender(senderId, "EDIFACT");

        await db.insert(ediInterchanges).values({
          id: interchangeId,
          partnerId: partner?.id,
          controlNumber,
          direction: "INBOUND",
          standard: "EDIFACT",
          senderId,
          receiverId,
          status: "APPLIED",
          rawPayload: raw,
          ackPayload,
          ackStatus: "ACCEPTED",
          processedAt: new Date(),
        });

        const msgId = `msg_${crypto.randomUUID().substring(0, 8)}`;
        extractedMilestones.push("DESPATCH_CONFIRMED");

        const matchedShipment = await this.matchShipment(
          desadv.orderReference,
          desadv.billOfLadingReference,
        );

        await db.insert(ediMessages).values({
          id: msgId,
          interchangeId,
          messageType: "DESADV",
          controlNumber,
          shipmentId: matchedShipment?.id,
          bookingReference: desadv.orderReference,
          status: "APPLIED",
          parsedContent: desadv,
          extractedMilestone: "DESPATCH_CONFIRMED",
          exceptionTriggered: false,
          processedAt: new Date(),
        });

        messageDetails.push(desadv);

        // Emit domain events
        await EdifactDesadvService.ingest(raw);

        return {
          interchangeId,
          controlNumber,
          standard: "EDIFACT",
          senderId,
          receiverId,
          status: "APPLIED",
          ackPayload,
          messagesProcessed: 1,
          extractedMilestones,
          exceptionsDetected: 0,
          details: messageDetails,
          events: messageDetails,
        };
      }

      const events = EdifactService.parseIFTSTA(ast);
      if (events.length > 0) {
        senderId = events[0].senderId;
        receiverId = events[0].receiverId;
        controlNumber = events[0].controlNumber;
      }
      ackPayload = EdifactService.generateCONTRL(
        controlNumber,
        senderId,
        receiverId,
        true,
      );

      // Match partner in DB if configured
      const partner = await this.findPartnerBySender(senderId, "EDIFACT");

      // Save interchange header
      await db.insert(ediInterchanges).values({
        id: interchangeId,
        partnerId: partner?.id,
        controlNumber,
        direction: "INBOUND",
        standard: "EDIFACT",
        senderId,
        receiverId,
        status: "APPLIED",
        rawPayload: raw,
        ackPayload,
        ackStatus: "ACCEPTED",
        processedAt: new Date(),
      });

      for (const ev of events) {
        const msgId = `msg_${crypto.randomUUID().substring(0, 8)}`;
        extractedMilestones.push(ev.milestone);
        if (ev.isException) exceptionsDetected++;

        // Attempt linking to shipment
        const matchedShipment = await this.matchShipment(
          ev.bookingReference,
          ev.billOfLading,
        );

        await db.insert(ediMessages).values({
          id: msgId,
          interchangeId,
          messageType: "IFTSTA",
          controlNumber: ev.controlNumber,
          shipmentId: matchedShipment?.id,
          bookingReference: ev.bookingReference,
          status: "APPLIED",
          parsedContent: ev,
          extractedMilestone: ev.milestone,
          exceptionTriggered: ev.isException,
          exceptionDetails: ev.exceptionReason,
          processedAt: new Date(),
        });

        // Dispatch domain events & update shipment if matched
        if (matchedShipment) {
          await this.advanceShipmentMilestone(matchedShipment.id, ev);
        }

        // Publish event to DomainEventBus
        await eventBus.publish(
          "edi:milestone-updated",
          matchedShipment?.id || interchangeId,
          {
            shipmentId: matchedShipment?.id,
            bookingReference: ev.bookingReference,
            carrier: ev.senderId,
            milestone: ev.milestone,
            statusCode: ev.statusCode,
            location: ev.locationName || ev.locationCode,
            isException: ev.isException,
            exceptionReason: ev.exceptionReason,
            eventTimestamp: ev.eventTimestamp,
          },
        );

        if (ev.isException) {
          await eventBus.publish(
            "edi:exception-detected",
            matchedShipment?.id || interchangeId,
            {
              shipmentId: matchedShipment?.id,
              bookingReference: ev.bookingReference,
              carrier: ev.senderId,
              exceptionCode: ev.statusCode,
              reason: ev.exceptionReason || "Operational carrier exception",
              occurredAt: ev.eventTimestamp,
            },
          );
        }

        messageDetails.push(ev);
      }
    } else {
      // ANSI X12
      const stSeg = ast.segments.find((s) => s.tag === "ST");
      const transactionSetId =
        stSeg && stSeg.elements[0] ? stSeg.elements[0].toString() : "214";
      const is315 = transactionSetId === "315";
      const events = is315
        ? X12Service.parse315(ast)
        : X12Service.parse214(ast);
      if (events.length > 0) {
        senderId = events[0].senderId;
        receiverId = events[0].receiverId;
        controlNumber = events[0].controlNumber;
      }
      ackPayload = X12Service.generate997(
        controlNumber,
        senderId,
        receiverId,
        true,
      );

      const partner = await this.findPartnerBySender(senderId, "ANSI_X12");

      await db.insert(ediInterchanges).values({
        id: interchangeId,
        partnerId: partner?.id,
        controlNumber,
        direction: "INBOUND",
        standard: "ANSI_X12",
        senderId,
        receiverId,
        status: "APPLIED",
        rawPayload: raw,
        ackPayload,
        ackStatus: "ACCEPTED",
        processedAt: new Date(),
      });

      for (const ev of events) {
        const msgId = `msg_${crypto.randomUUID().substring(0, 8)}`;
        extractedMilestones.push(ev.milestone);
        if (ev.isException) exceptionsDetected++;

        const refNumber =
          "referenceNumber" in ev
            ? ev.referenceNumber
            : (ev as any).billOfLadingNumber;
        const matchedShipment = await this.matchShipment(
          ev.bookingReference,
          refNumber,
        );

        await db.insert(ediMessages).values({
          id: msgId,
          interchangeId,
          messageType: is315 ? "315" : "214",
          controlNumber: ev.controlNumber,
          shipmentId: matchedShipment?.id,
          bookingReference: ev.bookingReference,
          status: "APPLIED",
          parsedContent: ev,
          extractedMilestone: ev.milestone,
          exceptionTriggered: ev.isException,
          exceptionDetails: ev.exceptionReason,
          processedAt: new Date(),
        });

        // SCM Hybrid Risk Integration: trigger blocking operational exception if rollover or customs hold
        if (matchedShipment && ev.isException) {
          try {
            await raiseOperationalException(
              {
                shipmentId: matchedShipment.id,
                category:
                  ev.milestone === "CUSTOMS_HOLD"
                    ? "SECURITY_AUDIT_HOLD"
                    : "CARRIER_ROLL",
                severity: "CRITICAL",
                title: `Disrupción Marítima EDI ${is315 ? "315" : "214"}: ${ev.milestone}`,
                description:
                  ev.exceptionReason ||
                  `Naviera notifica evento crítico ${ev.milestone} para ${ev.bookingReference || "embarque"}.`,
                isBlocking: true,
                assignedTeam: "CARRIER_OPERATIONS",
              },
              {
                ...DEFAULT_OPERATOR_ACTOR,
                userId: "usr_edi_gateway",
              },
            );
          } catch (_err) {}
        }

        // SCM Tracking Event Ingestion
        if (matchedShipment) {
          try {
            let trackingEventCode:
              | "GATE_IN"
              | "VGM_VERIFIED"
              | "VESSEL_DEPARTED"
              | "ETA_UPDATED"
              | "CUSTOMS_HOLD"
              | "CUSTOMS_RELEASED"
              | "TEMP_EXCURSION"
              | "DELIVERED" = "ETA_UPDATED";
            if (ev.milestone === "VESSEL_DEPARTED")
              trackingEventCode = "VESSEL_DEPARTED";
            else if (ev.milestone === "CUSTOMS_HOLD")
              trackingEventCode = "CUSTOMS_HOLD";
            else if (ev.milestone === "GATE_IN" || ev.milestone === "PICKED_UP")
              trackingEventCode = "GATE_IN";
            else if (ev.milestone === "DELIVERED")
              trackingEventCode = "DELIVERED";

            let scmMilestoneCode:
              | "VGM_CUTOFF"
              | "ETD_POL"
              | "TRANSSHIPMENT"
              | "ETA_POD"
              | "CUSTOMS_CLEARANCE"
              | "POD_DELIVERY" = "ETD_POL";
            if (ev.milestone === "VESSEL_DEPARTED")
              scmMilestoneCode = "ETD_POL";
            else if (ev.milestone === "CUSTOMS_HOLD")
              scmMilestoneCode = "CUSTOMS_CLEARANCE";
            else if (
              ev.milestone === "VESSEL_ARRIVED" ||
              ev.milestone === "CONTAINER_DISCHARGED"
            )
              scmMilestoneCode = "ETA_POD";
            else if (ev.milestone === "DELIVERED")
              scmMilestoneCode = "POD_DELIVERY";

            await ingestOperationalTrackingEvent(
              {
                shipmentId: matchedShipment.id,
                eventCode: trackingEventCode,
                milestoneCode: scmMilestoneCode,
                locationLocode: (ev as any).portLocode || "ESVLC",
                sourceType: "CARRIER_DCSA_EDI",
                timestampKind: "ACTUAL",
                eventTimestamp: ev.eventTimestamp,
                summary: `Transmisión EDI ${is315 ? "315" : "214"} - Hito: ${ev.milestone} (${ev.statusCode})`,
              },
              {
                ...DEFAULT_OPERATOR_ACTOR,
                userId: "usr_edi_gateway",
              },
            );
          } catch (_err) {}
        }

        const locCity = "locationCity" in ev ? ev.locationCity : undefined;
        const locState = "locationState" in ev ? ev.locationState : undefined;
        const locCountry =
          "locationCountry" in ev ? ev.locationCountry : (ev as any).portLocode;
        const locationName = [locCity, locState, locCountry]
          .filter(Boolean)
          .join(", ");

        if (matchedShipment) {
          await this.advanceShipmentMilestone(matchedShipment.id, {
            ...ev,
            locationName,
          });
        }

        await eventBus.publish(
          "edi:milestone-updated",
          matchedShipment?.id || interchangeId,
          {
            shipmentId: matchedShipment?.id,
            bookingReference: ev.bookingReference,
            carrier: ev.senderId,
            milestone: ev.milestone,
            statusCode: ev.statusCode,
            location: locationName,
            isException: ev.isException,
            exceptionReason: ev.exceptionReason,
            eventTimestamp: ev.eventTimestamp,
          },
        );

        if (ev.isException) {
          await eventBus.publish(
            "edi:exception-detected",
            matchedShipment?.id || interchangeId,
            {
              shipmentId: matchedShipment?.id,
              bookingReference: ev.bookingReference,
              carrier: ev.senderId,
              exceptionCode: ev.statusCode,
              reason: ev.exceptionReason || "Carrier transport exception",
              occurredAt: ev.eventTimestamp,
            },
          );
        }

        messageDetails.push(ev);
      }
    }

    // Publish high-level interchange event
    await eventBus.publish("edi:interchange-processed", interchangeId, {
      interchangeId,
      controlNumber,
      standard,
      direction: "INBOUND",
      senderId,
      receiverId,
      status: "APPLIED",
      messagesCount: messageDetails.length,
    });

    return {
      interchangeId,
      controlNumber,
      standard,
      senderId,
      receiverId,
      status: "APPLIED",
      ackPayload,
      acknowledgment: ackPayload,
      messagesProcessed: messageDetails.length,
      extractedMilestones,
      exceptionsDetected,
      details: messageDetails,
      events: messageDetails,
    };
  }

  /**
   * Generate and persist an outbound EDI message (e.g. IFTMIN or X12 204)
   */
  public static async generateOutbound(options: {
    format: "IFTMIN" | "204" | "304" | "310";
    bookingReference: string;
    partnerId?: string;
    senderId?: string;
    receiverId?: string;
    instructionData: any;
  }): Promise<{
    interchangeId: string;
    controlNumber: string;
    rawPayload: string;
    format: string;
  }> {
    const interchangeId = `ic_out_${crypto.randomUUID().substring(0, 8)}`;
    const controlNum = Math.floor(100000 + Math.random() * 900000).toString();
    let rawPayload = "";
    let standard: "EDIFACT" | "ANSI_X12" = "EDIFACT";

    if (options.format === "IFTMIN") {
      standard = "EDIFACT";
      rawPayload = EdifactService.generateIFTMIN(
        options.instructionData as EdifactIftminInstruction,
        options.senderId || "ATLASLOG",
        options.receiverId || "MAERSKLINE",
      );
    } else if (options.format === "304") {
      standard = "ANSI_X12";
      rawPayload = X12Service.generate304(
        options.instructionData as X12OceanShippingInstruction,
        options.senderId || "ATLASLOG",
        options.receiverId || "MAERSKLINE",
      );
    } else if (options.format === "310") {
      standard = "ANSI_X12";
      rawPayload = X12Service.generate310(
        options.instructionData as X12OceanInvoice,
        options.senderId || "MAERSKLINE",
        options.receiverId || "ATLASLOG",
      );
    } else {
      standard = "ANSI_X12";
      rawPayload = X12Service.generate204(
        options.instructionData as X12LoadTenderInstruction,
        options.senderId || "ATLASLOG",
        options.receiverId || "KNIGHTSWIFT",
      );
    }

    await db.insert(ediInterchanges).values({
      id: interchangeId,
      partnerId: options.partnerId,
      controlNumber: controlNum,
      direction: "OUTBOUND",
      standard,
      senderId: options.senderId || "ATLASLOG",
      receiverId: options.receiverId || "CARRIER_EDI",
      status: "ACKNOWLEDGED",
      rawPayload,
      ackStatus: "ACCEPTED",
      processedAt: new Date(),
    });

    await db.insert(ediMessages).values({
      id: `msg_out_${crypto.randomUUID().substring(0, 8)}`,
      interchangeId,
      messageType: options.format,
      controlNumber: controlNum,
      bookingReference: options.bookingReference,
      status: "APPLIED",
      parsedContent: options.instructionData,
      extractedMilestone: "DISPATCHED",
      exceptionTriggered: false,
      processedAt: new Date(),
    });

    await eventBus.publish("edi:interchange-processed", interchangeId, {
      interchangeId,
      controlNumber: controlNum,
      standard,
      direction: "OUTBOUND",
      senderId: options.senderId || "ATLASLOG",
      receiverId: options.receiverId || "CARRIER_EDI",
      status: "ACKNOWLEDGED",
      messagesCount: 1,
    });

    return {
      interchangeId,
      controlNumber: controlNum,
      rawPayload,
      format: options.format,
    };
  }

  /**
   * Helper to query historical interchanges
   */
  public static async listInterchanges(limit: number = 50, offset: number = 0) {
    return db
      .select()
      .from(ediInterchanges)
      .orderBy(desc(ediInterchanges.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Helper to query configured partners
   */
  public static async listPartners() {
    return db
      .select()
      .from(ediPartners)
      .where(eq(ediPartners.isDeleted, false));
  }

  /**
   * Advance shipment status in DB based on received milestone
   */
  private static async advanceShipmentMilestone(shipmentId: string, ev: any) {
    try {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (ev.milestone === "VESSEL_DEPARTED" || ev.milestone === "IN_TRANSIT") {
        updateData.status = "IN_TRANSIT";
      } else if (ev.milestone === "ARRIVED_AT_PORT") {
        updateData.status = "AT_PORT";
      } else if (ev.milestone === "CUSTOMS_HOLD") {
        updateData.clearanceStatus = "HOLD";
      } else if (ev.milestone === "DELIVERED") {
        updateData.status = "DELIVERED";
      }

      if (ev.vesselName) updateData.vesselName = ev.vesselName;
      if (ev.voyageNumber) updateData.voyageNumber = ev.voyageNumber;

      await db
        .update(shipments)
        .set(updateData)
        .where(eq(shipments.id, shipmentId));
    } catch (err) {
      logger.warn(
        { shipmentId, err },
        "Could not auto-advance shipment milestone",
      );
    }
  }

  private static async matchShipment(
    bookingRef?: string,
    trackingRef?: string,
  ) {
    if (!bookingRef && !trackingRef) return null;
    try {
      if (trackingRef) {
        const found = await db
          .select()
          .from(shipments)
          .where(eq(shipments.trackingNumber, trackingRef))
          .limit(1);
        if (found.length > 0) return found[0];
      }
      if (bookingRef) {
        const found = await db
          .select()
          .from(shipments)
          .where(eq(shipments.id, bookingRef))
          .limit(1);
        if (found.length > 0) return found[0];
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  private static async findPartnerBySender(
    senderId: string,
    standard: "EDIFACT" | "ANSI_X12",
  ) {
    try {
      const found = await db
        .select()
        .from(ediPartners)
        .where(eq(ediPartners.senderId, senderId))
        .limit(1);
      return found[0] || null;
    } catch {
      return null;
    }
  }
}
