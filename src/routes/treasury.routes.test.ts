import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Treasury & Carrier Settlements API Routes (/api/treasury)", () => {
  let authHeader: { authorization: string };

  beforeAll(async () => {
    await app.ready();
    const token = jwt.sign(
      {
        id: "admin_user_id",
        email: "admin@atlas.com",
        role: "ADMIN",
        name: "Admin User",
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    authHeader = { authorization: `Bearer ${token}` };
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/treasury/invoices should return seeded carrier invoices", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/treasury/invoices",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const invoices = res.json();
    expect(Array.isArray(invoices)).toBe(true);
    expect(invoices.length).toBeGreaterThan(0);
    expect(invoices[0].invoiceNumber).toBeDefined();
  });

  it("GET /api/treasury/invoices/:id should return invoice details with matched lines", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/treasury/invoices",
      headers: authHeader,
    });
    const invoices = listRes.json();
    const invoiceId = invoices[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/treasury/invoices/${invoiceId}`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const invoice = res.json();
    expect(invoice.id).toBe(invoiceId);
    expect(Array.isArray(invoice.lines)).toBe(true);
  });

  it("POST /api/treasury/reconcile should perform 3-way match", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/treasury/reconcile",
      headers: authHeader,
      payload: {
        lines: [
          {
            chargeCode: "BASIC_FREIGHT",
            description: "Air freight",
            documentNumber: "075-84920153",
            billedQuantity: 480,
            billedRate: 4.5,
            billedAmount: 2160.0,
            expectedQuantity: 480,
            expectedRate: 4.5,
            expectedAmount: 2160.0,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.summary.reconciliationStatus).toBe("AUTO_MATCHED");
  });

  it("GET /api/treasury/fx-exposure should return currency positions and evaluations", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/treasury/fx-exposure",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.evaluations)).toBe(true);
    expect(body.evaluations.length).toBeGreaterThan(0);
  });

  it("GET /api/treasury/cash-flow-forecast should project 30/60/90-day cash flow", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/treasury/cash-flow-forecast",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.forecasts.length).toBe(3);
  });

  it("POST /api/treasury/invoices/:id/approve should approve invoice for settlement", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/treasury/invoices",
      headers: authHeader,
    });
    const invoices = listRes.json();
    const invoiceId = invoices[0].id;

    const res = await app.inject({
      method: "POST",
      url: `/api/treasury/invoices/${invoiceId}/approve`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
  });

  it("GET /api/treasury/invoices/:id/dispute-pdf should stream Carrier Dispute / Debit Note PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/treasury/invoices",
      headers: authHeader,
    });
    const invoices = listRes.json();
    const invoiceId = invoices[0].id;

    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/treasury/invoices/${invoiceId}/dispute-pdf`,
      headers: authHeader,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
  });

  it("GET /api/treasury/invoices/:id/settlement-pdf should stream Carrier Settlement Statement PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/treasury/invoices",
      headers: authHeader,
    });
    const invoices = listRes.json();
    const invoiceId = invoices[0].id;

    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/treasury/invoices/${invoiceId}/settlement-pdf`,
      headers: authHeader,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
  });
});
