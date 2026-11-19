/**
 * @file carrier-integration-schedules-ebl.test.ts
 * @description Comprehensive test suite for Track C: Carrier Integrations, Ocean Schedules & eBL Lifecycle.
 * Covers IMO checksums, port rotations, transit time calculations, outbox booking dispatch (DCSA & EDI 301),
 * M365 Adaptive Card DLQ alerts, UNCITRAL MLETR eBL cryptographic ledger, and async telemetry webhooks.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import {
  validateImoNumber,
  buildDcsaOceanBookingPayload,
  buildEdi301Payload,
  parseEdi997Acknowledgment,
  buildM365DeadLetterAdaptiveCard,
} from "@atlas/shared";
import { CarrierSchedulesService } from "../src/services/carrier/carrier-schedules.service.js";
import { CarrierBookingDispatchService } from "../src/services/carrier/carrier-booking-dispatch.service.js";
import { EblLifecycleService } from "../src/services/carrier/ebl-lifecycle.service.js";
import carrierIntegrationsRoutes from "../src/routes/carrier/carrier-integrations.routes.js";
import { db } from "../src/db/index.js";
import {
  addresses,
  companies,
  vessels,
  carrierServices,
  voyages,
  portCalls,
  scmOutboxMessages,
  dcsaEventsLog,
} from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";

describe("Track C: Carrier Integrations, Ocean Schedules & eBL Lifecycle", () => {
  let app: FastifyInstance;
  const testCarrierId = "addr-carrier-trackc-01";
  const testCarrierCompanyId = "comp-carrier-trackc-01";

  beforeAll(async () => {
    // 1. Ensure test carrier and address exist in dev.db
    const now = new Date();
    await db
      .insert(companies)
      .values({
        id: testCarrierCompanyId,
        name: "Maersk Line A/S",
        taxId: "DK-12345678",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    await db
      .insert(addresses)
      .values({
        id: testCarrierId,
        companyId: testCarrierCompanyId,
        companyName: "A.P. Moller - Maersk",
        tradeName: "Maersk Line",
        addressType: "OCA",
        country: "DK",
        city: "Copenhagen",
        street1: "Esplanaden 50",
        zipCode: "1098",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 2. Setup Fastify test app
    app = Fastify();
    await app.register(carrierIntegrationsRoutes, { prefix: "/api/carrier" });
    await app.ready();
  });

  // ==========================================================================
  // 1. IMO 7-DIGIT CHECK DIGIT VALIDATION
  // ==========================================================================

  describe("IMO 7-digit Check Digit Validation", () => {
    it("validates mathematically correct IMO numbers", () => {
      // 9315331: 9*7 + 3*6 + 1*5 + 5*4 + 3*3 + 3*2 = 63+18+5+20+9+6 = 121 -> mod 10 = 1
      expect(validateImoNumber("9315331").valid).toBe(true);
      expect(validateImoNumber("IMO 9315331").valid).toBe(true);
      expect(validateImoNumber("IMO9315331").cleanImo).toBe("9315331");

      // 9074729: 9*7 + 0*6 + 7*5 + 4*4 + 7*3 + 2*2 = 63+0+35+16+21+4 = 139 -> mod 10 = 9
      expect(validateImoNumber("9074729").valid).toBe(true);
    });

    it("rejects IMO numbers with invalid check digits", () => {
      const result = validateImoNumber("9315332");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("IMO checksum mismatch");
    });

    it("rejects malformed or non-7-digit IMO inputs", () => {
      expect(validateImoNumber("").valid).toBe(false);
      expect(validateImoNumber("12345").valid).toBe(false);
      expect(validateImoNumber("12345678").valid).toBe(false);
      expect(validateImoNumber("ABCDEFG").valid).toBe(false);
    });
  });

  // ==========================================================================
  // 2. CARRIER SCHEDULES & PORT ROTATIONS
  // ==========================================================================

  describe("Carrier Schedules Domain & Rotation Engine", () => {
    let testVesselId: string;
    let testServiceId: string;
    let testVoyageId: string;

    it("registers a vessel with validated IMO and attributes", async () => {
      const vessel = await CarrierSchedulesService.registerVessel({
        imoNumber: "9315331",
        vesselName: "Emma Maersk",
        flag: "DNK",
        capacityTeu: 15550,
        yearBuilt: 2006,
        callSign: "OYGR2",
        mmsi: "219000585",
      });

      expect(vessel).toBeDefined();
      expect(vessel.imoNumber).toBe("9315331");
      expect(vessel.vesselName).toBe("EMMA MAERSK");
      testVesselId = vessel.id;
    });

    it("creates a carrier service loop", async () => {
      const service = await CarrierSchedulesService.createCarrierService({
        carrierId: testCarrierId,
        serviceCode: "AE1",
        serviceName: "Asia-Europe Loop 1",
        tradeLane: "ASIA_NORTH_EUROPE",
        transportMode: "OCEAN",
      });

      expect(service).toBeDefined();
      expect(service.serviceCode).toBe("AE1");
      expect(service.tradeLane).toBe("ASIA_NORTH_EUROPE");
      testServiceId = service.id;
    });

    it("rejects voyages with non-sequential port call orders", async () => {
      await expect(
        CarrierSchedulesService.createVoyageWithPortCalls({
          voyageNumber: "V-TEST-NONSEQ",
          vesselId: testVesselId,
          serviceId: testServiceId,
          portCalls: [
            { unlocode: "CNSHA", sequence: 1 },
            { unlocode: "ESVLC", sequence: 3 }, // missing 2!
          ],
        }),
      ).rejects.toThrow(/Port calls must have strictly sequential sequences/);
    });

    it("rejects voyages where cut-offs exceed departure time (ETD)", async () => {
      const etd = new Date("2026-06-15T12:00:00Z");
      const badCutOff = new Date("2026-06-15T18:00:00Z"); // After ETD!

      await expect(
        CarrierSchedulesService.createVoyageWithPortCalls({
          voyageNumber: "V-TEST-BADCUT",
          vesselId: testVesselId,
          serviceId: testServiceId,
          portCalls: [
            {
              unlocode: "CNSHA",
              sequence: 1,
              etd,
              cyCutOff: badCutOff,
            },
            { unlocode: "ESVLC", sequence: 2 },
          ],
        }),
      ).rejects.toThrow(/CY Cut-off.*cannot be after ETD/);
    });

    const testVoyageNum = `2606W_${Date.now()}`;

    it("atomically creates a voyage with a multi-port rotation and cut-offs", async () => {
      const originEtd = new Date("2026-06-01T08:00:00Z");
      const destEta = new Date("2026-06-25T14:00:00Z");

      const result = await CarrierSchedulesService.createVoyageWithPortCalls({
        voyageNumber: testVoyageNum,
        vesselId: testVesselId,
        serviceId: testServiceId,
        direction: "WEST",
        portCalls: [
          {
            unlocode: "CNSHA",
            terminalCode: "YS_SHANGHAI",
            sequence: 1,
            etd: originEtd,
            cyCutOff: new Date("2026-05-30T18:00:00Z"),
            vgmCutOff: new Date("2026-05-30T12:00:00Z"),
            siCutOff: new Date("2026-05-29T12:00:00Z"),
          },
          {
            unlocode: "SGSIN",
            terminalCode: "PSA_SINGAPORE",
            sequence: 2,
            eta: new Date("2026-06-07T06:00:00Z"),
            etd: new Date("2026-06-08T18:00:00Z"),
          },
          {
            unlocode: "EGSUZ",
            terminalCode: "SCCT_PORT_SAID",
            sequence: 3,
            eta: new Date("2026-06-18T10:00:00Z"),
            etd: new Date("2026-06-19T02:00:00Z"),
          },
          {
            unlocode: "ESVLC",
            terminalCode: "CSP_VALENCIA",
            sequence: 4,
            eta: destEta,
          },
        ],
      });

      expect(result.voyage.voyageNumber).toBe(testVoyageNum);
      expect(result.portCalls.length).toBe(4);
      testVoyageId = result.voyage.id;
    });

    it("searches corridor schedules and computes transit days between origin and destination", async () => {
      const schedules = await CarrierSchedulesService.searchCorridorSchedules({
        originUnlocode: "CNSHA",
        destinationUnlocode: "ESVLC",
      });

      expect(schedules.length).toBeGreaterThan(0);
      const match = schedules.find((s) => s.voyageNumber === testVoyageNum);
      expect(match).toBeDefined();
      expect(match!.vessel.vesselName).toBe("EMMA MAERSK");
      expect(match!.vessel.imoNumber).toBe("9315331");
      expect(match!.origin.unlocode).toBe("CNSHA");
      expect(match!.origin.sequence).toBe(1);
      expect(match!.destination.unlocode).toBe("ESVLC");
      expect(match!.destination.sequence).toBe(4);
      // Transit from 2026-06-01 to 2026-06-25 = 24 days
      expect(match!.transitDays).toBe(24);
      expect(match!.origin.cyCutOff).toBeDefined();
      expect(match!.origin.vgmCutOff).toBeDefined();
    });

    it("returns zero results when destination occurs before origin in rotation", async () => {
      // ESVLC (seq 4) -> CNSHA (seq 1) on westbound voyage should not match!
      const schedules = await CarrierSchedulesService.searchCorridorSchedules({
        originUnlocode: "ESVLC",
        destinationUnlocode: "CNSHA",
      });

      const match = schedules.find((s) => s.voyageNumber === testVoyageNum);
      expect(match).toBeUndefined();
    });
  });

  // ==========================================================================
  // 3. ELECTRONIC BOOKING DISPATCH & DEAD-LETTER QUEUE ALERTING
  // ==========================================================================

  describe("Carrier Booking Outbox Dispatch & Dead-Letter Alerts", () => {
    let testVessel: any;

    beforeAll(async () => {
      const v = await db.select().from(vessels).limit(1);
      testVessel = v[0];
    });

    it("dispatches booking via transactional outbox using DCSA Ocean Booking v2.0", async () => {
      const result = await CarrierBookingDispatchService.dispatchBooking({
        shipmentId: "shp-trackc-bkg-01",
        carrierId: testCarrierId,
        carrierScac: "MAEU",
        contractReference: "CTR-MAEU-2026-001",
        format: "DCSA_JSON",
        vesselId: testVessel.id,
        voyageNumber: "2606W",
        originUnlocode: "CNSHA",
        destinationUnlocode: "ESVLC",
        grossWeightKg: 18500,
        volumeCbm: 42.5,
      });

      expect(result.status).toBe("PENDING");
      expect(result.format).toBe("DCSA_JSON");
      expect(result.outboxEventId).toMatch(/^evt_/);

      // Verify recorded in scmOutboxMessages table
      const msg = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, result.outboxEventId))
      )[0];
      expect(msg).toBeDefined();
      expect(msg.eventType).toBe("CARRIER_BOOKING_REQUESTED");
      expect(msg.aggregateType).toBe("CARRIER_BOOKING");
      expect(msg.status).toBe("PENDING");
    });

    it("dispatches booking using ANSI X12 EDI 301 format", async () => {
      const result = await CarrierBookingDispatchService.dispatchBooking({
        shipmentId: "shp-trackc-bkg-02",
        carrierId: testCarrierId,
        carrierScac: "MAEU",
        contractReference: "CTR-MAEU-2026-001",
        format: "EDI_301",
        vesselId: testVessel.id,
        voyageNumber: "2606W",
        originUnlocode: "CNSHA",
        destinationUnlocode: "ESVLC",
        grossWeightKg: 22000,
      });

      expect(result.format).toBe("EDI_301");
      const ediContent = result.payload as string;
      expect(ediContent).toContain("ST*301*");
      expect(ediContent).toContain("B1*MAEU*");
      expect(ediContent).toContain("R4*R*UN*CNSHA");
      expect(ediContent).toContain("R4*D*UN*ESVLC");
      expect(ediContent).toContain("SE*");
    });

    it("confirms booking on successful acknowledgment", async () => {
      const dispatch = await CarrierBookingDispatchService.dispatchBooking({
        shipmentId: "shp-trackc-bkg-03",
        carrierId: testCarrierId,
        contractReference: "CTR-MAEU-2026-001",
        vesselId: testVessel.id,
        voyageNumber: "2606W",
        originUnlocode: "CNSHA",
        destinationUnlocode: "ESVLC",
        grossWeightKg: 14000,
      });

      const confirmResult =
        await CarrierBookingDispatchService.processConfirmation({
          outboxEventId: dispatch.outboxEventId,
          carrierBookingNumber: "MAEU98210344",
          status: "CONFIRMED",
        });

      expect(confirmResult.success).toBe(true);
      expect(confirmResult.status).toBe("CONFIRMED");

      const updated = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, dispatch.outboxEventId))
      )[0];
      expect(updated.status).toBe("PROCESSED");
      expect(updated.publishedAt).toBeDefined();
    });

    it("handles carrier rejection and triggers Microsoft 365 Adaptive Card DLQ alert", async () => {
      const dispatch = await CarrierBookingDispatchService.dispatchBooking({
        shipmentId: "shp-trackc-bkg-04",
        carrierId: testCarrierId,
        contractReference: "CTR-MAEU-2026-001",
        vesselId: testVessel.id,
        voyageNumber: "2606W",
        originUnlocode: "CNSHA",
        destinationUnlocode: "ESVLC",
        grossWeightKg: 19000,
      });

      const confirmResult =
        await CarrierBookingDispatchService.processConfirmation({
          outboxEventId: dispatch.outboxEventId,
          carrierBookingNumber: "MAEU-REJECT-99",
          status: "REJECTED",
          rejectionReason:
            "Vessel fully booked; allocation cap exceeded for corridor",
        });

      expect(confirmResult.success).toBe(false);
      expect(confirmResult.status).toBe("FAILED");
      expect(confirmResult.dlqCardPayload).toBeDefined();
      expect(confirmResult.dlqCardPayload.type).toBe("AdaptiveCard");
      expect(confirmResult.dlqCardPayload.version).toBe("1.5");
      expect(JSON.stringify(confirmResult.dlqCardPayload)).toContain(
        "CARRIER B2B DISPATCH CRITICAL FAILURE",
      );
      expect(JSON.stringify(confirmResult.dlqCardPayload)).toContain(
        "allocation cap exceeded",
      );
    });
  });

  // ==========================================================================
  // 4. ELECTRONIC BILL OF LADING (eBL) UNCITRAL MLETR LIFECYCLE
  // ==========================================================================

  describe("eBL Cryptographic State Machine & Title Endorsements", () => {
    let testRecordId: string;

    it("issues a negotiable eBL under UNCITRAL MLETR (Block 1: ORIGINAL_ISSUE)", async () => {
      const result = await EblLifecycleService.issueCarrierEbl({
        shipmentId: "sh_demo_01",
        documentReference: "HBL-TRACKC-2026-001",
        carrierCode: "MAEU",
        carrierName: "Maersk Line",
        shipperName: "Atlas Global Forwarding SL",
        consigneeName: "Santander Trade Bank SA",
        vesselName: "EMMA MAERSK",
        voyageNumber: "2606W",
        signerName: "Carlos Almarza",
        signerTitle: "Authorized Ocean Carrier Agent",
      });

      expect(result).toBeDefined();
      expect(result.recordId).toMatch(/^mletr_/);
      expect(result.status).toBe("ISSUED");
      expect(result.currentHolderRole).toBe("SHIPPER");
      expect(result.genesisHash).toBeDefined();
      expect(result.latestTxHash).toBeDefined();
      testRecordId = result.recordId;
    });

    it("endorses eBL title to Trade Finance Bank (Block 2: PLEDGE_TO_BANK)", async () => {
      const result = await EblLifecycleService.endorseEbl({
        recordId: testRecordId,
        toParty: "Banco Santander Commercial Trade",
        toRole: "BANK",
        signerName: "Elena Rodriguez",
        signerTitle: "Head of Export Trade Finance",
      });

      expect(result.toParty).toBe("Banco Santander Commercial Trade");
      expect(result.currentHolderRole).toBe("BANK");
      expect(result.newBlockNumber).toBe(2);
    });

    it("endorses eBL title from Bank to Consignee (Block 3: SPECIAL_ENDORSEMENT)", async () => {
      const result = await EblLifecycleService.endorseEbl({
        recordId: testRecordId,
        toParty: "Shanghai Import & Distribution Corp",
        toRole: "CONSIGNEE",
        signerName: "David Chen",
        signerTitle: "VP Letter of Credit Settlement",
      });

      expect(result.toParty).toBe("Shanghai Import & Distribution Corp");
      expect(result.currentHolderRole).toBe("CONSIGNEE");
      expect(result.newBlockNumber).toBe(3);
    });

    it("surrenders eBL title to Ocean Carrier for cargo release at POD (Block 4: SURRENDER_FOR_RELEASE)", async () => {
      const result = await EblLifecycleService.surrenderEbl({
        recordId: testRecordId,
        carrierName: "Maersk Line Valencia Terminal",
        signerName: "Ming Liu",
        signerTitle: "Consignee Legal Representative",
      });

      expect(result.status).toBe("SURRENDERED");
      expect(result.newBlockNumber).toBe(4);
      expect(result.toParty).toBe("Maersk Line Valencia Terminal");
    });

    it("proves complete mathematical integrity of the cryptographic SHA-256 block ledger", async () => {
      const audit = await EblLifecycleService.verifyEblAuditChain(testRecordId);
      expect(audit.isValid).toBe(true);
      expect(audit.totalBlocks).toBe(4);
      expect(audit.corruptedBlockNumber).toBeUndefined();
    });

    it("prevents further endorsements once eBL is surrendered", async () => {
      await expect(
        EblLifecycleService.endorseEbl({
          recordId: testRecordId,
          toParty: "Illegal Third Party",
          toRole: "CONSIGNEE",
          signerName: "Fraudster",
        }),
      ).rejects.toThrow(/title already surrendered/);
    });
  });

  // ==========================================================================
  // 5. ASYNCHRONOUS TRACK & TRACE INGESTION WEBHOOK
  // ==========================================================================

  describe("Fastify Track & Trace Webhook Receiver", () => {
    it("immediately acknowledges ingress webhook with HTTP 200 and buffers payload asynchronously", async () => {
      const uniqueEventId = `telemetry_test_${Date.now()}`;

      const response = await app.inject({
        method: "POST",
        url: "/api/carrier/webhooks/track-and-trace",
        payload: {
          eventId: uniqueEventId,
          eventType: "EQUIPMENT",
          eventClassifierCode: "ACT",
          eventDateTime: new Date().toISOString(),
          eventTypeCode: "LOAD",
          carrierBookingReference: "BK-2026-67116",
          transportDocumentReference: "HBL-BK-2026-67116",
          equipmentReference: "MSKU9284710",
          locationLocode: "CNSHA",
          vesselImoNumber: "9315331",
          vesselName: "EMMA MAERSK",
          voyageNumber: "2606W",
          scmLinkedShipmentId: "sh_demo_01",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe("QUEUED");
      expect(body.eventId).toBeDefined();

      // Verify event was saved to dcsaEventsLog
      const saved = (
        await db
          .select()
          .from(dcsaEventsLog)
          .where(eq(dcsaEventsLog.eventId, uniqueEventId))
      )[0];
      expect(saved).toBeDefined();
      expect(saved.eventTypeCode).toBe("LOAD");
      expect(saved.locationLocode).toBe("CNSHA");
    });
  });
});
