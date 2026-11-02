import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import crypto from "crypto";
import dcsaRoutes from "../src/routes/dcsa.routes.js";
import ediRoutes from "../src/routes/edi.routes.js";
import scmV1Routes from "../src/routes/scm-v1.routes.js";
import { ensureOperationalBffTables } from "../src/scm/kernel/operational-bff-tables.js";
import { ensureScmFoundationTables } from "../src/scm/kernel/outbox-bus.js";
import { DcsaHubService } from "../src/services/dcsa/dcsa-hub.service.js";
import { EdiDispatcherService } from "../src/services/edi/edi-dispatcher.service.js";
import {
  X12Service,
  X12OceanShippingInstruction,
  X12OceanInvoice,
} from "../src/services/edi/x12.service.js";
import { EdiTokenizer } from "../src/services/edi/edi-tokenizer.js";
import { createOperationalShipment } from "../src/scm/contexts/operational-core/operational-core.context.js";
import { listOperationalExceptionsForShipment } from "../src/scm/contexts/operational-intelligence/operational-exceptions.context.js";

describe("B2B Interoperability Suite: DCSA 3.0 Event Hub & Ocean EDI (304, 310, 315)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(dcsaRoutes, { prefix: "/api/dcsa/v3" });
    await app.register(ediRoutes, { prefix: "/api/edi" });
    await app.register(scmV1Routes, { prefix: "/api/scm/v1" });
    await app.ready();

    await ensureOperationalBffTables();
    await ensureScmFoundationTables();
    await DcsaHubService.ensureTables();
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================================================
  // SECTION 1: DCSA 3.0 EVENT HUB & HMAC SHA-256 CRYPTOGRAPHIC INTEGRITY
  // ==========================================================================
  describe("DCSA 3.0 Event Hub & Webhook Signatures", () => {
    const testSecret = "carrier-webhook-secret-key-3.0";

    it("verifies and accepts a DCSA 3.0 EQUIPMENT event with valid HMAC SHA-256 signature", async () => {
      const payload = {
        eventId: `dcsa-evt-${Date.now()}`,
        eventType: "EQUIPMENT",
        eventClassifierCode: "ACT",
        eventDateTime: new Date().toISOString(),
        eventTypeCode: "LOAD",
        carrierBookingReference: "BK-DCSA-9901",
        equipmentReference: "MSKU9918234",
        location: {
          unLocationCode: "ESVLC",
          locationName: "Valencia Terminal Europa",
        },
        vessel: {
          vesselName: "MSC OSCAR",
          vesselIMONumber: "9703291",
        },
        carrierVoyageNumber: "2601W",
      };

      const rawJson = JSON.stringify(payload);
      const hmacSignature = DcsaHubService.generateSignature(
        rawJson,
        testSecret,
      );

      // Register subscription so carrier code MSCU uses this secret
      await DcsaHubService.createSubscription({
        carrierCode: "MSCU",
        callbackUrl: "https://carrier.msc.com/dcsa-hub/v3",
        secretToken: testSecret,
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/dcsa/v3/events",
        headers: {
          "content-type": "application/json",
          "x-dcsa-signature": hmacSignature,
          "x-carrier-code": "MSCU",
        },
        payload,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("PROCESSED");
      expect(body.data.eventId).toBe(payload.eventId);
    });

    it("rejects DCSA event when HMAC signature does not match payload", async () => {
      const payload = {
        eventId: `dcsa-evt-tampered-${Date.now()}`,
        eventType: "TRANSPORT",
        eventClassifierCode: "ACT",
        eventDateTime: new Date().toISOString(),
        eventTypeCode: "DEPA",
        location: { unLocationCode: "ESBCN" },
      };

      const tamperedSignature =
        "sha256=0000000000000000000000000000000000000000000000000000000000000000";

      const res = await app.inject({
        method: "POST",
        url: "/api/dcsa/v3/events",
        headers: {
          "content-type": "application/json",
          "x-dcsa-signature": tamperedSignature,
          "x-carrier-code": "MSCU",
        },
        payload,
      });

      expect(res.statusCode).toBe(500);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain("Cryptographic signature check failed");
    });

    it("triggers SCM CARRIER_ROLL blocking exception on DCSA ROLL disruption event", async () => {
      const bookingRef = `BKG-ROLL-${Date.now()}`;

      // Create linked SCM shipment
      const shipment = await createOperationalShipment({
        shipmentReference: bookingRef,
        serviceType: "OCEAN_FCL",
        customerPartyId: "pty_mediterranean_shipper",
      });

      const disruptionPayload = {
        eventId: `dcsa-roll-${Date.now()}`,
        eventType: "EQUIPMENT",
        eventClassifierCode: "ACT",
        eventDateTime: new Date().toISOString(),
        eventTypeCode: "ROLL",
        carrierBookingReference: bookingRef,
        equipmentReference: "CMAU7718291",
        location: {
          unLocationCode: "ESALG",
          locationName: "Algeciras Transshipment Hub",
        },
        disruptionReason:
          "Buque sobrecargado; contenedor rolado a siguiente salida comercial.",
      };

      const result = await DcsaHubService.processEvent(
        disruptionPayload as any,
        {
          rawPayload: JSON.stringify(disruptionPayload),
          carrierCode: "CMDU",
          skipSignatureCheck: true,
        },
      );

      expect(result.status).toBe("FLAGGED_EXCEPTION");
      expect(result.exceptionRaised).toBe(true);

      // Verify operational exception was persisted in SCM
      const exceptions = await listOperationalExceptionsForShipment(
        shipment.shipmentId,
      );
      const rolloverException = exceptions.find(
        (e) => e.category === "CARRIER_ROLL",
      );
      expect(rolloverException).toBeDefined();
      expect(rolloverException?.isBlocking).toBe(true);
      expect(rolloverException?.severity).toBe("CRITICAL");
    });

    it("simulates carrier events and verifies HMAC generation via simulator endpoint", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/dcsa/v3/simulate-event",
        payload: {
          carrierCode: "HLCU",
          eventType: "TRANSPORT",
          eventTypeCode: "DEPA",
          locode: "DEHAM",
          isDisruption: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.success).toBe(true);
      expect(data.verification.headerReceived).toContain("sha256=");
      expect(data.event.eventTypeCode).toBe("DEPA");
    });
  });

  // ==========================================================================
  // SECTION 2: ANSI X12 304 - OCEAN SHIPPING INSTRUCTIONS & SOLAS VGM
  // ==========================================================================
  describe("ANSI X12 304: Ocean Shipping Instructions & SOLAS VGM Compliance", () => {
    it("generates and validates an official ANSI X12 304 with mandatory SOLAS VGM W09 segment", async () => {
      const instruction: X12OceanShippingInstruction = {
        bookingReference: "BK-MAEU-78190",
        carrierScac: "MAEU",
        vesselName: "MAERSK MC-KINNEY MOLLER",
        voyageNumber: "2602E",
        shipper: {
          name: "VALENCIA EXPORT SL",
          address: "CALLE DE LA MAR 10",
          city: "VALENCIA",
          state: "VC",
          postalCode: "46001",
          countryCode: "ES",
        },
        consignee: {
          name: "ATLANTIC IMPORTS LLC",
          address: "5TH AVENUE 100",
          city: "NEW YORK",
          state: "NY",
          postalCode: "10001",
          countryCode: "US",
        },
        portOfLoading: { locode: "ESVLC", portName: "VALENCIA PORT" },
        portOfDischarge: {
          locode: "USNYC",
          portName: "NEW YORK CONTAINER TERMINAL",
        },
        container: {
          containerNumber: "MSKU4491823",
          sealNumber: "SL-991823",
          equipmentType: "40HC",
          grossWeightKg: 21450,
          verifiedGrossMassKg: 21450,
          vgmVerificationMethod: "METHOD_1",
          vgmAuthorizedPerson: "ROBERTO SANCHEZ - WEIGHMASTER CERTIFIED",
        },
        cargo: {
          description: "AUTOMOTIVE COMPONENTS",
          packageCount: 30,
          packageType: "PK",
          grossWeightKg: 21450,
          volumeCbm: 45.2,
          hsCode: "87082990",
        },
      };

      const x12Payload = X12Service.generate304(
        instruction,
        "ATLASLOG",
        "MAERSKLINE",
      );

      // Verify structural segments
      expect(x12Payload).toContain("ISA*00*");
      expect(x12Payload).toContain("GS*SO*ATLASLOG*MAERSKLINE*");
      expect(x12Payload).toContain("ST*304*0001~");
      expect(x12Payload).toContain("B2*MAEU*BK-MAEU-78190***L~");
      expect(x12Payload).toContain("Y4*MSKU4491823*40HC***21450*K*SL-991823~");

      // SOLAS VGM Rule VI/2 Verification
      expect(x12Payload).toContain(
        "W09*21450*K*SM1*ROBERTO SANCHEZ - WEIGHMASTER CERTIFIED~",
      );

      // Ports & Vessel
      expect(x12Payload).toContain("R4*L*UN*ESVLC***VALENCIA PORT~");
      expect(x12Payload).toContain(
        "R4*D*UN*USNYC***NEW YORK CONTAINER TERMINAL~",
      );
      expect(x12Payload).toContain("MAERSK MC-KINNEY MOLLER");

      // Tokenize AST and assert validity
      const ast = EdiTokenizer.tokenize(x12Payload);
      expect(ast.segments.length).toBeGreaterThan(10);
      const w09Seg = ast.segments.find((s) => s.tag === "W09");
      expect(w09Seg).toBeDefined();
      expect(w09Seg?.elements[0]).toBe("21450");
      expect(w09Seg?.elements[2]).toBe("SM1");
    });
  });

  // ==========================================================================
  // SECTION 3: ANSI X12 310 - OCEAN FREIGHT DETAILS AND INVOICE
  // ==========================================================================
  describe("ANSI X12 310: Ocean Freight Details and Invoice Generation", () => {
    it("generates an official ANSI X12 310 with multi-line freight charges and totals", async () => {
      const invoice: X12OceanInvoice = {
        invoiceNumber: "INV-MAEU-9921",
        billOfLadingNumber: "MAEU9921001",
        invoiceDate: "20261102",
        carrierScac: "MAEU",
        shipper: {
          name: "VALENCIA EXPORT SL",
          city: "VALENCIA",
          countryCode: "ES",
        },
        consignee: {
          name: "ATLANTIC IMPORTS LLC",
          city: "NEW YORK",
          countryCode: "US",
        },
        portOfLoading: "ESVLC",
        portOfDischarge: "USNYC",
        currency: "USD",
        lineItems: [
          {
            chargeCode: "400",
            chargeDescription: "OCEAN FREIGHT 40HC",
            rate: 2600.0,
            basis: "FL",
            amount: 2600.0,
          },
          {
            chargeCode: "BAF",
            chargeDescription: "BUNKER ADJUSTMENT FACTOR",
            rate: 420.0,
            basis: "FL",
            amount: 420.0,
          },
          {
            chargeCode: "THC",
            chargeDescription: "TERMINAL HANDLING CHARGE",
            rate: 240.0,
            basis: "FL",
            amount: 240.0,
          },
        ],
        totalAmount: 3260.0,
        totalWeightKg: 21450,
        totalVolumeCbm: 45.2,
      };

      const x12Payload = X12Service.generate310(
        invoice,
        "MAERSKLINE",
        "ATLASLOG",
      );

      expect(x12Payload).toContain("GS*SI*MAERSKLINE*ATLASLOG*");
      expect(x12Payload).toContain("ST*310*0001~");
      expect(x12Payload).toContain(
        "B3*B*INV-MAEU-9921*MAEU9921001*PP*20261102*3260.00*USD~",
      );
      expect(x12Payload).toContain(
        "L1*1*2600.00*FL*2600.00*400*OCEAN FREIGHT 40HC~",
      );
      expect(x12Payload).toContain(
        "L1*2*420.00*FL*420.00*BAF*BUNKER ADJUSTMENT FACTOR~",
      );
      expect(x12Payload).toContain(
        "L1*3*240.00*FL*240.00*THC*TERMINAL HANDLING CHARGE~",
      );
      expect(x12Payload).toContain("L3*21450*K*45.2*X*3260.00~");

      const ast = EdiTokenizer.tokenize(x12Payload);
      const b3Seg = ast.segments.find((s) => s.tag === "B3");
      expect(b3Seg?.elements[1]).toBe("INV-MAEU-9921");
      expect(b3Seg?.elements[5]).toBe("3260.00");
    });
  });

  // ==========================================================================
  // SECTION 4: ANSI X12 315 - OCEAN STATUS & 997 ACKNOWLEDGMENT INGESTION
  // ==========================================================================
  describe("ANSI X12 315: Ocean Status Ingestion & 997 Functional Acknowledgment", () => {
    it("parses inbound ANSI X12 315 ocean status and produces ANSI X12 997 ACK", async () => {
      const raw315 = [
        "ISA*00*          *00*          *ZZ*MAERSKLINE     *ZZ*ATLASLOG       *261102*1040*U*00401*000000889*0*P*>~",
        "GS*QO*MAERSKLINE*ATLASLOG*20261102*1040*8891*X*004010~",
        "ST*315*0001~",
        "B4***VD*20261102*1030**MSKU*8821901~",
        "N9*BM*MAEU8821901~",
        "N9*BN*BK-2026-9042~",
        "Q2*9839420*US*20261102***18500*K*2601W**MSC ISABELLA~",
        "R4*L*UN*ESVLC***VALENCIA PORT~",
        "R4*D*UN*USNYC***NEW YORK HARBOR~",
        "SE*8*0001~",
        "GE*1*8891~",
        "IEA*1*000000889~",
      ].join("\n");

      const result = await EdiDispatcherService.processInboundPayload(raw315);

      expect(result.standard).toBe("ANSI_X12");
      expect(result.events.length).toBe(1);

      const statusEvent = result.events[0] as any;
      expect(statusEvent.milestone).toBe("VESSEL_DEPARTED");
      expect(statusEvent.bookingReference).toBe("BK-2026-9042");
      expect(statusEvent.containerNumber).toContain("8821901");
      expect(statusEvent.vesselName).toBe("MSC ISABELLA");

      // Verify ANSI X12 997 Functional Acknowledgment was generated
      expect(result.acknowledgment).toBeDefined();
      expect(result.acknowledgment).toContain("ST*997*0001~");
      expect(result.acknowledgment).toContain("AK1*QM*");
      expect(result.acknowledgment).toContain("AK5*A~");
      expect(result.acknowledgment).toContain("AK9*A");
    });
  });
});
