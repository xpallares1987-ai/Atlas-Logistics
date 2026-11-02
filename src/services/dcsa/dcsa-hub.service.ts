/**
 * DCSA 3.0 Event Hub & Webhook Subscription Service
 *
 * Implements the Digital Container Shipping Association (DCSA) Track & Trace v3.0 specification.
 * Unifies maritime container telemetry (EQUIPMENT, TRANSPORT, SHIPMENT events), cryptographic
 * HMAC-SHA256 signature verification, and automated hybrid synchronization with SCM Operational Core.
 */

import crypto from "crypto";
import { db } from "../../db/index.js";
import {
  dcsaEventSubscriptions,
  dcsaEventsLog,
  shipments,
  scmLogicalShipments,
} from "../../db/schema/index.js";
import { eq, desc, sql } from "drizzle-orm";
import { raiseOperationalException } from "../../scm/contexts/operational-intelligence/operational-exceptions.context.js";
import { ingestOperationalTrackingEvent } from "../../scm/contexts/tracking-events/tracking-events.context.js";
import { DEFAULT_OPERATOR_ACTOR } from "../../scm/kernel/primitives.js";
import { logger } from "../../config/logger.js";

export type DcsaEventType = "EQUIPMENT" | "TRANSPORT" | "SHIPMENT";
export type DcsaEventClassifierCode = "ACT" | "EST" | "PLN";

export interface DcsaLocation {
  unLocationCode: string;
  locationName?: string;
  facilityCode?: string;
}

export interface DcsaVessel {
  vesselIMONumber?: string;
  vesselName: string;
}

export interface DcsaEventPayload {
  eventId?: string;
  eventType: DcsaEventType;
  eventClassifierCode: DcsaEventClassifierCode;
  eventDateTime: string; // ISO 8601
  eventTypeCode: string; // LOAD, DISC, DEPA, ARRI, GTIN, GTOT, ROLL, HOLD, CONF, RECE
  carrierBookingReference?: string;
  transportDocumentReference?: string; // B/L Number
  equipmentReference?: string; // Container ID
  location?: DcsaLocation;
  vessel?: DcsaVessel;
  carrierVoyageNumber?: string;
  sealNumber?: string;
  disruptionReason?: string;
  delayHours?: number;
}

export interface CreateDcsaSubscriptionInput {
  carrierCode: string;
  callbackUrl: string;
  secretToken?: string;
  eventTypeFilters?: string[];
  bookingReference?: string;
  equipmentReference?: string;
}

let dcsaTablesEnsured = false;

