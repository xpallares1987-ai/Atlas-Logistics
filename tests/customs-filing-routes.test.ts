/**
 * @file customs-filing-routes.test.ts
 * @description Integration tests for Sovereign Customs Authority Gateway Fastify REST routes (ADR 0038).
 * Tests PKI certificate management, clearance declaration submission, transmission ledger audit, and CUSRES webhook ingestion.
 * @module @atlas/tests/customs-filing-routes
 * @see {@link docs/adr/0038-customs-mtls-and-regulatory-filing-gateway.md}
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { customsFilingRoutes } from "../src/routes/customs-filing.routes.js";
import { db } from "../src/db/index.js";
import {
  companies,
  addresses,
  customsClearances,
  customsPkiCertificates,
  customsFilingTransmissions,
} from "../src/db/schema/index.js";
import { eq, inArray } from "drizzle-orm";

describe("Customs Authority Gateway REST Routes (ADR 0038)", () => {
  let app: FastifyInstance;
  const testCompanyId = "comp_test_customs_importer_01";
  const testAddressId = "addr_test_customs_declarant_01";
  const testClearanceId = "clr_test_customs_gateway_01";
  const testClearanceId2 = "clr_test_customs_gateway_02";

  beforeAll(async () => {
    const now = new Date();

    // 1. Seed Company & Address for foreign key compliance
    await db
      .insert(companies)
      .values({
        id: testCompanyId,
        name: "Test Customs Importer BCO Corp",
        taxId: "ESA99887766",
        companyType: "OPERATING",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    await db
      .insert(addresses)
      .values({
        id: testAddressId,
        companyId: testCompanyId,
        companyName: "Test Customs Broker Agency",
        addressType: "CBA",
        taxId: "ESB55443322",
        street1: "Muelle de Poniente s/n",
        city: "Barcelona",
        country: "ES",
        zipCode: "08039",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 2. Clean previous test clearances and certificates if any
    await db
      .delete(customsPkiCertificates)
      .where(
        eq(customsPkiCertificates.certificateAlias, "AEAT_PROD_ESB55443322"),
      );

    await db
      .delete(customsFilingTransmissions)
      .where(
        inArray(customsFilingTransmissions.clearanceId, [
          testClearanceId,
          testClearanceId2,
        ]),
      );

    await db
      .delete(customsClearances)
      .where(
        inArray(customsClearances.id, [testClearanceId, testClearanceId2]),
      );

    // 3. Seed parent test customs clearance
    await db.insert(customsClearances).values([
      {
        id: testClearanceId,
        clearanceNumber: "DUA-2026-TEST-90001",
        mrn: "26ESTEST9000100001",
        procedureType: "IMPORT_4000",
        customsOfficeCode: "ES000801",
        importerCompanyId: testCompanyId,
        declarantAddressId: testAddressId,
        taricCode: "7208380000",
        goodsDescription: "Hot-rolled stainless steel coils",
        originCountryCode: "TR",
        grossMassKg: 20000.0,
        netMassKg: 19500.0,
        customsValueEur: 42000.0,
        assessedDutyAmountEur: 1680.0,
        assessedVatAmountEur: 9172.8,
        totalDisbursementEur: 10852.8,
        routingChannel: "PENDING",
        status: "DRAFT",
        tenantId: "tenant-default",
      },
      {
        id: testClearanceId2,
        clearanceNumber: "DUA-2026-TEST-90002",
        mrn: "26ESTEST9000200002",
        procedureType: "IMPORT_4000",
        customsOfficeCode: "DE004851",
        importerCompanyId: testCompanyId,
        declarantAddressId: testAddressId,
        taricCode: "8471300000",
        goodsDescription: "Portable automatic data processing machines",
        originCountryCode: "TW",
        grossMassKg: 500.0,
        netMassKg: 450.0,
        customsValueEur: 85000.0,
        assessedDutyAmountEur: 0.0,
        assessedVatAmountEur: 17850.0,
        totalDisbursementEur: 17850.0,
        routingChannel: "PENDING",
        status: "DRAFT",
        tenantId: "tenant-default",
      },
    ]);

    // 4. Initialize Fastify instance
    app = Fastify({ logger: false });
    await app.register(customsFilingRoutes);
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("POST /api/customs/certificates registers a PKI digital certificate", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/customs/certificates",
      payload: {
        agency: "AEAT",
        certificateAlias: "AEAT_PROD_ESB55443322",
        thumbprintSha256:
          "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
        issuerDn: "CN=AC FNMT Usuarios, OU=Ceres, O=FNMT-RCM, C=ES",
        subjectDn:
          "CN=Test Customs Broker Agency, 2.5.4.97=VATES-ESB55443322, C=ES",
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: "2028-01-01T23:59:59.000Z",
        keyStorageType: "LOCAL_PKCS12",
        tenantId: "tenant-default",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toMatch(/^cert_/);
    expect(body.agency).toBe("AEAT");
    expect(body.certificateAlias).toBe("AEAT_PROD_ESB55443322");
    expect(body.isRevoked).toBe(false);
  });

  it("GET /api/customs/certificates lists active certificates", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/customs/certificates?agency=AEAT&tenantId=tenant-default",
    });

    expect(res.statusCode).toBe(200);
    const list = res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].agency).toBe("AEAT");
  });

  it("POST /api/customs/filings/submit synthesizes XML and submits filing to customs gateway", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/customs/filings/submit",
      payload: {
        clearanceId: testClearanceId,
        agency: "AEAT",
        protocol: "SOAP_MTLS",
        messageFunction: "ORIGINAL",
        tenantId: "tenant-default",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toMatch(/^tx_/);
    expect(body.clearanceId).toBe(testClearanceId);
    expect(body.agency).toBe("AEAT");
    expect(body.responseStatus).toBe("SUBMITTED");
    expect(body.payloadSha256).toHaveLength(64);
    expect(body.filingReference).toMatch(/^TX-AEAT-/);
  });

  it("GET /api/customs/filings queries the transmission audit ledger", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/customs/filings?clearanceId=${testClearanceId}&tenantId=tenant-default`,
    });

    expect(res.statusCode).toBe(200);
    const list = res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].clearanceId).toBe(testClearanceId);
  });

  it("POST /api/customs/filings/:id/cusres-webhook processes CUSRES with ACCEPTED_GREEN and updates clearance", async () => {
    // 1. Fetch transmission
    const listRes = await app.inject({
      method: "GET",
      url: `/api/customs/filings?clearanceId=${testClearanceId}`,
    });
    const tx = listRes.json()[0];

    // 2. Dispatch CUSRES webhook payload
    const cusresXml = `<?xml version="1.0" encoding="UTF-8"?>
<cusres:CustomsResponse xmlns:cusres="http://wco.org/cusres">
  <cusres:FilingReference>${tx.filingReference}</cusres:FilingReference>
  <cusres:MRN>26ES00080100998877</cusres:MRN>
  <cusres:RoutingChannel>GREEN</cusres:RoutingChannel>
</cusres:CustomsResponse>`;

    const webhookRes = await app.inject({
      method: "POST",
      url: `/api/customs/filings/${tx.id}/cusres-webhook`,
      payload: {
        rawPayload: cusresXml,
        tenantId: "tenant-default",
      },
    });

    expect(webhookRes.statusCode).toBe(200);
    const updatedTx = webhookRes.json();
    expect(updatedTx.responseStatus).toBe("ACCEPTED_GREEN");
    expect(updatedTx.mrnAssigned).toBe("26ES00080100998877");
    expect(updatedTx.acknowledgedAt).toBeDefined();

    // 3. Verify parent clearance record updated in SQLite DB
    const [clearance] = await db
      .select()
      .from(customsClearances)
      .where(eq(customsClearances.id, testClearanceId));

    expect(clearance.routingChannel).toBe("GREEN");
    expect(clearance.status).toBe("LEVANTE_RELEASED");
    expect(clearance.mrn).toBe("26ES00080100998877");
    expect(clearance.levanteReleasedAt).toBeDefined();
  });

  it("POST /api/customs/filings/submit with simulateImmediateAck: true completes in one shot", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/customs/filings/submit",
      payload: {
        clearanceId: testClearanceId2,
        agency: "ATLAS",
        protocol: "SOAP_MTLS",
        messageFunction: "ORIGINAL",
        simulateImmediateAck: true,
        tenantId: "tenant-default",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.responseStatus).toBe("ACCEPTED_GREEN");
    expect(body.mrnAssigned).toMatch(/^26AT/);
    expect(body.acknowledgedAt).toBeDefined();

    // Verify parent clearance
    const [clearance] = await db
      .select()
      .from(customsClearances)
      .where(eq(customsClearances.id, testClearanceId2));

    expect(clearance.routingChannel).toBe("GREEN");
    expect(clearance.status).toBe("LEVANTE_RELEASED");
  });

  it("GET /api/customs/filings/:id returns 404 for unknown transmission", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/customs/filings/tx_non_existent",
    });

    expect(res.statusCode).toBe(404);
  });
});
