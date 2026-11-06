import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("../../middleware/auth.js", () => ({
  authMiddleware: vi.fn(async () => {}),
  requireRole: vi.fn(() => async () => {}),
}));

vi.mock("oslo/password", () => ({
  Argon2id: vi.fn().mockImplementation(() => ({
    hash: vi.fn(async () => "mocked-hash"),
    verify: vi.fn(async () => true),
  })),
}));

import app from "../../app.js";

describe("Demurrage Dispute Relational Endpoints", () => {
  beforeAll(async () => {
    await app.ready();
    // Ensure Phase 5 is seeded
    await app.inject({
      method: "POST",
      url: "/api/admin/seed/5",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/demurrage-dispute/invoices should return relational invoices for sh_demo_01", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/demurrage-dispute/invoices?shipmentId=sh_demo_01",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    const inv = body[0];
    expect(inv.id).toBe("dinv_sh_demo_01");
    expect(inv.containerNumber).toBe("MSKU9284712");
    expect(inv.fmcCompliant).toBe(true);
    expect(Array.isArray(inv.suspensions)).toBe(true);
    expect(Array.isArray(inv.disputes)).toBe(true);
  });

  it("POST /api/demurrage-dispute/suspension should create a new clock stop suspension in SQLite", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/demurrage-dispute/suspension",
      headers: { "Content-Type": "application/json" },
      payload: {
        invoiceId: "dinv_sh_demo_01",
        startDate: "2026-10-30T08:00:00Z",
        endDate: "2026-10-31T18:00:00Z",
        daysSuspended: 1,
        reason: "TERMINAL_CONGESTION_STRIKE",
        justificationText:
          "Labor action at APM terminal restricted gate access.",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.suspension).toBeDefined();
    expect(body.suspension.reason).toBe("TERMINAL_CONGESTION_STRIKE");
  });

  it("POST /api/demurrage-dispute/dispute should submit an FMC dispute and update invoice status", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/demurrage-dispute/dispute",
      headers: { "Content-Type": "application/json" },
      payload: {
        invoiceId: "dinv_sh_demo_01",
        disputedAmountUsd: 700,
        revisedPayableUsd: 700,
        fmcRuleClause: "46 CFR § 541.5 - Mandated Carrier Invoice Inaccuracies",
        formalLetterPayload: {
          reason: "Incorrect tariff calculation applied to free time window.",
        },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.dispute).toBeDefined();
    expect(body.dispute.status).toBe("SUBMITTED");
  });
});
