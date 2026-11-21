/**
 * @file purchase-orders-routes.test.ts
 * @description Integration tests for Fastify REST routes for Supply Chain POs,
 * manufacturing milestones, and booking allocations (ADR 0032).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import purchaseOrdersRoutes from "../src/routes/purchase-orders.routes.js";
import { db } from "../src/db/index.js";
import {
  companies,
  bookings,
  purchaseOrders,
  poLineItems,
  productionMilestones,
} from "../src/db/schema/index.js";
import { eq, inArray } from "drizzle-orm";

describe("Supply Chain Purchase Orders & Allocation API", () => {
  let app: FastifyInstance;
  const testBuyerId = "comp_test_po_buyer_01";
  const testSupplierId = "comp_test_po_supplier_01";
  const testBookingId = "bkg_test_po_alloc_01";
  let createdPoId: string;

  beforeAll(async () => {
    const now = new Date();

    // 1. Seed test companies (Buyer & Supplier)
    await db
      .insert(companies)
      .values([
        {
          id: testBuyerId,
          name: "Iberian Retailers Group S.A.",
          taxId: "ESA55443322",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: testSupplierId,
          name: "Shanghai Apex Electronics Co. Ltd.",
          taxId: "CN91310000X123",
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
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 3. Initialize Fastify test app
    app = Fastify();
    await app.register(purchaseOrdersRoutes, {
      prefix: "/api/scm/purchase-orders",
    });
    await app.ready();
  });

  afterAll(async () => {
    if (createdPoId) {
      await db
        .delete(productionMilestones)
        .where(eq(productionMilestones.poId, createdPoId));
      await db.delete(poLineItems).where(eq(poLineItems.poId, createdPoId));
      await db.delete(purchaseOrders).where(eq(purchaseOrders.id, createdPoId));
    }
    await db.delete(bookings).where(eq(bookings.id, testBookingId));
    await db
      .delete(companies)
      .where(inArray(companies.id, [testBuyerId, testSupplierId]));
    if (app) {
      await app.close();
    }
  });

  it("POST /api/scm/purchase-orders - creates a new PO with SKU line items", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/scm/purchase-orders",
      payload: {
        buyerId: testBuyerId,
        supplierId: testSupplierId,
        poNumber: "PO-2026-VAL-901",
        incoterm: "FOB",
        expectedCargoReadyDate: "2026-12-01",
        notes: "Priority shipment for holiday distribution",
        lineItems: [
          {
            skuCode: "SKU-TECH-001",
            description: "Industrial IoT Edge Gateways",
            quantity: 500,
            uom: "PCS",
            hsCode: "851762",
            packageCount: 25,
            grossWeightKg: 2.5,
            volumeCbm: 0.015,
            originalUnitPrice: 120.0,
            originalCurrency: "USD",
          },
          {
            skuCode: "SKU-TECH-002",
            description: "Smart Telemetry Sensors",
            quantity: 1000,
            uom: "PCS",
            hsCode: "903180",
            packageCount: 50,
            grossWeightKg: 0.5,
            volumeCbm: 0.005,
            originalUnitPrice: 45.0,
            originalCurrency: "USD",
          },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.poNumber).toBe("PO-2026-VAL-901");
    expect(body.status).toBe("ISSUED");
    expect(body.lineItems).toHaveLength(2);
    expect(body.lineItems[0].quantity).toBe("500.000");
    expect(body.lineItems[0].allocatedQuantity).toBe("0.000");
    expect(body.lineItems[0].remainingQuantity).toBe("500.000");

    createdPoId = body.id;
  });

  it("GET /api/scm/purchase-orders - lists POs with aggregated totals", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/scm/purchase-orders?limit=10",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body)).toBe(true);

    const found = body.find((p: any) => p.id === createdPoId);
    expect(found).toBeDefined();
    expect(found.totalItemsCount).toBe(2);
    expect(found.totalQuantity).toBe("1500.000");
    expect(found.totalAllocatedQuantity).toBe("0.000");
    expect(found.remainingQuantity).toBe("1500.000");
  });

  it("GET /api/scm/purchase-orders/:id - returns full relational detail", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/scm/purchase-orders/${createdPoId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.id).toBe(createdPoId);
    expect(body.buyerName).toBe("Iberian Retailers Group S.A.");
    expect(body.supplierName).toBe("Shanghai Apex Electronics Co. Ltd.");
    expect(body.lineItems).toHaveLength(2);
  });

  it("POST /api/scm/purchase-orders/:id/milestones - records production milestone and advances status", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/scm/purchase-orders/${createdPoId}/milestones`,
      payload: {
        milestoneCode: "QC_PASSED",
        plannedDate: "2026-11-20",
        actualDate: "2026-11-21",
        notes: "Passed AQL 1.5 standard factory inspection",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("CARGO_READY");
    expect(body.milestones).toHaveLength(1);
    expect(body.milestones[0].milestoneCode).toBe("QC_PASSED");
  });

  it("POST /api/scm/purchase-orders/allocate-booking - splits quantities and updates to PARTIALLY_BOOKED", async () => {
    // First get line items
    const detailRes = await app.inject({
      method: "GET",
      url: `/api/scm/purchase-orders/${createdPoId}`,
    });
    const items = detailRes.json().lineItems;
    const item1 = items.find((i: any) => i.skuCode === "SKU-TECH-001");
    expect(item1).toBeDefined();

    // Allocate 200 out of 500
    const allocResponse = await app.inject({
      method: "POST",
      url: "/api/scm/purchase-orders/allocate-booking",
      payload: {
        poId: createdPoId,
        bookingId: testBookingId,
        allocations: [
          {
            lineItemId: item1.id,
            quantityToAllocate: 200,
          },
        ],
      },
    });

    expect(allocResponse.statusCode).toBe(200);
    const updatedPo = allocResponse.json();
    expect(updatedPo.status).toBe("PARTIALLY_BOOKED");

    const updatedItem1 = updatedPo.lineItems.find(
      (i: any) => i.id === item1.id,
    );
    expect(updatedItem1.allocatedQuantity).toBe("200.000");
    expect(updatedItem1.remainingQuantity).toBe("300.000");
    expect(updatedItem1.bookingId).toBe(testBookingId);
  });

  it("POST /api/scm/purchase-orders/allocate-booking - rejects allocation exceeding remaining quantity", async () => {
    const detailRes = await app.inject({
      method: "GET",
      url: `/api/scm/purchase-orders/${createdPoId}`,
    });
    const items = detailRes.json().lineItems;
    const item1 = items.find((i: any) => i.skuCode === "SKU-TECH-001");

    // Item 1 has 300 remaining; trying to allocate 400
    const failResponse = await app.inject({
      method: "POST",
      url: "/api/scm/purchase-orders/allocate-booking",
      payload: {
        poId: createdPoId,
        bookingId: testBookingId,
        allocations: [
          {
            lineItemId: item1.id,
            quantityToAllocate: 400,
          },
        ],
      },
    });

    expect(failResponse.statusCode).toBe(400);
    expect(failResponse.json().error).toContain(
      "exceeds remaining unallocated quantity",
    );
  });
});