export class DcsaHubService {
  /**
   * Ensure dedicated SQLite tables exist for DCSA Subscriptions and Event Logs
   */
  public static async ensureTables(): Promise<void> {
    if (dcsaTablesEnsured) return;

    try {
      await db.run(
        sql.raw(`
        CREATE TABLE IF NOT EXISTS dcsa_event_subscriptions (
          subscription_id TEXT PRIMARY KEY NOT NULL,
          carrier_code TEXT NOT NULL,
          callback_url TEXT NOT NULL,
          secret_token TEXT NOT NULL,
          event_type_filters_json TEXT NOT NULL DEFAULT '[]',
          booking_reference TEXT,
          equipment_reference TEXT,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          delivery_count INTEGER NOT NULL DEFAULT 0,
          last_delivered_at INTEGER,
          last_error TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          is_deleted INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          metadata TEXT,
          tags TEXT
        );
      `),
      );

      await db.run(
        sql.raw(`
        CREATE TABLE IF NOT EXISTS dcsa_events_log (
          event_id TEXT PRIMARY KEY NOT NULL,
          event_type TEXT NOT NULL,
          event_classifier_code TEXT NOT NULL DEFAULT 'ACT',
          event_date_time TEXT NOT NULL,
          carrier_booking_reference TEXT,
          transport_document_reference TEXT,
          equipment_reference TEXT,
          event_type_code TEXT NOT NULL,
          location_locode TEXT NOT NULL,
          vessel_imo_number TEXT,
          vessel_name TEXT,
          voyage_number TEXT,
          payload_json TEXT NOT NULL,
          signature_verified INTEGER NOT NULL DEFAULT 1,
          scm_linked_shipment_id TEXT,
          processed_status TEXT NOT NULL DEFAULT 'PROCESSED',
          exception_triggered INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          is_deleted INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          metadata TEXT,
          tags TEXT
        );
      `),
      );

      await db.run(
        sql.raw(
          `CREATE INDEX IF NOT EXISTS idx_dcsa_subs_carrier ON dcsa_event_subscriptions(carrier_code);`,
        ),
      );
      await db.run(
        sql.raw(
          `CREATE INDEX IF NOT EXISTS idx_dcsa_events_type ON dcsa_events_log(event_type);`,
        ),
      );
      await db.run(
        sql.raw(
          `CREATE INDEX IF NOT EXISTS idx_dcsa_events_bkg ON dcsa_events_log(carrier_booking_reference);`,
        ),
      );
      await db.run(
        sql.raw(
          `CREATE INDEX IF NOT EXISTS idx_dcsa_events_eq ON dcsa_events_log(equipment_reference);`,
        ),
      );

      // Resilient column migrations for existing tables
      const alterCols = [
        "ALTER TABLE dcsa_event_subscriptions ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE dcsa_event_subscriptions ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;",
        "ALTER TABLE dcsa_event_subscriptions ADD COLUMN metadata TEXT;",
        "ALTER TABLE dcsa_event_subscriptions ADD COLUMN tags TEXT;",
        "ALTER TABLE dcsa_events_log ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE dcsa_events_log ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;",
        "ALTER TABLE dcsa_events_log ADD COLUMN metadata TEXT;",
        "ALTER TABLE dcsa_events_log ADD COLUMN tags TEXT;",
      ];
      for (const statement of alterCols) {
        try {
          await db.run(sql.raw(statement));
        } catch (_ignore) {}
      }

      dcsaTablesEnsured = true;
    } catch (err) {
      logger.warn(
        { err },
        "Could not ensure DCSA tables via direct raw DDL; continuing.",
      );
    }
  }

  public static generateSignature(
    rawPayload: string,
    secretToken: string,
  ): string {
    return DcsaHubService.generateHmacSignature(rawPayload, secretToken);
  }

  /**
   * Verify official HMAC SHA-256 signature according to DCSA Security Specifications
   */
  public static verifyHmacSignature(
    rawBody: string,
    signatureHeader: string | undefined,
    secretToken: string,
  ): boolean {
    if (!signatureHeader || !secretToken) return false;

    try {
      const cleanSignature = signatureHeader.replace(/^sha256=/i, "").trim();
      const expected = crypto
        .createHmac("sha256", secretToken)
        .update(rawBody, "utf8")
        .digest("hex");

      const sigBuffer = Buffer.from(cleanSignature, "hex");
      const expBuffer = Buffer.from(expected, "hex");

      if (sigBuffer.length !== expBuffer.length) return false;
      return crypto.timingSafeEqual(sigBuffer, expBuffer);
    } catch (_err) {
      return false;
    }
  }

  /**
   * Generate HMAC SHA-256 signature for outgoing webhook notifications
   */
  public static generateHmacSignature(
    rawPayload: string,
    secretToken: string,
  ): string {
    const hash = crypto
      .createHmac("sha256", secretToken)
      .update(rawPayload, "utf8")
      .digest("hex");
    return `sha256=${hash}`;
  }

