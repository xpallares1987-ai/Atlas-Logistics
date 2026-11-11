import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import dcsaRoutes from "../src/routes/dcsa.routes.js";
import { ensureScmFoundationTables } from "../src/scm/kernel/outbox-bus.js";
import { MletrLedgerService } from "../src/services/mletr/mletr-ledger.service.js";

describe("DCSA e-BL v3.0 Maritime Lifecycle & UNCITRAL MLETR", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(dcsaRoutes, { prefix: "/api/dcsa" });
    await app.ready();

    await ensureScmFoundationTables();
    await MletrLedgerService.ensureTables();
  });

  afterAll(async () => {
    await app.close();
  });

  let createdRecordId: string;
  const docRef = `MSKU-${Date.now()}`;

  it("POST /api/dcsa/ebl/issue - should issue a canonical DCSA 3.0 e-BL with Genesis block", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/dcsa/ebl/issue",
      payload: {
        shipmentId: "sh_demo_01",
        documentReference: docRef,
        transportDocumentTypeCode: "BOL",
        isToOrder: true,
        carrierCode: "MSCU",
        carrierName: "Mediterranean Shipping Company S.A.",
        shipper: {
          name: "BioPharma Laboratories Catalonia S.A.",
          address: "Parc Científic de Barcelona, ES",
          countryCode: "ES",
        },
        consignee: {
          name: "NorthEast Health Distribution LLC",
          address: "450 Lexington Ave, New York, NY 10017",
          countryCode: "US",
        },
        portOfLoading: "ESBCN",
        portOfDischarge: "USNYC",
        vesselName: "MSC OSCAR",
        voyageNumber: "2601W",
        numberOfPackages: 24,
        freightPaymentTerms: "PREPAID",
        signerName: "Capitán Marco Rossi",
        signerTitle: "MASTER_MARINER_CARRIER_AGENT",
        details: "DCSA e-BL original issue under UNCITRAL MLETR Model Law",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.recordId).toBeDefined();
    expect(body.data.documentReference).toBe(docRef);
    expect(body.data.status).toBe("ISSUED");
    expect(body.data.genesisHash).toBeDefined();
    expect(body.data.latestTxHash).toBeDefined();

    createdRecordId = body.data.recordId;
  });

  it("GET /api/dcsa/ebl - should list transferable e-BLs", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/dcsa/ebl",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    const found = body.data.find((e: any) => e.id === createdRecordId);
    expect(found).toBeDefined();
    expect(found.documentReference).toBe(docRef);
  });

  it("GET /api/dcsa/ebl/:id - should get single e-BL with block ledger history", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/dcsa/ebl/${createdRecordId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.record.id).toBe(createdRecordId);
    expect(body.data.blocks.length).toBe(1);
    expect(body.data.blocks[0].blockNumber).toBe(1);
    expect(body.data.blocks[0].transferType).toBe("ORIGINAL_ISSUE");
    expect(body.data.verification.isValid).toBe(true);
  });

  it("POST /api/dcsa/ebl/:id/transfer - should transfer title to Bank (Pledge)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/dcsa/ebl/${createdRecordId}/transfer`,
      payload: {
        toParty: "Banco Santander S.A. - Trade Finance Ops",
        toRole: "BANK",
        transferType: "PLEDGE_TO_BANK",
        signerName: "Carlos Delgado (Export Director)",
        details: "Pledged as collateral under Letter of Credit LC-2026-BCN9921",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.newBlockNumber).toBe(2);
    expect(body.data.status).toBe("PLEDGED");
    expect(body.data.toParty).toContain("Banco Santander");
  });

  it("POST /api/dcsa/ebl/:id/endorse - should endorse title to Consignee", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/dcsa/ebl/${createdRecordId}/endorse`,
      payload: {
        toParty: "NorthEast Health Distribution LLC",
        toRole: "CONSIGNEE",
        transferType: "SPECIAL_ENDORSEMENT",
        signerName: "Elena Rodriguez (Santander LC Officer)",
        details: "LC payment settled; title endorsed to legitimate importer",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.newBlockNumber).toBe(3);
    expect(body.data.status).toBe("ENDORSED");
    expect(body.data.toParty).toContain("NorthEast Health");
  });

  it("GET /api/dcsa/ebl/:id/verify - should verify cryptographic integrity of the 3-block chain", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/dcsa/ebl/${createdRecordId}/verify`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.isValid).toBe(true);
    expect(body.data.totalBlocks).toBe(3);
  });

  it("POST /api/dcsa/ebl/:id/surrender - should surrender e-BL to carrier and authorize cargo release", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/dcsa/ebl/${createdRecordId}/surrender`,
      payload: {
        carrierName: "Mediterranean Shipping Company Port Terminal",
        signerName: "James Wilson (Import Customs Broker)",
        notes: "Surrendered at Port Newark Container Terminal for pickup",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.newBlockNumber).toBe(4);
    expect(body.data.status).toBe("SURRENDERED");
    expect(body.data.isSurrendered).toBe(true);
    expect(body.data.releaseAuthorizationCode).toBeDefined();
    expect(body.data.releaseAuthorizationCode).toContain("REL-SH_DEMO_01");
  });

  it("POST /api/dcsa/ebl/:id/transfer - should reject transfer once e-BL is SURRENDERED", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/dcsa/ebl/${createdRecordId}/transfer`,
      payload: {
        toParty: "Unauthorized Third Party LLC",
        toRole: "CONSIGNEE",
        signerName: "Malicious Actor",
      },
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error).toContain("SURRENDERED");
  });
});
