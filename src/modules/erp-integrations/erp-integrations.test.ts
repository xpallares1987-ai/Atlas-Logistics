import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import erpIntegrationsRoutes from "./erp-integrations.routes.js";
import { ERP_DEMO_PRESETS } from "@atlas/shared";

describe("ERP Integrations Module: Fastify API Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(erpIntegrationsRoutes, { prefix: "/api/erp-integrations" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/erp-integrations/status - should return connector health & telemetry", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/erp-integrations/status",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.connectors)).toBe(true);
    expect(body.connectors.length).toBe(2);

    const sap = body.connectors.find((c: any) => c.system === "SAP_S4HANA");
    const netSuite = body.connectors.find((c: any) => c.system === "ORACLE_NETSUITE");

    expect(sap).toBeDefined();
    expect(sap.status).toBe("ONLINE");
    expect(sap.activeAuthMethod).toBe("ODATA_CSRF");

    expect(netSuite).toBeDefined();
    expect(netSuite.status).toBe("ONLINE");
    expect(netSuite.activeAuthMethod).toBe("SUITETALK_TBA_HMAC256");
  });

  it("GET /api/erp-integrations/presets - should return demonstration presets", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/erp-integrations/presets",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.presets.sap_automotive_tier1).toBeDefined();
    expect(body.presets.netsuite_retail_hightech).toBeDefined();
  });

  it("POST /api/erp-integrations/sap/sync-po - should ingest SAP Purchase Order", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/erp-integrations/sap/sync-po",
      payload: {
        poNumber: "PO-4500091823",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.purchaseOrder).toBe("PO-4500091823");
    expect(body.data.items.length).toBe(2);
    expect(body.csrfToken).toBeTruthy();
  });

  it("POST /api/erp-integrations/sap/post-delivery - should create Inbound Delivery ASN in SAP", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/erp-integrations/sap/post-delivery",
      payload: {
        poNumber: "PO-4500091823",
        billOfLading: "MSCUBCN881920",
        carrierName: "MSC Mediterranean Shipping",
        containerId: "MSCU9918201",
        items: [
          { material: "MAT-AUTO-ENG-V6", quantity: 40 },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.deliveryDocument).toMatch(/^18000/);
    expect(body.data.status).toBe("CREATED_CONFIRMED");
  });

  it("POST /api/erp-integrations/sap/post-freight-accrual - should post Service Entry Sheet (SES)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/erp-integrations/sap/post-freight-accrual",
      payload: {
        poNumber: "PO-4500091823",
        freightAmount: 14500,
        currency: "EUR",
        costCenter: "CC-LOG-01",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.serviceEntrySheet).toMatch(/^SES-2026-/);
    expect(body.totalAccruedAmount).toBe(14500);
    expect(body.status).toBe("APPROVED_FOR_PAYMENT");
  });

  it("POST /api/erp-integrations/netsuite/sync-order - should ingest NetSuite Purchase Order", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/erp-integrations/netsuite/sync-order",
      payload: {
        orderNumber: "PO-NS-884210",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.tranId).toBe("PO-NS-884210");
    expect(body.data.item.length).toBe(2);
    expect(body.tbaAuthHeader).toContain("OAuth realm=");
  });

  it("POST /api/erp-integrations/netsuite/post-receipt - should post Item Receipt with Landed Cost allocation", async () => {
    const preset = ERP_DEMO_PRESETS.netsuite_retail_hightech;
    const res = await app.inject({
      method: "POST",
      url: "/api/erp-integrations/netsuite/post-receipt",
      payload: {
        orderNumber: preset.sampleInput.referenceNumber,
        bolNumber: "HLCUTPE99120",
        totalFreight: preset.sampleInput.freightChargesUsd,
        method: "VOLUME",
        items: preset.sampleInput.items,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.receiptId).toMatch(/^IR-NS-/);
    expect(body.landedCost.totalLandedFreight).toBe(9800);
    expect(body.landedCost.items.length).toBe(3);
    expect(body.glPostingStatus).toBe("POSTED");
  });

  it("POST /api/erp-integrations/queue/batch - should process batch offline queued mutations", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/erp-integrations/queue/batch",
      payload: {
        mutations: [
          {
            id: "tx-off-001",
            erpSystem: "SAP_S4HANA",
            operation: "POST_INBOUND_DELIVERY",
            payloadJson: "{}",
          },
          {
            id: "tx-off-002",
            erpSystem: "ORACLE_NETSUITE",
            operation: "POST_ITEM_RECEIPT",
            payloadJson: "{}",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.processedCount).toBe(2);
  });

  it("GET /api/erp-integrations/audit-logs - should return audit trail with cryptographic hashes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/erp-integrations/audit-logs",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.logs)).toBe(true);
    expect(body.logs.length).toBeGreaterThan(0);
  });
});
