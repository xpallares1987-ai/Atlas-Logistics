import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { tradeFinanceRoutes } from "../src/modules/trade-finance/trade-finance.routes.js";
import { db } from "../src/db/index.js";
import * as schema from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";

vi.mock("../src/middleware/auth.js", () => ({
  authMiddleware: vi.fn(async () => {}),
  requireRole: vi.fn(() => async () => {}),
}));

describe("Trade Finance SWIFT MT Parser & Ingestion Endpoints", () => {
  let app: FastifyInstance;
  const testRef = `LC-TEST-${Date.now()}`;
  const testBgRef = `BG-TEST-${Date.now()}`;

  beforeAll(async () => {
    app = Fastify();
    await app.register(tradeFinanceRoutes, { prefix: "/api/trade-finance" });
    await app.ready();
  });

  afterAll(async () => {
    await db
      .delete(schema.tradeCreditInstruments)
      .where(eq(schema.tradeCreditInstruments.instrumentReference, testRef));
    await db
      .delete(schema.tradeCreditInstruments)
      .where(eq(schema.tradeCreditInstruments.instrumentReference, testBgRef));
    await app.close();
  });

  it("POST /api/trade-finance/messages/parse - successfully parses raw MT700", async () => {
    const raw = `{1:F01DBSSSGSGXXXX0000000000}{2:I700BSCHESMMXXXXN}{4:
:27:1/1
:40A:IRREVOCABLE
:20:${testRef}
:31C:260810
:40E:UCP LATEST VERSION
:31D:261210BARCELONA COUNTERS
:50:CATALAN EXPORT TRADING SL
:59:ASIA MARITIME LOGISTICS PTE
:32B:EUR185000,00
:39A:05/05
:41A:BSCHESMMXXX BY PAYMENT
:42C:AT SIGHT
:43P:NOT ALLOWED
:43T:NOT ALLOWED
:44E:ESBCN
:44F:SGSIN
:44C:261120
:45A:HIGH PRECISION MACHINE TOOLS
:46A:1. SIGNED COMMERCIAL INVOICE
2. FULL SET CLEAN ON BOARD BILL OF LADING
:47A:+ CERTIFICATE OF INSPECTION
:49:CONFIRM
-}`;

    const res = await app.inject({
      method: "POST",
      url: "/api/trade-finance/messages/parse",
      payload: { rawMessage: raw },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.messageType).toBe("MT700");
    expect(body.instrumentReference).toBe(testRef);
    expect(body.creditAmount).toBe(185000.0);
    expect(body.currency).toBe("EUR");
    expect(body.tolerancePercentage).toBe(5);
    expect(body.portOfLoading).toBe("ESBCN");
    expect(body.portOfDischarge).toBe("SGSIN");
  });

  it("POST /api/trade-finance/messages/generate-mt760 - formats valid guarantee text", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/trade-finance/messages/generate-mt760",
      payload: {
        instrumentReference: testBgRef,
        senderBic: "BSCHESMMXXX",
        receiverBic: "DBSSSGSGXXX",
        issueDate: "2026-09-15",
        expiryDate: "2027-09-15",
        applicantName: "Atlas Maritime SL",
        beneficiaryName: "Port of Algeciras",
        currency: "EUR",
        guaranteeAmount: 600000.0,
        applicableRules: "URDG758",
        purposeOfGuarantee: "PERFORMANCE_BOND",
        underlyingContractReference: "PORT-DOCK-EXT-2026",
        guaranteeTerms: "DEMAND GUARANTEE PAYABLE UPON FIRST DEMAND",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.messageType).toBe("MT760");
    expect(body.instrumentReference).toBe(testBgRef);
    expect(body.rawMessage).toContain("{2:I760DBSSSGSGXXXXN}");
    expect(body.rawMessage).toContain(`:20:${testBgRef}`);
    expect(body.rawMessage).toContain(":22D:PERFORMANCE_BOND");
  });

  it("POST /api/trade-finance/instruments/ingest-swift-mt - ingests new MT700 and prevents duplicate without forceUpdate", async () => {
    const raw = `{1:F01DBSSSGSGXXXX0000000000}{2:I700BSCHESMMXXXXN}{4:
:27:1/1
:40A:IRREVOCABLE
:20:${testRef}
:31C:260810
:40E:UCP LATEST VERSION
:31D:261210BARCELONA COUNTERS
:50:CATALAN EXPORT TRADING SL
:59:ASIA MARITIME LOGISTICS PTE
:32B:EUR185000,00
:39A:05/05
:41A:BSCHESMMXXX BY PAYMENT
:42C:AT SIGHT
:43P:NOT ALLOWED
:43T:NOT ALLOWED
:44E:ESBCN
:44F:SGSIN
:44C:261120
:45A:HIGH PRECISION MACHINE TOOLS
:46A:1. SIGNED COMMERCIAL INVOICE
2. FULL SET CLEAN ON BOARD BILL OF LADING
:47A:+ CERTIFICATE OF INSPECTION
:49:CONFIRM
-}`;

    // 1. Ingest new instrument
    const res1 = await app.inject({
      method: "POST",
      url: "/api/trade-finance/instruments/ingest-swift-mt",
      payload: { rawMessage: raw },
    });

    expect(res1.statusCode).toBe(201);
    const body1 = res1.json();
    expect(body1.success).toBe(true);
    expect(body1.instrumentReference).toBe(testRef);

    // 2. Duplicate without forceUpdate should return 409 Conflict
    const res2 = await app.inject({
      method: "POST",
      url: "/api/trade-finance/instruments/ingest-swift-mt",
      payload: { rawMessage: raw },
    });

    expect(res2.statusCode).toBe(409);
    expect(res2.json().error).toBe("Instrument reference already exists");

    // 3. Duplicate with forceUpdate: true should succeed with 200 OK
    const res3 = await app.inject({
      method: "POST",
      url: "/api/trade-finance/instruments/ingest-swift-mt",
      payload: { rawMessage: raw, forceUpdate: true },
    });

    expect(res3.statusCode).toBe(200);
    expect(res3.json().success).toBe(true);
  });
});
