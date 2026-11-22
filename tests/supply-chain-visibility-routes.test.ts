/**
 * @file supply-chain-visibility-routes.test.ts
 * @description Integration tests for Fastify REST routes for Supply Chain Visibility,
 * milestone events tracking, predictive exceptions, and resolution (ADR 0033).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import supplyChainVisibilityRoutes from "../src/routes/supply-chain-visibility.routes.js";
import { db } from "../src/db/index.js";
import {
  companies,
  bookings,
  purchaseOrders,
  supplyChainMilestoneEvents,
  supplyChainExceptions,
} from "../src/db/schema/index.js";
import { eq, inArray } from "drizzle-orm";

describe("Supply Chain Visibility & Predictive Milestone Tracking API", () => {
  let app: FastifyInstance;
  const testBuyerId = "comp_test_vis_buyer_01";
  const testSupplierId = "comp_test_vis_supplier_01";
  const testBookingId = "bkg_test_vis_01";
  const testPoId = "po_test_vis_01";
  let generatedExceptionId: string;

  beforeAll(async () => {
    const now = new Date();

    // 1. Seed test companies
    await db
      .insert(companies)
      .values([
        {
          id: testBuyerId,
          name: "Iberian Supermarkets S.A.",
          taxId: "ESA99887766",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: testSupplierId,
          name: "Shenzhen Precision Microelectronics Ltd.",
          taxId: "CN91440300Y888",
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    // 2. Seed test booking
    await db
      .insert(bookings)
      .values({
        id: testBookingId,
        customerId: testBuyerId,
        referenceNumber: "BK-2026-VIS-001",
        status: "Confirmed",
        estimatedDeparture: new Date("2026-12-04T18:00:00Z"),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 3. Seed test Purchase Order
    await db
      .insert(purchaseOrders)
      .values({
        id: testPoId,
        tenantId: "tenant_default",
        buyerId: testBuyerId,
        supplierId: testSupplierId,
        poNumber: "PO-2026-VIS-001",
        incoterm: "FOB",
        expectedCargoReadyDate: "2026-12-01",
        status: "IN_PRODUCTION",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 4. Initialize Fastify test app
    app = Fastify();
    await app.register(supplyChainVisibilityRoutes, {
      prefix: "/api/scm/visibility",
    });
    await app.ready();
  });

  afterAll(async () => {
    // Clean up
    await db
      .delete(supplyChainExceptions)
      .where(eq(supplyChainExceptions.poId, testPoId));
    await db
      .delete(supplyChainMilestoneEvents)
      .where(eq(supplyChainMilestoneEvents.poId, testPoId));
    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, testPoId));
    await db.delete(bookings).where(eq(bookings.id, testBookingId));
    await db
      .delete(companies)
      .where(inArray(companies.id, [testBuyerId, testSupplierId]));
    if (app) {
      await app.close();
    }
  });

  it("GET /api/scm/visibility/purchase-orders/:id/timeline - returns initial timeline with 0 milestones", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/scm/visibility/purchase-orders/${testPoId}/timeline`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.po.id).toBe(testPoId);
    expect(body.milestones).toHaveLength(0);
    expect(body.metrics.totalMilestones).toBe(0);
    expect(body.metrics.activeExceptionsCount).toBe(0);
  });

  it("POST /api/scm/visibility/events - ingests an on-time supplier production milestone", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/scm/visibility/events",
      payload: {
        poId: testPoId,
        milestoneCode: "PRODUCTION_STARTED",
        milestoneCategory: "SUPPLIER_PRODUCTION",
        status: "ACTUAL",
        plannedTimestamp: "2026-11-20T08:00:00Z",
        actualTimestamp: "2026-11-20T08:00:00Z",
        locationCode: "CNSZX",
        locationName: "Shenzhen Factory Unit 4",
        dataSource: "SUPPLIER_PORTAL",
        notes: "Raw materials staged and assembly commenced",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.milestone).toBeDefined();
    expect(body.milestone.milestoneCode).toBe("PRODUCTION_STARTED");
    expect(body.milestone.delayHours).toBe(0);
    expect(body.triggeredException).toBeNull();
  });

  it("POST /api/scm/visibility/events - ingests a delayed milestone and triggers a predictive exception", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/scm/visibility/events",
      payload: {
        poId: testPoId,
        milestoneCode: "FEEDER_DEPARTED",
        milestoneCategory: "CARRIER_TRANSIT",
        status: "ACTUAL",
        plannedTimestamp: "2026-11-22T06:00:00Z",
        actualTimestamp: "2026-11-23T18:00:00Z", // 36 hours delay (> 12h threshold)
        locationCode: "CNSZX",
        vesselName: "PEARL RIVER EXPRESS",
        voyageNumber: "042W",
        carrierCode: "MSCU",
        dataSource: "DCSA_EVENT",
        notes: "Vessel delayed by typhoon warning in South China Sea",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.milestone).toBeDefined();
    expect(body.milestone.delayHours).toBe(36);
    expect(body.triggeredException).toBeDefined();
    expect(body.triggeredException.exceptionCode).toBe("EXC_CARRIER_DELAY");
    expect(body.triggeredException.severity).toBe("HIGH");
    expect(body.triggeredException.delayEstimateHours).toBe(36);

    generatedExceptionId = body.triggeredException.id;
  });

  it("GET /api/scm/visibility/exceptions - lists exceptions with filtering", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/scm/visibility/exceptions?poId=${testPoId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.length).toBeGreaterThanOrEqual(1);
    const exc = body[0];
    expect(exc.poId).toBe(testPoId);
    expect(exc.status).toBe("OPEN");
    expect(Array.isArray(exc.suggestedMitigations)).toBe(true);
  });

  it("POST /api/scm/visibility/exceptions/:id/resolve - records mitigation and resolves exception", async () => {
    expect(generatedExceptionId).toBeDefined();

    const response = await app.inject({
      method: "POST",
      url: `/api/scm/visibility/exceptions/${generatedExceptionId}/resolve`,
      payload: {
        resolvedBy: "user_ops_lead",
        resolutionNotes:
          "Re-booked transshipment feeder connection at Singapore hub to recover 24 hours.",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.id).toBe(generatedExceptionId);
    expect(body.status).toBe("RESOLVED");
    expect(body.resolvedBy).toBe("user_ops_lead");
    expect(body.resolutionNotes).toContain("Re-booked transshipment");
  });

  it("GET /api/scm/visibility/purchase-orders/:id/timeline - verifies updated metrics after resolution", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/scm/visibility/purchase-orders/${testPoId}/timeline`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.milestones).toHaveLength(2);
    expect(body.metrics.totalMilestones).toBe(2);
    expect(body.metrics.completedMilestones).toBe(2);
    expect(body.metrics.progressPercentage).toBe(100);
    // Open exceptions should now be 0 since it was resolved
    expect(body.metrics.activeExceptionsCount).toBe(0);
  });

  it("POST /api/scm/visibility/scan - executes predictive exception sweeper across active POs", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/scm/visibility/scan",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.scannedPosCount).toBeGreaterThanOrEqual(1);
    expect(typeof body.detectedExceptionsCount).toBe("number");
    expect(Array.isArray(body.exceptions)).toBe(true);
  });
});