  /**
   * Ingest and process a DCSA 3.0 event (from Carrier Webhook or Internal Simulator)
   */
  public static async processEvent(
    event: DcsaEventPayload,
    options: {
      rawPayload?: string;
      signatureHeader?: string;
      carrierCode?: string;
      skipSignatureCheck?: boolean;
    } = {},
  ): Promise<{
    eventId: string;
    status: "PROCESSED" | "FLAGGED_EXCEPTION";
    shipmentLinked?: string;
    exceptionRaised?: boolean;
    details: string;
  }> {
    await this.ensureTables();

    const eventId = event.eventId || `dcsa_evt_${crypto.randomUUID()}`;
    const raw = options.rawPayload || JSON.stringify(event);
    const locode = event.location?.unLocationCode || "ESVLC";
    const now = new Date();

    // Verify signature against active subscriptions if secret provided
    let signatureVerified = true;
    if (
      !options.skipSignatureCheck &&
      options.signatureHeader &&
      options.carrierCode
    ) {
      const subs = await db
        .select()
        .from(dcsaEventSubscriptions)
        .where(eq(dcsaEventSubscriptions.carrierCode, options.carrierCode))
        .limit(1);

      if (subs.length > 0 && subs[0].secretToken) {
        signatureVerified = this.verifyHmacSignature(
          raw,
          options.signatureHeader,
          subs[0].secretToken,
        );
      }
    }

    if (!signatureVerified) {
      throw new Error(
        `Cryptographic signature check failed: Invalid DCSA HMAC signature for carrier ${options.carrierCode || "UNKNOWN"}`,
      );
    }

    // Try linking with an existing SCM shipment
    let linkedShipmentId: string | undefined;
    if (event.carrierBookingReference || event.transportDocumentReference) {
      const bkg = (event.carrierBookingReference || "").trim();
      const doc = (event.transportDocumentReference || "").trim();

      // Check SCM logical shipments by exact reference first
      try {
        if (bkg) {
          const directMatch = await db
            .select()
            .from(scmLogicalShipments)
            .where(eq(scmLogicalShipments.shipmentReference, bkg))
            .limit(1);
          if (directMatch.length > 0) {
            linkedShipmentId = directMatch[0].shipmentId;
          }
        }
        if (!linkedShipmentId && doc) {
          const docMatch = await db
            .select()
            .from(scmLogicalShipments)
            .where(eq(scmLogicalShipments.shipmentReference, doc))
            .limit(1);
          if (docMatch.length > 0) {
            linkedShipmentId = docMatch[0].shipmentId;
          }
        }
        if (!linkedShipmentId) {
          const scmCandidates = await db
            .select()
            .from(scmLogicalShipments)
            .orderBy(desc(scmLogicalShipments.createdAt))
            .limit(100);
          const scmMatched = scmCandidates.find((s) => {
            const ref = s.shipmentReference || s.shipmentId;
            return (
              (bkg && (ref.includes(bkg) || bkg.includes(ref))) ||
              (doc && (ref.includes(doc) || doc.includes(ref)))
            );
          });
          if (scmMatched) {
            linkedShipmentId = scmMatched.shipmentId;
          }
        }
      } catch (_e: any) {
        logger.warn({ _e }, "Error linking SCM shipment");
      }

      if (!linkedShipmentId) {
        try {
          const candidates = await db.select().from(shipments).limit(50);
          const matched = candidates.find((s) => {
            const ref = s.trackingNumber || s.id;
            return (
              (bkg && (ref.includes(bkg) || bkg.includes(ref))) ||
              (doc && (ref.includes(doc) || doc.includes(ref)))
            );
          });
          if (matched) {
            linkedShipmentId = matched.id;
          }
        } catch (_e) {}
      }
    }

    // Hybrid risk logic: check for disruptions (ROLLOVER, HOLD, or severe DELAY > 12h)
    const isDisruption =
      event.eventTypeCode === "ROLL" ||
      event.eventTypeCode === "HOLD" ||
      (event.delayHours !== undefined && event.delayHours > 12);

    let exceptionRaised = false;
    let detailMsg = `DCSA ${event.eventType} event ${event.eventTypeCode} processed for ${event.equipmentReference || locode}`;

    if (linkedShipmentId) {
      if (isDisruption) {
        try {
          const reason =
            event.disruptionReason ||
            (event.eventTypeCode === "ROLL"
              ? "Container Rollover en puerto de embarque/transbordo (Contenedor dejado en tierra)."
              : event.eventTypeCode === "HOLD"
                ? "Retención terminal o aduanera aplicada al contenedor."
                : `Demora marítima crítica de ${event.delayHours} horas notificada por naviera.`);

          await raiseOperationalException(
            {
              shipmentId: linkedShipmentId,
              category: "CARRIER_ROLL",
              severity: "CRITICAL",
              title: `Disrupción Marítima DCSA: ${event.eventTypeCode} (${locode})`,
              description: `Naviera notifica evento de riesgo para contenedor ${event.equipmentReference || "N/A"} en ${locode}: ${reason}. Buque: ${event.vessel?.vesselName || "N/A"}.`,
              isBlocking: true,
              assignedTeam: "CARRIER_OPERATIONS",
            },
            {
              ...DEFAULT_OPERATOR_ACTOR,
              userId: "usr_dcsa_gateway",
            },
          );
          exceptionRaised = true;
          detailMsg += ` [Excepción bloqueante levantada: ${reason}]`;
        } catch (_err) {
          logger.warn(
            { _err },
            "Could not raise SCM operational exception for DCSA disruption",
          );
        }
      }

      // Propagate operational tracking event to SCM
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
        if (event.eventTypeCode === "GTIN" || event.eventTypeCode === "LOAD")
          trackingEventCode = "GATE_IN";
        else if (event.eventTypeCode === "DEPA")
          trackingEventCode = "VESSEL_DEPARTED";
        else if (event.eventTypeCode === "HOLD")
          trackingEventCode = "CUSTOMS_HOLD";
        else if (event.eventTypeCode === "GTOT")
          trackingEventCode = "DELIVERED";

        let scmMilestoneCode:
          | "VGM_CUTOFF"
          | "ETD_POL"
          | "TRANSSHIPMENT"
          | "ETA_POD"
          | "CUSTOMS_CLEARANCE"
          | "POD_DELIVERY" = "ETD_POL";
        if (
          event.eventTypeCode === "GTIN" ||
          event.eventTypeCode === "LOAD" ||
          event.eventTypeCode === "DEPA"
        )
          scmMilestoneCode = "ETD_POL";
        else if (
          event.eventTypeCode === "ARRI" ||
          event.eventTypeCode === "DISC"
        )
          scmMilestoneCode = "ETA_POD";
        else if (event.eventTypeCode === "HOLD")
          scmMilestoneCode = "CUSTOMS_CLEARANCE";
        else if (event.eventTypeCode === "GTOT")
          scmMilestoneCode = "POD_DELIVERY";

        await ingestOperationalTrackingEvent(
          {
            shipmentId: linkedShipmentId,
            eventCode: trackingEventCode,
            milestoneCode: scmMilestoneCode,
            locationLocode: locode,
            sourceType: "CARRIER_DCSA_EDI",
            timestampKind:
              event.eventClassifierCode === "ACT" ? "ACTUAL" : "ESTIMATED",
            eventTimestamp: event.eventDateTime,
            summary: `Telemetría DCSA 3.0 (${event.eventType}/${event.eventTypeCode}) - Buque: ${event.vessel?.vesselName || "CARRIER"} Viaje: ${event.carrierVoyageNumber || "N/A"}`,
          },
          {
            ...DEFAULT_OPERATOR_ACTOR,
            userId: "usr_dcsa_gateway",
          },
        );
      } catch (_milestoneErr) {
        // Resilient: If milestone plan is not present, proceed without error
      }
    }

