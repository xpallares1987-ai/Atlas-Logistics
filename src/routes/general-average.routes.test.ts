import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Maritime General Average & Salvage API Routes (/api/general-average)", () => {
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

  it("POST /api/general-average/cases should create a new GA case", async () => {
    const testRef = `GA-TEST-${Date.now().toString().slice(-6)}`;
    const res = await app.inject({
      method: "POST",
      url: "/api/general-average/cases",
      headers: authHeader,
      payload: {
        caseReference: testRef,
        vesselName: "MV Test Voyager",
        imoNumber: "9123456",
        flagState: "Malta",
        builtYear: 2021,
        grossTonnage: 55000,
        summerDwtMt: 65000,
        shipownerName: "Naviera Cantábrica SA",
        masterName: "Capt. Santiago Aranda",
        casualtyType: "ENGINE_BREAKDOWN_HEAVY_WEATHER",
        casualtyDate: "2026-08-15",
        casualtyLocation: "Golfo de Vizcaya",
        voyageOrigin: "Puerto de Bilbao",
        voyageDestination: "Puerto de Rotterdam",
        portOfRefuge: "Puerto de Brest",
        governingRules: "YAR_2016",
        salvageContractType: "LOF_2024_SCOPIC",
        salvorName: "Les Abeilles Towage",
        averageAdjusterFirm: "Richards Hogg Lindley",
        leadAdjusterName: "David Sterling",
        declarationNarrative:
          "Avería grave en timón requiriendo remolque de salvamento.",
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.caseReference).toBe(testRef);
  });

  it("GET /api/general-average/cases should return list of GA cases", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/general-average/cases",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/general-average/cases/:id should return single GA case with details", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/general-average/cases",
      headers: authHeader,
    });
    const caseId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/general-average/cases/${caseId}`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(caseId);
    expect(Array.isArray(json.data.allowances)).toBe(true);
    expect(Array.isArray(json.data.contributoryInterests)).toBe(true);
  });

  it("POST /api/general-average/cases/:id/allowances should add sacrifice/allowance", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/general-average/cases",
      headers: authHeader,
    });
    const caseId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "POST",
      url: `/api/general-average/cases/${caseId}/allowances`,
      headers: authHeader,
      payload: {
        allowanceCategory: "REFUGE_PORT_DISBURSEMENTS",
        yarRuleReference: "RULE_X_PORT_OF_REFUGE",
        description: "Tasas de remolcadores de puerto de refugio",
        creditedPartyType: "SHIPOWNER",
        creditedPartyName: "Naviera Cantábrica SA",
        amountUsd: 45000,
        isAdmissible: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.amountUsd).toBe(45000);
  });

  it("POST /api/general-average/cases/:id/contributory-interests should add contributory interest", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/general-average/cases",
      headers: authHeader,
    });
    const caseId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "POST",
      url: `/api/general-average/cases/${caseId}/contributory-interests`,
      headers: authHeader,
      payload: {
        interestCategory: "CARGO",
        blReference: "BL-TEST-0099",
        containerNumber: "TGHU-918273-4",
        ownerOrReceiverName: "EuroLogistics Traders BV",
        cargoDescription: "Maquinaria Industrial de Precisión",
        soundValueDestinationUsd: 1500000,
        particularDamageDeductionUsd: 0,
        madeGoodAllowanceUsd: 0,
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.contributoryValueUsd).toBe(1500000);
  });

  it("POST /api/general-average/cases/:id/securities should register security and authorize release", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/general-average/cases",
      headers: authHeader,
    });
    const caseId = listRes.json().data[0].id;

    // Get an interest
    const caseRes = await app.inject({
      method: "GET",
      url: `/api/general-average/cases/${caseId}`,
      headers: authHeader,
    });
    const interestId =
      caseRes.json().data.contributoryInterests[0]?.id || "ci_dummy";

    const res = await app.inject({
      method: "POST",
      url: `/api/general-average/cases/${caseId}/securities`,
      headers: authHeader,
      payload: {
        contributoryInterestId: interestId,
        securityReference: `SEC-TEST-${Date.now().toString().slice(-6)}`,
        securityType: "AVERAGE_BOND_AND_GUARANTEE",
        cargoConsigneeName: "EuroLogistics Traders BV",
        insurerName: "Allianz Marine Munich",
        insurerPolicyNumber: "POL-ALLIANZ-2026",
        securityAmountUsd: 112500,
        averageBondSigned: true,
        averageGuaranteeSigned: true,
        cargoReleaseAuthorized: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.cargoReleaseAuthorized).toBe(true);
  });

  it("POST /api/general-average/calculate-adjustment should calculate adjustment simulation", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/general-average/calculate-adjustment",
      headers: authHeader,
      payload: {
        casualtyDate: "2026-08-10",
        cmiAnnualInterestRatePercentage: 6.0,
        allowanceItems: [
          {
            allowanceCategory: "SHIP_SACRIFICE",
            yarRuleReference: "RULE_VII_MACHINERY_DAMAGE",
            creditedPartyType: "SHIPOWNER",
            creditedPartyName: "Naviera Cantábrica",
            amountUsd: 250000,
          },
          {
            allowanceCategory: "SALVAGE_AWARD_LOF",
            yarRuleReference: "RULE_PARAMOUNT_GENERAL",
            creditedPartyType: "SALVOR",
            creditedPartyName: "Smit Salvage",
            amountUsd: 500000,
          },
        ],
        contributoryInterests: [
          {
            interestCategory: "VESSEL",
            ownerOrReceiverName: "Naviera Cantábrica",
            soundValueDestinationUsd: 15000000,
            particularDamageDeductionUsd: 0,
            madeGoodAllowanceUsd: 250000,
          },
          {
            interestCategory: "CARGO",
            ownerOrReceiverName: "Iberica Chem",
            soundValueDestinationUsd: 2500000,
            particularDamageDeductionUsd: 0,
            madeGoodAllowanceUsd: 0,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.adjustmentResult.rateOfContributionPercentage).toBeGreaterThan(
      0,
    );
    expect(json.adjustmentResult.interests.length).toBe(2);
  });

  it("GET /api/general-average/cases/:id/declaration-pdf should stream Declaration PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/general-average/cases",
      headers: authHeader,
    });
    const caseId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/general-average/cases/${caseId}/declaration-pdf`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(500);
  });

  it("GET /api/general-average/cases/:id/adjustment-statement-pdf should stream Adjustment PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/general-average/cases",
      headers: authHeader,
    });
    const caseId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/general-average/cases/${caseId}/adjustment-statement-pdf`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(500);
  });
});
