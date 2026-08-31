import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Chartering & Laytime / Demurrage API Routes (/api/chartering)", () => {
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

  it("POST /api/chartering/fixtures should create a new fixture", async () => {
    const testRef = `CP-TEST-${Date.now().toString().slice(-6)}`;
    const res = await app.inject({
      method: "POST",
      url: "/api/chartering/fixtures",
      headers: authHeader,
      payload: {
        fixtureReference: testRef,
        charterType: "VOYAGE_CHARTER",
        contractForm: "GENCON_2022",
        ownerName: "Naviera Cantábrica SA",
        chartererName: "AgroGrain International Traders Ltd",
        vesselName: "MV Northern Star",
        imoNumber: "9842109",
        cargoDescription: "Trigo a Granel (Bulk Wheat)",
        cargoQuantityMt: 35000,
        loadingPort: "Puerto de Santander (ESSDR)",
        dischargingPort: "Puerto de Alexandria (EGALY)",
        laycanStart: "2026-09-01",
        laycanEnd: "2026-09-10",
        freightRateUsdPerMt: 32.5,
        demurrageRateUsdPerDay: 14000,
        despatchRateUsdPerDay: 7000,
        loadRateMtPerDay: 5000,
        dischargeRateMtPerDay: 3500,
        turnTimeHours: 12,
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.fixtureReference).toBe(testRef);
  });

  it("GET /api/chartering/fixtures should return list of fixtures", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/chartering/fixtures",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/chartering/fixtures/:id should return single fixture with SOFs", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/chartering/fixtures",
      headers: authHeader,
    });
    const fixtureId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/chartering/fixtures/${fixtureId}`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(fixtureId);
    expect(Array.isArray(json.data.sofs)).toBe(true);
  });

  it("POST /api/chartering/sofs should create a Statement of Facts", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/chartering/fixtures",
      headers: authHeader,
    });
    const fixtureId = listRes.json().data[0].id;
    const testSofRef = `SOF-TEST-${Date.now().toString().slice(-6)}`;

    const res = await app.inject({
      method: "POST",
      url: "/api/chartering/sofs",
      headers: authHeader,
      payload: {
        charterPartyId: fixtureId,
        sofReference: testSofRef,
        portOperation: "LOADING",
        portCode: "ESSDR",
        portName: "Santander Port",
        terminalBerth: "Muelle de Raos 4",
        norTenderedTimestamp: "2026-09-01T08:00:00Z",
        norAcceptedTimestamp: "2026-09-01T08:30:00Z",
        turnTimeHours: 12,
        commencedOperationsTimestamp: "2026-09-01T20:00:00Z",
        completedOperationsTimestamp: "2026-09-07T12:00:00Z",
        actualCargoHandledMt: 35000,
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.sofReference).toBe(testSofRef);
    expect(json.norEvaluation).toBeDefined();
  });

  it("POST /api/chartering/sofs/:id/events should add chronological event to SOF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/chartering/sofs",
      headers: authHeader,
    });
    const sofId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "POST",
      url: `/api/chartering/sofs/${sofId}/events`,
      headers: authHeader,
      payload: {
        eventStartTimestamp: "2026-09-02T14:00:00Z",
        eventEndTimestamp: "2026-09-02T18:00:00Z",
        eventType: "RAIN_STOPPAGE",
        laytimeCountingPercentage: 0,
        isCountedAgainstLaytime: false,
        interruptionReason: "Heavy rain shower - hatches closed",
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.eventType).toBe("RAIN_STOPPAGE");
  });

  it("POST /api/chartering/calculate-laytime should compute laytime and demurrage/despatch", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/chartering/calculate-laytime",
      headers: authHeader,
      payload: {
        cargoQuantityMt: 35000,
        rateMtPerDay: 5000,
        laytimeTerms: "SHEX_EIU",
        demurrageRateUsdPerDay: 14000,
        despatchRateUsdPerDay: 7000,
        laytimeCommencedTimestamp: "2026-09-01T08:00:00Z",
        operationsCompletedTimestamp: "2026-09-09T08:00:00Z",
        events: [
          {
            eventStartTimestamp: "2026-09-01T08:00:00Z",
            eventEndTimestamp: "2026-09-03T08:00:00Z",
            eventType: "WORKING_OPERATIONS",
          },
          {
            eventStartTimestamp: "2026-09-03T08:00:00Z",
            eventEndTimestamp: "2026-09-03T20:00:00Z",
            eventType: "RAIN_STOPPAGE",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.calculation.allowedDaysDecimal).toBe(7.0);
    expect(json.calculation.payableParty).toBeDefined();
  });

  it("POST /api/chartering/calculate-offhire should calculate time charter off-hire", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/chartering/calculate-offhire",
      headers: authHeader,
      payload: {
        charterPeriodStart: "2026-09-01T00:00:00Z",
        charterPeriodEnd: "2026-10-01T00:00:00Z",
        dailyHireRateUsd: 18500,
        offHireEvents: [
          {
            offHireReference: "OFF-001",
            offHireReason: "MAIN_ENGINE_BREAKDOWN",
            offHireStartTimestamp: "2026-09-10T00:00:00Z",
            offHireEndTimestamp: "2026-09-12T00:00:00Z",
            bunkerVlsfoConsumedMt: 4,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.hireStatement.totalOffHireDaysDecimal).toBe(2.0);
    expect(json.hireStatement.netPayableToOwnerUsd).toBeGreaterThan(0);
  });

  it("GET /api/chartering/fixtures/:id/fixture-pdf should stream Fixture PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/chartering/fixtures",
      headers: authHeader,
    });
    const fixtureId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/chartering/fixtures/${fixtureId}/fixture-pdf`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(500);
  });

  it("GET /api/chartering/sofs/:id/sof-pdf should stream SOF PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/chartering/sofs",
      headers: authHeader,
    });
    const sofId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/chartering/sofs/${sofId}/sof-pdf`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(500);
  });

  it("GET /api/chartering/fixtures/:id/hire-statement-pdf should stream Time Charter Hire PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/chartering/fixtures",
      headers: authHeader,
    });
    const fixtureId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/chartering/fixtures/${fixtureId}/hire-statement-pdf`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(500);
  });
});
