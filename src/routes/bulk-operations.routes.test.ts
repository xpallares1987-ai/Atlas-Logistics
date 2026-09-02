import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Bulk Operations API Routes (/api/bulk-operations)", () => {
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

  it("POST /api/bulk-operations/vessel-operations should register a new bulk vessel operation", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/bulk-operations/vessel-operations",
      headers: authHeader,
      payload: {
        vesselName: "MV Test Bulker",
        imoNumber: "9123456",
        vesselType: "PANAMAX_BULKER",
        portName: "Puerto de Santander",
        terminalName: "Terminal de Carbones",
        berthNumber: "Muelle 3",
        cargoCategory: "SOLID_MINERAL_BULK",
        operationType: "DISCHARGING",
        targetCargoTonnage: 55000,
        etaDate: "2026-09-10",
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.vesselName).toBe("MV Test Bulker");
  });

  it("GET /api/bulk-operations/vessel-operations should return list of vessel operations", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/bulk-operations/vessel-operations",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/bulk-operations/vessel-operations/:id should return single operation with surveys and plans", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/bulk-operations/vessel-operations/bulk_op_capesize_01",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe("bulk_op_capesize_01");
    expect(Array.isArray(json.data.draftSurveys)).toBe(true);
    expect(Array.isArray(json.data.imsbcDeclarations)).toBe(true);
  });

  it("POST /api/bulk-operations/calculate-draft-survey should calculate hydrostatic displacement and trim corrections", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/bulk-operations/calculate-draft-survey",
      headers: authHeader,
      payload: {
        forwardDraftPort: 4.2,
        forwardDraftStarboard: 4.22,
        aftDraftPort: 6.8,
        aftDraftStarboard: 6.84,
        midDraftPort: 5.48,
        midDraftStarboard: 5.52,
        lengthBetweenPerpendiculars: 220,
        longitudinalCenterOfFlotation: -3.5,
        tonnesPerCmImmersion: 65,
        momentToChangeTrim1Cm: 850,
        measuredWaterDensity: 1.02,
        hydrostaticDisplacement: 28500,
        ballastWaterDeductible: 12000,
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.calculation.apparentTrim).toBe(2.61);
    expect(json.calculation.correctedDisplacement).toBeGreaterThan(25000);
  });

  it("POST /api/bulk-operations/evaluate-imsbc-tml should evaluate liquefaction safety and TML", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/bulk-operations/evaluate-imsbc-tml",
      headers: authHeader,
      payload: {
        bulkCargoShippingName: "IRON ORE CONCENTRATE",
        imsbcGroup: "GROUP_A_LIQUEFACTION",
        flowMoisturePointPercentage: 11.0,
        moistureContentPercentage: 8.5,
        stowageFactorM3PerTonne: 0.45,
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.evaluation.transportableMoistureLimit).toBe(9.9);
    expect(json.evaluation.isLiquefactionCompliant).toBe(true);
  });

  it("POST /api/bulk-operations/calculate-grain-stability should verify IMO Grain Code stability criteria", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/bulk-operations/calculate-grain-stability",
      headers: authHeader,
      payload: {
        grainType: "WHEAT",
        totalGrainTonnage: 65000,
        stowageFactorM3PerTonne: 1.35,
        totalVolumetricHeelingMoment: 12500,
        departureDisplacement: 82000,
        departureGm0: 1.15,
        departureKg: 9.8,
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.stability.residualHeelAngleDegrees).toBeLessThan(12.0);
    expect(json.stability.isImoGrainCodeCompliant).toBe(true);
  });

  it("POST /api/bulk-operations/calculate-tank-ullage should calculate ASTM Table 54 liquid quantity", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/bulk-operations/calculate-tank-ullage",
      headers: authHeader,
      payload: {
        productName: "JET A-1 FUEL",
        observedAverageTemperatureCelsius: 22.0,
        densityAt15Celsius: 0.7985,
        totalObservedVolumeM3: 44000,
        totalFreeWaterVolumeM3: 20,
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.ullageQuantity.metricTonnesInAir).toBeGreaterThan(34000);
  });

  it("GET /api/bulk-operations/draft-surveys/:id/report-pdf should stream Draft Survey Report PDF", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/bulk-operations/draft-surveys/draft_survey_final_01/report-pdf",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(500);
  });

  it("GET /api/bulk-operations/imsbc-declarations/:id/declaration-pdf should stream IMSBC Declaration PDF", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/bulk-operations/imsbc-declarations/imsbc_dec_01/declaration-pdf",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(500);
  });

  it("GET /api/bulk-operations/grain-stability-plans/:id/plan-pdf should stream Grain Stability PDF", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/bulk-operations/grain-stability-plans/grain_plan_01/plan-pdf",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(500);
  });

  it("GET /api/bulk-operations/ullage-surveys/:id/survey-pdf should stream Tanker Ullage Survey PDF", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/bulk-operations/ullage-surveys/ullage_surv_01/survey-pdf",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(500);
  });
});
