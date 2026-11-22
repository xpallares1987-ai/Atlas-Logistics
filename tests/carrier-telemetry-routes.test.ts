/**
 * @file carrier-telemetry-routes.test.ts
 * @description Integration tests for Fastify REST routes for Multi-Modal Carrier Telemetry Ingestion (ADR 0034).
 * Tests two-tier async buffering, idempotency fingerprints, multi-key resolution, and exception auto-resolution.
 * @module @atlas/tests/carrier-telemetry-routes
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { carrierTelemetryRoutes } from "../src/routes/carrier-telemetry.routes.js";
import { db } from "../src/db/index.js";
import {
  companies,
  bookings,
  purchaseOrders,
  poLineItems,
  supplyChainMilestoneEvents,
  supplyChainExceptions,
  dcsaEventsLog,
} from "../src/db/schema/index.js";
import { eq, inArray } from "drizzle-orm";

describe("Carrier Telemetry Ingestion & Resolution API (ADR 0034)", () => {
  let app: FastifyInstance;
  const testBuyerId = "comp_test_tel_buyer_01";
  const testSupplierId = "comp_test_tel_supplier_01";
  const testBookingId = "bkg_test_tel_01";
  const testPoId = "po_test_tel_01";
  const testPoLineItemId = "poli_test_tel_01";
  const testExceptionId = "sc_exc_test_tel_01";

  beforeAll(async () => {
    const now = new Date();

    // Cleanup stale test records from dcsa_events_log
    await db
      .delete(dcsaEventsLog)
      .where(eq(dcsaEventsLog.carrierBookingReference, "BK-2026-TEL-001"));

    // 1. Seed companies
    await db
      .insert(companies)
      .values([
        {
          id: testBuyerId,
          name: "Global Retail Logistics Corp",
          taxId: "ESB11223344",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: testSupplierId,
          name: "Shenzhen Precision Electronics Co",
          taxId: "CN91440300Y999",
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    // 2. Seed booking
    await db
      .insert(bookings)
      .values({
        id: testBookingId,
        customerId: testBuyerId,
        referenceNumber: "BK-2026-TEL-001",
        status: "Confirmed",
        estimatedDeparture: new Date("2026-12-10T12:00:00Z"),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 3. Seed Purchase Order
    await db
      .insert(purchaseOrders)
      .values({
        id: testPoId,
        tenantId: "tenant_default",
        buyerId: testBuyerId,
        supplierId: testSupplierId,
        poNumber: "PO-2026-TEL-001",
        incoterm: "FOB",
        expectedCargoReadyDate: "2026-12-05",
        status: "IN_PRODUCTION",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 4. Seed PO Line Item allocated to booking
    await db
      .insert(poLineItems)
      .values({
        id: testPoLineItemId,
        tenantId: "tenant_default",
        poId: testPoId,
        bookingId: testBookingId,
        skuCode: "SKU-TEL-MICROCHIP-A1",
        description: "Automotive Microcontroller A1",
        quantity: "5000.000",
        allocatedQuantity: "5000.000",
        uom: "PCS",
        originalUnitPrice: "12.5000",
        originalCurrency: "USD",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 5. Seed open exception that should be auto-resolved
    await db
      .insert(supplyChainExceptions)
      .values({
        id: testExceptionId,
        tenantId: "tenant_default",
        poId: testPoId,
        bookingId: testBookingId,
        exceptionCode: "EXC_CUSTOMS_HOLD_RISK",
        exceptionCategory: "CUSTOMS_HOLD",
        severity: "HIGH",
        status: "OPEN",
        title: "Customs Inspection Required",
        description: "Pending customs inspection at destination port",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // Setup Fastify instance
    app = Fastify({ logger: false });
    await app.register(carrierTelemetryRoutes, {
      prefix: "/api/scm/telemetry",
    });
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();

    // Cleanup test records
    await db
      .delete(dcsaEventsLog)
      .where(eq(dcsaEventsLog.carrierBookingReference, "BK-2026-TEL-001"));
    await db
      .delete(supplyChainExceptions)
      .where(eq(supplyChainExceptions.id, testExceptionId));
    await db
      .delete(supplyChainMilestoneEvents)
      .where(eq(supplyChainMilestoneEvents.poId, testPoId));
    await db.delete(poLineItems).where(eq(poLineItems.poId, testPoId));
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, testPoId));
    await db.delete(bookings).where(eq(bookings.id, testBookingId));
    await db
      .delete(companies)
      .where(inArray(companies.id, [testBuyerId, testSupplierId]));
  });

  describe("POST /api/scm/telemetry/ingress", () => {
    it("buffers a new telemetry event and returns 202 ACCEPTED with fingerprint", async () => {
      const payload = {
        carrierCode: "MSCU",
        eventType: "TRANSPORT",
        eventTypeCode: "RELE",
        carrierBookingReference: "BK-2026-TEL-001",
        locationLocode: "ESVLC",
        eventDateTime: "2026-11-22T15:00:00Z",
        rawPayload: {
          eventTypeCode: "RELE",
          carrierBookingReference: "BK-2026-TEL-001",
          locationLocode: "ESVLC",
          timestamp: "2026-11-22T15:00:00Z",
        },
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/scm/telemetry/ingress",
        payload,
      });

      expect(response.statusCode).toBe(202);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("ACCEPTED");
      expect(body.duplicate).toBe(false);
      expect(body.eventId).toBeDefined();
      expect(body.eventFingerprint).toBeDefined();
    });

    it("detects duplicate payloads and returns 200 with duplicate: true (idempotency)", async () => {
      const payload = {
        carrierCode: "MSCU",
        eventType: "TRANSPORT",
        eventTypeCode: "RELE",
        carrierBookingReference: "BK-2026-TEL-001",
        locationLocode: "ESVLC",
        eventDateTime: "2026-11-22T15:00:00Z",
        rawPayload: {
          eventTypeCode: "RELE",
          carrierBookingReference: "BK-2026-TEL-001",
          locationLocode: "ESVLC",
          timestamp: "2026-11-22T15:00:00Z",
        },
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/scm/telemetry/ingress",
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("DUPLICATE");
      expect(body.duplicate).toBe(true);
    });
  });

  describe("POST /api/scm/telemetry/events/:id/process", () => {
    it("resolves multi-key context and auto-resolves matching predictive exceptions", async () => {
      // 1. Ingress a RELE event
      const ingressRes = await app.inject({
        method: "POST",
        url: "/api/scm/telemetry/ingress",
        payload: {
          carrierCode: "MSCU",
          eventType: "SHIPMENT",
          eventTypeCode: "RELE",
          carrierBookingReference: "BK-2026-TEL-001",
          locationLocode: "ESVLC",
          eventDateTime: "2026-11-22T16:00:00Z",
          rawPayload: {
            eventTypeCode: "RELE",
            carrierBookingReference: "BK-2026-TEL-001",
            locationLocode: "ESVLC",
            timestamp: "2026-11-22T16:00:00Z",
          },
        },
      });

      const { eventId } = JSON.parse(ingressRes.body);

      // 2. Process the event
      const processRes = await app.inject({
        method: "POST",
        url: `/api/scm/telemetry/events/${eventId}/process`,
      });

      expect(processRes.statusCode).toBe(200);
      const processBody = JSON.parse(processRes.body);
      expect(processBody.success).toBe(true);
      expect(processBody.result.canonicalMilestoneCode).toBe(
        "CUSTOMS_RELEASED",
      );
      expect(processBody.result.autoResolvedExceptionCategory).toBe(
        "CUSTOMS_HOLD",
      );
      expect(processBody.result.autoResolvedCount).toBeGreaterThan(0);
      expect(processBody.result.resolvedContext.poId).toBe(testPoId);

      // 3. Verify exception status in database
      const updatedExc = await db
        .select()
        .from(supplyChainExceptions)
        .where(eq(supplyChainExceptions.id, testExceptionId))
        .limit(1);

      expect(updatedExc[0].status).toBe("RESOLVED");
      expect(updatedExc[0].resolutionNotes).toContain("Auto-resolved");
    });
  });

  describe("POST /api/scm/telemetry/process-queue", () => {
    it("processes a batch of queued events", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/scm/telemetry/process-queue?batchSize=10",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(typeof body.processed).toBe("number");
      expect(typeof body.failed).toBe("number");
    });
  });

  describe("GET /api/scm/telemetry/feed", () => {
    it("returns the recent live telemetry stream", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/scm/telemetry/feed?limit=10",
      });

      expect(response.statusCode).toBe(200);
      const feed = JSON.parse(response.body);
      expect(Array.isArray(feed)).toBe(true);
      expect(feed.length).toBeGreaterThan(0);
      expect(feed[0].eventId).toBeDefined();
    });
  });

  describe("POST /api/scm/telemetry/simulate", () => {
    it("buffers and processes an event in a single atomic call", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/scm/telemetry/simulate",
        payload: {
          carrierCode: "MAEU",
          eventType: "TRANSPORT",
          eventTypeCode: "LOAD",
          carrierBookingReference: "BK-2026-TEL-001",
          locationLocode: "ESVLC",
          eventDateTime: "2026-11-22T17:00:00Z",
          rawPayload: {
            eventTypeCode: "LOAD",
            carrierBookingReference: "BK-2026-TEL-001",
            locationLocode: "ESVLC",
            timestamp: "2026-11-22T17:00:00Z",
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ingress).toBeDefined();
      expect(body.processed).toBeDefined();
      expect(body.processed.canonicalMilestoneCode).toBe("CONTAINER_LOADED");
    });
  });
});
