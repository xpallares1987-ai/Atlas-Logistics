/**
 * @file trade-finance-iso20022-pacs008-settlement.test.ts
 * @description Integration test suite for Letter of Credit (LC) settlement honouring via ISO 20022 pacs.008.001.08 transfers,
 * verifying UCP 600 compliance checks, banking_transmissions generation, and RBAC authorization.
 * @module @atlas/tests/trade-finance-iso20022-pacs008-settlement
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 */

import { describe, it, expect, beforeAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import jwt from "@fastify/jwt";
import { db } from "../src/db/index.js";
import * as schema from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";
import { tradeFinanceRoutes } from "../src/modules/trade-finance/trade-finance.routes.js";
import { swiftIso20022Service } from "../src/services/swift-iso20022.service.js";

const TEST_JWT_SECRET =
  process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
    ? process.env.JWT_SECRET
    : "test-secret-key-that-is-at-least-32-chars-long-security!";

describe("Trade Finance SWIFT ISO 20022 pacs.008 LC Settlement Suite", () => {
  let app: FastifyInstance;

  const signToken = (payload: {
    id: string;
    role: string;
    companyId?: string;
  }) => {
    return app.jwt.sign(payload);
  };

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: TEST_JWT_SECRET });

    // Mock auth middleware for route preHandlers
    app.decorate("authenticate", async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        return reply
          .code(401)
          .send({ error: "Unauthorized", message: "Missing or invalid token" });
      }
    });

    await app.register(tradeFinanceRoutes, { prefix: "/api/trade-finance" });
    await app.ready();
  });

  it("should successfully generate pacs.008 wire transfer and transition accepted LC to HONOURED_PAID", async () => {
    const instrumentId = `inst_test_${Date.now()}`;
    const instrumentRef = `LC-TEST-ACCEPTED-${Date.now()}`;

    // 1. Insert accepted instrument
    await db.insert(schema.tradeCreditInstruments).values({
      id: instrumentId,
      instrumentReference: instrumentRef,
      instrumentType: "COMMERCIAL_LC_CONFIRMED",
      applicableRules: "UCP600",
      applicantName: "Atlas Global Importer SL",
      beneficiaryName: "Nordic Industrial Export AB",
      beneficiaryCountry: "SE",
      issuingBankBic: "CAIXESBBXXX",
      issuingBankName: "CaixaBank SA",
      confirmingBankBic: "NDEASESSXXX",
      currency: "EUR",
      creditAmount: 185000.0,
      issueDate: "2026-10-01",
      latestShipmentDate: "2026-11-15",
      expiryDate: "2026-11-30",
      expiryPlace: "Stockholm, Sweden",
      portOfLoading: "ESBCN",
      portOfDischarge: "SEGOT",
      goodsDescriptionSummary:
        "Industrial Automation Equipment and Precision Robotics",
      status: "ACCEPTED",
    });

    const accountingToken = signToken({
      id: "usr_acct_01",
      role: "ACCOUNTING",
      companyId: "c-1",
    });

    // 2. Execute honour-settlement endpoint
    const res = await app.inject({
      method: "POST",
      url: `/api/trade-finance/instruments/${instrumentId}/honour-settlement`,
      headers: { authorization: `Bearer ${accountingToken}` },
      payload: {
        debtorIban: "ES9121000418450200051332",
        creditorIban: "SE4550000000058791234567",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.instrumentId).toBe(instrumentId);
    expect(body.messageType).toBe("PACS_008");
    expect(body.totalAmount).toBe(185000.0);
    expect(body.currency).toBe("EUR");
    expect(body.status).toBe("ACKED");
    expect(body.payloadHashSha256).toHaveLength(64);

    // 3. Verify banking_transmissions record in SQLite
    const [transmission] = await db
      .select()
      .from(schema.bankingTransmissions)
      .where(eq(schema.bankingTransmissions.id, body.transmissionId));

    expect(transmission).toBeDefined();
    expect(transmission.messageType).toBe("PACS_008");
    expect(transmission.payloadXml).toContain("pacs.008.001.08");
    expect(transmission.payloadXml).toContain("head.001.001.02");
    expect(transmission.payloadXml).toContain(instrumentRef);

    // 4. Verify instrument status transitioned to HONOURED_PAID
    const [updatedInstrument] = await db
      .select()
      .from(schema.tradeCreditInstruments)
      .where(eq(schema.tradeCreditInstruments.id, instrumentId));

    expect(updatedInstrument.status).toBe("HONOURED_PAID");
  });

  it("should reject settlement if instrument is in DISCREPANCIES_FOUND with open un-waived discrepancies", async () => {
    const instrumentId = `inst_test_discrep_${Date.now()}`;
    const instrumentRef = `LC-TEST-DISCREP-${Date.now()}`;

    await db.insert(schema.tradeCreditInstruments).values({
      id: instrumentId,
      instrumentReference: instrumentRef,
      instrumentType: "COMMERCIAL_LC_IRREVOCABLE",
      applicableRules: "UCP600",
      applicantName: "Atlas Operations SL",
      beneficiaryName: "Shanghai Metalworks Co",
      beneficiaryCountry: "CN",
      issuingBankBic: "SABDESBBXXX",
      issuingBankName: "Banco Sabadell",
      currency: "EUR",
      creditAmount: 95000.0,
      issueDate: "2026-10-05",
      latestShipmentDate: "2026-11-10",
      expiryDate: "2026-11-25",
      expiryPlace: "Shanghai, China",
      portOfLoading: "CNSHA",
      portOfDischarge: "ESVLC",
      goodsDescriptionSummary: "Aluminium coils and cold rolled steel sheets",
      status: "DISCREPANCIES_FOUND",
    });

    // Record open discrepancy
    await db.insert(schema.tradeDiscrepancies).values({
      id: `discr_${Date.now()}`,
      instrumentId,
      discrepancyRuleCode: "UCP600_ART_14_LATE_PRESENTATION",
      articleReference: "UCP 600 Art. 14(c)",
      severity: "CRITICAL_REFUSAL",
      description:
        "Document presented 28 days after transport document date (exceeds 21-day limit)",
      suggestedRemedy: "Obtain applicant waiver",
      status: "OPEN",
    });

    const accountingToken = signToken({
      id: "usr_acct_01",
      role: "ACCOUNTING",
      companyId: "c-1",
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/trade-finance/instruments/${instrumentId}/honour-settlement`,
      headers: { authorization: `Bearer ${accountingToken}` },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.message).toContain("unresolved/unwaived UCP 600 discrepancies");
  });

  it("should allow settlement when discrepancies exist but all have been marked WAIVER_ACCEPTED", async () => {
    const instrumentId = `inst_test_waived_${Date.now()}`;
    const instrumentRef = `LC-TEST-WAIVED-${Date.now()}`;

    await db.insert(schema.tradeCreditInstruments).values({
      id: instrumentId,
      instrumentReference: instrumentRef,
      instrumentType: "COMMERCIAL_LC_IRREVOCABLE",
      applicableRules: "UCP600",
      applicantName: "Atlas Operations SL",
      beneficiaryName: "Hamburg Spedition GmbH",
      beneficiaryCountry: "DE",
      issuingBankBic: "BBVAESMMXXX",
      issuingBankName: "Banco Bilbao Vizcaya Argentaria",
      currency: "EUR",
      creditAmount: 64000.0,
      issueDate: "2026-10-05",
      latestShipmentDate: "2026-11-10",
      expiryDate: "2026-11-25",
      expiryPlace: "Hamburg, Germany",
      portOfLoading: "DEHAM",
      portOfDischarge: "ESBIO",
      goodsDescriptionSummary: "Machinery parts and specialized gearboxes",
      status: "DISCREPANCIES_FOUND",
    });

    // Record discrepancy with WAIVER_ACCEPTED
    await db.insert(schema.tradeDiscrepancies).values({
      id: `discr_waived_${Date.now()}`,
      instrumentId,
      discrepancyRuleCode: "ISBP745_A19_SPELLING_TYPO",
      articleReference: "ISBP 745 Para A19",
      severity: "MINOR_WAIVABLE",
      description: "Minor typographical error in commercial invoice header",
      suggestedRemedy: "Applicant waiver accepted",
      status: "WAIVER_ACCEPTED",
    });

    const controllerToken = signToken({
      id: "usr_ctrl_01",
      role: "CONTROLLING",
      companyId: "c-1",
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/trade-finance/instruments/${instrumentId}/honour-settlement`,
      headers: { authorization: `Bearer ${controllerToken}` },
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.messageType).toBe("PACS_008");

    const [updatedInstrument] = await db
      .select()
      .from(schema.tradeCreditInstruments)
      .where(eq(schema.tradeCreditInstruments.id, instrumentId));

    expect(updatedInstrument.status).toBe("HONOURED_PAID");
  });

  it("should enforce RBAC authorization and return 401/403 for unauthenticated or under-privileged users", async () => {
    // 1. Unauthenticated request -> 401
    const unauthRes = await app.inject({
      method: "POST",
      url: "/api/trade-finance/instruments/some-id/honour-settlement",
      payload: {},
    });
    expect(unauthRes.statusCode).toBe(401);

    // 2. Customer role -> 403
    const customerToken = signToken({
      id: "usr_cust_01",
      role: "CUSTOMER",
      companyId: "c-1",
    });
    const forbiddenRes = await app.inject({
      method: "POST",
      url: "/api/trade-finance/instruments/some-id/honour-settlement",
      headers: { authorization: `Bearer ${customerToken}` },
      payload: {},
    });
    expect(forbiddenRes.statusCode).toBe(403);
    expect(forbiddenRes.json().code).toBe("INSUFFICIENT_ROLE");
  });
});