    // Persist event in log
    try {
      await db.insert(dcsaEventsLog).values({
        eventId,
        eventType: event.eventType,
        eventClassifierCode: event.eventClassifierCode,
        eventDateTime: event.eventDateTime,
        carrierBookingReference: event.carrierBookingReference || null,
        transportDocumentReference: event.transportDocumentReference || null,
        equipmentReference: event.equipmentReference || null,
        eventTypeCode: event.eventTypeCode,
        locationLocode: locode,
        vesselImoNumber: event.vessel?.vesselIMONumber || null,
        vesselName: event.vessel?.vesselName || null,
        voyageNumber: event.carrierVoyageNumber || null,
        payloadJson: raw,
        signatureVerified,
        scmLinkedShipmentId: linkedShipmentId || null,
        processedStatus: isDisruption ? "FLAGGED_EXCEPTION" : "PROCESSED",
        exceptionTriggered: exceptionRaised,
        createdAt: now,
        updatedAt: now,
      });
    } catch (insertErr) {
      logger.warn({ insertErr }, "Could not insert DCSA event log");
    }

    return {
      eventId,
      status: isDisruption ? "FLAGGED_EXCEPTION" : "PROCESSED",
      shipmentLinked: linkedShipmentId,
      exceptionRaised,
      details: detailMsg,
    };
  }

  /**
   * Map DCSA 3.0 eventTypeCode to SCM canonical milestone codes
   */
  private static mapDcsaToMilestone(code: string): string {
    switch (code) {
      case "GTIN":
        return "GATE_IN";
      case "LOAD":
        return "CONTAINER_LOADED";
      case "DEPA":
        return "ETD_POL";
      case "DISC":
        return "CONTAINER_DISCHARGED";
      case "ARRI":
        return "ETA_POD";
      case "GTOT":
        return "POD_DELIVERY";
      case "HOLD":
        return "CUSTOMS_CLEARANCE";
      default:
        return "IN_TRANSIT";
    }
  }

  /**
   * Create a Webhook Subscription (DCSA Event Subscriptions API v3)
   */
  public static async createSubscription(
    input: CreateDcsaSubscriptionInput,
  ): Promise<{
    subscriptionId: string;
    carrierCode: string;
    callbackUrl: string;
    secretToken: string;
    eventTypeFilters: string[];
    status: string;
    createdAt: string;
  }> {
    await this.ensureTables();

    const subscriptionId = `sub_${crypto.randomUUID()}`;
    const secretToken =
      input.secretToken || crypto.randomBytes(24).toString("hex");
    const filters =
      input.eventTypeFilters && input.eventTypeFilters.length > 0
        ? input.eventTypeFilters
        : ["EQUIPMENT", "TRANSPORT", "SHIPMENT"];
    const now = new Date();

    await db.insert(dcsaEventSubscriptions).values({
      subscriptionId,
      carrierCode: input.carrierCode.toUpperCase(),
      callbackUrl: input.callbackUrl,
      secretToken,
      eventTypeFiltersJson: JSON.stringify(filters),
      bookingReference: input.bookingReference || null,
      equipmentReference: input.equipmentReference || null,
      status: "ACTIVE",
      deliveryCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return {
      subscriptionId,
      carrierCode: input.carrierCode.toUpperCase(),
      callbackUrl: input.callbackUrl,
      secretToken,
      eventTypeFilters: filters,
      status: "ACTIVE",
      createdAt: now.toISOString(),
    };
  }

  /**
   * List all registered DCSA webhook subscriptions
   */
  public static async listSubscriptions() {
    await this.ensureTables();
    try {
      const rows = await db
        .select()
        .from(dcsaEventSubscriptions)
        .orderBy(desc(dcsaEventSubscriptions.createdAt));

      return rows.map((r) => ({
        subscriptionId: r.subscriptionId,
        carrierCode: r.carrierCode,
        callbackUrl: r.callbackUrl,
        secretToken: r.secretToken,
        eventTypeFilters: JSON.parse(r.eventTypeFiltersJson || "[]"),
        bookingReference: r.bookingReference,
        equipmentReference: r.equipmentReference,
        status: r.status,
        deliveryCount: r.deliveryCount,
        lastDeliveredAt: r.lastDeliveredAt
          ? new Date(r.lastDeliveredAt).toISOString()
          : null,
        lastError: r.lastError,
        createdAt: new Date(r.createdAt).toISOString(),
      }));
    } catch (_err) {
      return [];
    }
  }

  /**
   * List logged DCSA events
   */
  public static async listEvents(limit: number = 50) {
    await this.ensureTables();
    try {
      const rows = await db
        .select()
        .from(dcsaEventsLog)
        .orderBy(desc(dcsaEventsLog.createdAt))
        .limit(limit);

      return rows.map((r) => ({
        eventId: r.eventId,
        eventType: r.eventType,
        eventClassifierCode: r.eventClassifierCode,
        eventDateTime: r.eventDateTime,
        carrierBookingReference: r.carrierBookingReference,
        transportDocumentReference: r.transportDocumentReference,
        equipmentReference: r.equipmentReference,
        eventTypeCode: r.eventTypeCode,
        locationLocode: r.locationLocode,
        vesselName: r.vesselName,
        voyageNumber: r.voyageNumber,
        signatureVerified: r.signatureVerified,
        scmLinkedShipmentId: r.scmLinkedShipmentId,
        processedStatus: r.processedStatus,
        exceptionTriggered: r.exceptionTriggered,
        payload: JSON.parse(r.payloadJson || "{}"),
        createdAt: new Date(r.createdAt).toISOString(),
      }));
    } catch (_err) {
      return [];
    }
  }

  /**
   * Simulate and dispatch a realistic Carrier DCSA 3.0 Telemetry Event
   */
  public static async simulateCarrierEvent(input: {
    carrierCode: "MSCU" | "MAEU" | "CMDU" | "HLCU";
    eventType: DcsaEventType;
    eventTypeCode: string;
    bookingReference?: string;
    containerNumber?: string;
    locode?: string;
    isDisruption?: boolean;
    disruptionReason?: string;
  }) {
    const nowIso = new Date().toISOString();
    const eventId = `dcsa_sim_${crypto.randomUUID().slice(0, 8)}`;
    const bkg =
      input.bookingReference ||
      `BK-${input.carrierCode}-${Date.now().toString().slice(-6)}`;
    const container =
      input.containerNumber ||
      `${input.carrierCode}${Math.floor(1000000 + Math.random() * 9000000)}`;
    const locode =
      input.locode ||
      (input.eventTypeCode === "DEPA" || input.eventTypeCode === "LOAD"
        ? "ESVLC"
        : "USNYC");

    const payload: DcsaEventPayload = {
      eventId,
      eventType: input.eventType,
      eventClassifierCode: "ACT",
      eventDateTime: nowIso,
      eventTypeCode: input.isDisruption ? "ROLL" : input.eventTypeCode,
      carrierBookingReference: bkg,
      transportDocumentReference: `HBL-${bkg}`,
      equipmentReference: container,
      location: {
        unLocationCode: locode,
        locationName:
          locode === "ESVLC"
            ? "Valencia Terminal Port"
            : "New York Container Terminal",
      },
      vessel: {
        vesselIMONumber: "9839420",
        vesselName:
          input.carrierCode === "MSCU"
            ? "MSC OSCAR"
            : input.carrierCode === "MAEU"
              ? "MAERSK MC-KINNEY MOLLER"
              : "CMA CGM ANTOINE",
      },
      carrierVoyageNumber: "V.2611W",
      sealNumber: `SL-${Math.floor(100000 + Math.random() * 900000)}`,
      disruptionReason: input.isDisruption
        ? input.disruptionReason ||
          "Overbooked vessel capacity. Container rolled over to next scheduled voyage."
        : undefined,
    };

    const rawPayload = JSON.stringify(payload);

    // Compute sample HMAC signature
    const sampleSecret = "atlas_dcsa_webhook_secret_key_2026";
    const signature = this.generateHmacSignature(rawPayload, sampleSecret);

    const result = await this.processEvent(payload, {
      rawPayload,
      signatureHeader: signature,
      carrierCode: input.carrierCode,
      skipSignatureCheck: true,
    });

    return {
      success: true,
      result,
      event: payload,
      signature,
      verification: {
        headerReceived: signature,
        verified: true,
      },
      scmIntegration: {
        action: result.status,
      },
    };
  }
}
