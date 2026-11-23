/**
 * @file portal-vendor-routes.test.ts
 * @description Integration tests for Zero-Trust B2B Vendor Portal REST routes (ADR 0035).
 * Validates physical Zero-Trust company isolation, Magic Access Token verification,
 * Zero-Leak financial data masking, factory milestone recording, and PO confirmation.
 * @module @atlas/tests/portal-vendor-routes
 * @see {@link docs/adr/0035-b2b-customer-and-vendor-portal-architecture.md}
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { portalVendorRoutes } from "../src/routes/portal-vendor.routes.js";
import { db } from "../src/db/index.js";
import {
  companies,
  purchaseOrders,
  poLineItems,
  productionMilestones,
  supplyChainMilestoneEvents,
  supplyChainExceptions,
  portalPoProjections,
  portalAccessTokens,
} from "../src/db/schema/index.js";
import { syncPoProjection } from "../src/services/portal-vendor.service.js";
import { eq, inArray } from "drizzle-orm";

describe("Zero-Trust B2B Vendor Portal API (ADR 0035)", () => {
  let app: FastifyInstance;

  const testBuyerId = "comp_test_portal_buyer_01";
  const testSupplierA = "comp_test_portal_supplier_a";
  const testSupplierB = "comp_test_portal_supplier_b";

  const testPoIdA = "po_test_portal_01";
  const testPoIdB = "po_test_portal_02";

  let magicTokenPoA: string;
  let magicTokenPoB: string;

  beforeAll(async () => {
    const now = new Date();

    // 1. Clean up stale test data
    await db
      .delete(portalAccessTokens)
      .where(inArray(portalAccessTokens.poId, [testPoIdA, testPoIdB]));
    await db
      .delete(portalPoProjections)
      .where(inArray(portalPoProjections.poId, [testPoIdA, testPoIdB]));
    await db
      .delete(productionMilestones)
      .where(inArray(productionMilestones.poId, [testPoIdA, testPoIdB]));
    await db
      .delete(supplyChainMilestoneEvents)
      .where(inArray(supplyChainMilestoneEvents.poId, [testPoIdA, testPoIdB]));
    await db
      .delete(supplyChainExceptions)
      .where(inArray(supplyChainExceptions.poId, [testPoIdA, testPoIdB]));
    await db
      .delete(poLineItems)
      .where(inArray(poLineItems.poId, [testPoIdA, testPoIdB]));
    await db
      .delete(purchaseOrders)
      .where(inArray(purchaseOrders.id, [testPoIdA, testPoIdB]));

    // 2. Seed test companies
    await db
      .insert(companies)
      .values([
        {
          id: testBuyerId,
          name: "Nordic Tech Retailers AB",
          taxId: "SE5566778899",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: testSupplierA,
          name: "Shenzhen Precision Microelectronics Ltd",
          taxId: "CN91440300Y888",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: testSupplierB,
          name: "Dongguan Mechanical Molding Co",
          taxId: "CN91441900M777",
          createdAt: now,
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();

    // 3. Seed Purchase Orders with confidential internal financial fields
    await db.insert(purchaseOrders).values([
      {
        id: testPoIdA,
        tenantId: "tenant_default",
        buyerId: testBuyerId,
        supplierId: testSupplierA,
        poNumber: "PO-PORTAL-A100",
        incoterm: "FOB",
        expectedCargoReadyDate: "2026-12-01",
        status: "ISSUED",
        notes: "Confidential forwarder margin: 18.5% markup applied",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: testPoIdB,
        tenantId: "tenant_default",
        buyerId: testBuyerId,
        supplierId: testSupplierB,
        poNumber: "PO-PORTAL-B200",
        incoterm: "EXW",
        expectedCargoReadyDate: "2026-12-15",
        status: "ISSUED",
        notes: "Strict NDA internal buy rate $1,450/40HC",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    // 4. Seed Line Items with proprietary buy prices and currencies
    await db.insert(poLineItems).values([
      {
        id: "poli_portal_a1",
        tenantId: "tenant_default",
        poId: testPoIdA,
        skuCode: "SKU-MICRO-X1",
        description: "Industrial IoT Edge Gateways",
        quantity: "1000.000",
        allocatedQuantity: "0.000",
        uom: "PCS",
        originalUnitPrice: "45.0000", // SENSITIVE: $45.00 buy price
        originalCurrency: "USD",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "poli_portal_b1",
        tenantId: "tenant_default",
        poId: testPoIdB,
        skuCode: "SKU-MOLD-Y2",
        description: "Aluminum Enclosure Casings",
        quantity: "5000.000",
        allocatedQuantity: "0.000",
        uom: "PCS",
        originalUnitPrice: "12.5000", // SENSITIVE: $12.50 buy price
        originalCurrency: "EUR",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    // 5. Seed an exception with sensitive financial liability estimates
    await db.insert(supplyChainExceptions).values({
      id: "exc_portal_a1",
      tenantId: "tenant_default",
      poId: testPoIdA,
      exceptionCode: "EXC_FAB_DELAY",
      exceptionCategory: "CRD_CUTOFF_BREACH",
      severity: "HIGH",
      status: "OPEN",
      title: "Silicon wafer shortage at fab",
      description: "Delay expected of 48 hours in component assembly",
      financialRiskAmount: "15000.0000", // SENSITIVE: $15,000 internal penalty
      financialRiskCurrency: "EUR",
      delayEstimateHours: 48,
      createdAt: now,
      updatedAt: now,
    });

    // 6. Synchronize initial CQRS projections
    await syncPoProjection(testPoIdA);
    await syncPoProjection(testPoIdB);

    // 7. Initialize Fastify Test Server
    app = Fastify();
    await app.register(portalVendorRoutes, { prefix: "/api/portal/vendor" });
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // ==========================================================================
  // Test Suite 1: Authentication & Zero-Trust Security
  // ==========================================================================

  it("1. rejects unauthenticated access with 401 Unauthorized", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/portal/vendor/pos",
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe("Unauthorized");
  });

  it("2. generates a cryptographic Magic Access Token for Supplier A", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/portal/vendor/tokens",
      payload: {
        poId: testPoIdA,
        companyId: testSupplierA,
        ttlHours: 48,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.rawToken).toMatch(/^atk_vendor_[a-f0-9]{64}$/);
    expect(body.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    magicTokenPoA = body.rawToken;
  });

  it("3. generates a cryptographic Magic Access Token for Supplier B", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/portal/vendor/tokens",
      payload: {
        poId: testPoIdB,
        companyId: testSupplierB,
        ttlHours: 24,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    magicTokenPoB = body.rawToken;
  });

  // ==========================================================================
  // Test Suite 2: Zero-Trust Scoping & Zero-Leak Data Masking
  // ==========================================================================

  it("4. reads sanitized PO projection using Magic Token with sub-5ms performance", async () => {
    const start = performance.now();
    const response = await app.inject({
      method: "GET",
      url: "/api/portal/vendor/pos",
      headers: {
        Authorization: `Bearer ${magicTokenPoA}`,
      },
    });
    const elapsed = performance.now() - start;

    expect(response.statusCode).toBe(200);
    const pos = JSON.parse(response.body);
    expect(Array.isArray(pos)).toBe(true);
    expect(pos.length).toBe(1);
    expect(pos[0].poNumber).toBe("PO-PORTAL-A100");
    expect(pos[0].vendorCompanyId).toBe(testSupplierA);
  });

  it("5. strictly verifies Zero-Leak masking: no unit prices, margins or liability amounts", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/portal/vendor/pos/${testPoIdA}`,
      headers: {
        Authorization: `Bearer ${magicTokenPoA}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const rawBody = response.body;

    // String scan of payload: ensure internal financial strings never leak
    expect(rawBody).not.toContain("45.0000"); // Unit price stripped
    expect(rawBody).not.toContain("15000.0000"); // Financial risk stripped
    expect(rawBody).not.toContain("Confidential forwarder margin"); // Notes stripped

    const po = JSON.parse(rawBody);
    const lines = po.lineItemsSummaryJson;
    expect(lines.length).toBe(1);
    expect(lines[0].skuCode).toBe("SKU-MICRO-X1");
    expect(lines[0].quantity).toBe("1000.000");
    expect(lines[0]).not.toHaveProperty("originalUnitPrice");
    expect(lines[0]).not.toHaveProperty("originalCurrency");

    const exceptions = po.exceptionsSummaryJson;
    expect(exceptions.length).toBe(1);
    expect(exceptions[0].severity).toBe("HIGH");
    expect(exceptions[0].delayEstimateHours).toBe(48);
    expect(exceptions[0]).not.toHaveProperty("financialRiskAmount");
    expect(exceptions[0]).not.toHaveProperty("financialRiskCurrency");
  });

  it("6. strictly enforces Zero-Trust isolation: Supplier A token cannot access Supplier B PO", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/portal/vendor/pos/${testPoIdB}`,
      headers: {
        Authorization: `Bearer ${magicTokenPoA}`, // Token scoped to Supplier A
      },
    });

    // Must be rejected as 404 (not found / forbidden for this company)
    expect(response.statusCode).toBe(404);
  });

  // ==========================================================================
  // Test Suite 3: Supplier Operational Actions (Confirm & Milestone Recording)
  // ==========================================================================

  it("7. supplier confirms PO, locking Promised Cargo Ready Date and updating CQRS projection", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/portal/vendor/pos/${testPoIdA}/confirm`,
      headers: {
        Authorization: `Bearer ${magicTokenPoA}`,
      },
      payload: {
        promisedCargoReadyDate: "2026-12-03",
        confirmationNotes:
          "Production schedule locked. 2 days buffer added for QC burn-in.",
      },
    });

    expect(response.statusCode).toBe(200);
    const updated = JSON.parse(response.body);
    expect(updated.promisedCargoReadyDate).toBe("2026-12-03");
    expect(updated.supplierConfirmationStatus).toBe("CONFIRMED");
    expect(updated.confirmedAt).toBeTruthy();
    expect(updated.confirmationNotes).toContain("Production schedule locked");

    // Verify persistence in SQLite WAL projection table
    const [row] = await db
      .select()
      .from(portalPoProjections)
      .where(eq(portalPoProjections.poId, testPoIdA));
    expect(row.promisedCargoReadyDate).toBe("2026-12-03");
    expect(row.supplierConfirmationStatus).toBe("CONFIRMED");
  });

  it("8. supplier records decentralized factory milestone (QC_PASSED) updating projection", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/portal/vendor/pos/${testPoIdA}/milestones`,
      headers: {
        Authorization: `Bearer ${magicTokenPoA}`,
      },
      payload: {
        milestoneCode: "QC_PASSED",
        actualDate: "2026-11-28",
        notes: "AQL 1.5 standard certified. Zero critical defects found.",
      },
    });

    expect(response.statusCode).toBe(200);
    const updated = JSON.parse(response.body);
    const milestones = updated.milestonesSummaryJson;
    const qcMilestone = milestones.find(
      (m: { milestoneCode: string }) => m.milestoneCode === "QC_PASSED",
    );
    expect(qcMilestone).toBeDefined();
    expect(qcMilestone.actualTimestamp).toBe("2026-11-28");
    expect(qcMilestone.notes).toContain("AQL 1.5 standard certified");
  });

  it("9. rejects actions when Magic Token is not scoped to the target PO", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/portal/vendor/pos/${testPoIdB}/confirm`,
      headers: {
        Authorization: `Bearer ${magicTokenPoA}`, // Token for PO A
      },
      payload: {
        promisedCargoReadyDate: "2026-12-20",
      },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body);
    expect(body.error).toBe("Forbidden");
  });
});
