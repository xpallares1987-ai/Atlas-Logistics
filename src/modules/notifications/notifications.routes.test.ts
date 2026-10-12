import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Mock auth middleware and password hashing for integration tests
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

describe("Omnichannel Notifications Routes Integration Tests", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/notifications/teams/templates should return all 8 Adaptive Cards schemas", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/notifications/teams/templates",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.templates).toHaveLength(8);

    const coldChain = json.templates.find((t: any) => t.anomalyType === "COLD_CHAIN_TEMP_BREACH");
    expect(coldChain).toBeDefined();
    expect(coldChain.cardPayload.attachments[0].content.version).toBe("1.5");
  });

  it("POST /api/notifications/teams/dispatch should simulate dispatch and record audit log", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/notifications/teams/dispatch",
      payload: {
        anomalyType: "HAZMAT_VIOLATION",
        context: {
          gsid: "GS-2026-ALG-55012",
          forwardingRef: "FWD-ALG-3391",
          severity: "CRITICAL",
          operator: "Safety Officer",
          location: "Port of Algeciras",
          transportMode: "SEA",
          metadata: {
            unNumber: "UN 1993",
            imoClass: "Class 3",
          },
        },
        targetWebhookUrl: "SIMULATED",
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.log.anomalyType).toBe("HAZMAT_VIOLATION");
    expect(json.data.log.status).toBe("SIMULATED");
    expect(json.data.log.hmacSignature).toBeDefined();
    expect(json.data.cardPayload.type).toBe("message");
  });

  it("GET /api/notifications/teams/audit-log should return audit history list", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/notifications/teams/audit-log",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.logs)).toBe(true);
    expect(json.logs.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/notifications/telegram/driver-report should ingest driver event message", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/notifications/telegram/driver-report",
      payload: {
        driverName: "Enrique Morales",
        telegramChatId: "@driver_enrique",
        truckId: "TRK-5521-BCN",
        reportType: "YARD_DELAY",
        details: "Espera de 50 minutos en acceso sur por verificación de escáner aduanero.",
        amountOrMinutes: 50,
        location: "ZAL Port Barcelona",
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.driverName).toBe("Enrique Morales");
    expect(json.data.reportType).toBe("YARD_DELAY");
    expect(json.data.amountOrMinutes).toBe(50);
  });

  it("GET /api/notifications/telegram/messages should list recent driver reports", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/notifications/telegram/messages",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.messages)).toBe(true);
    const found = json.messages.find((m: any) => m.driverName === "Enrique Morales");
    expect(found).toBeDefined();
  });

  it("POST /api/notifications/telegram/dispatch-order should assign transport order and notify driver", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/notifications/telegram/dispatch-order",
      payload: {
        driverName: "Enrique Morales",
        telegramChatId: "@driver_enrique",
        truckId: "TRK-5521-BCN",
        pickupLocation: "Muelle Adosado Puerto de Barcelona",
        deliveryLocation: "Centro Logístico SEAT Martorell",
        cargoDescription: "Autopartes y Módulos Eléctricos (18,400 kg)",
        containerNumber: "CMAU7718920",
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.orderId).toMatch(/^DSP-ORD-\d{5}$/);
    expect(json.data.status).toBe("DISPATCHED");
  });

  it("GET /api/notifications/telegram/orders should list dispatch orders", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/notifications/telegram/orders",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.orders.length).toBeGreaterThanOrEqual(1);
  });
});
