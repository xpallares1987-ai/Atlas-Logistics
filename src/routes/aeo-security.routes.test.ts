import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("AEO & Supply Chain Security API Routes (/api/aeo-security)", () => {
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

  it("GET /api/aeo-security/audits should return list of AEO audits", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/aeo-security/audits",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/aeo-security/audits/:id should return single audit with CAE sections", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/aeo-security/audits",
      headers: authHeader,
    });
    const auditId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/aeo-security/audits/${auditId}`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(auditId);
    expect(Array.isArray(json.data.sections)).toBe(true);
  });

  it("POST /api/aeo-security/audits should create and score a new AEO audit", async () => {
    const testRef = `OEA-TEST-${Date.now().toString().slice(-6)}`;
    const res = await app.inject({
      method: "POST",
      url: "/api/aeo-security/audits",
      headers: authHeader,
      payload: {
        auditReference: testRef,
        aeoModality: "OEAF_FULL_COMBINED",
        targetStandard: "EU_UCC_AEO",
        leadAuditorName: "Auditor Test OEA",
        sections: [
          {
            blockNumber: 1,
            blockCode: "BLOCK_1_GENERAL_INFO",
            blockTitle: "Bloque 1: General",
            totalQuestions: 8,
            compliantCount: 8,
            nonCompliantCount: 0,
          },
          {
            blockNumber: 2,
            blockCode: "BLOCK_2_CUSTOMS_COMPLIANCE",
            blockTitle: "Bloque 2: Aduanas",
            totalQuestions: 10,
            compliantCount: 10,
            nonCompliantCount: 0,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.auditReference).toBe(testRef);
    expect(json.scoring).toBeDefined();
  });

  it("GET /api/aeo-security/inspections should return 7-point inspections", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/aeo-security/inspections",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("POST /api/aeo-security/inspections should create and evaluate a 7-point inspection", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/aeo-security/inspections",
      headers: authHeader,
      payload: {
        equipmentType: "OCEAN_CONTAINER",
        equipmentIdentifier: "TEST-889900-1",
        inspectorName: "Inspector Test",
        p1FrontWallPassed: true,
        p2LeftSidePassed: true,
        p3RightSidePassed: true,
        p4FloorPassed: true,
        p5RoofCeilingPassed: true,
        p6DoorsLocksPassed: true,
        p7UndercarriagePassed: true,
        hasAgriculturalContamination: false,
        physicalTamperingDetected: false,
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.evaluation.overallPassed).toBe(true);
    expect(json.evaluation.inspectionResult).toBe("PASSED_CLEAN");
  });

  it("GET /api/aeo-security/seals should return ISO 17712 seals", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/aeo-security/seals",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("POST /api/aeo-security/seals should register an ISO 17712 Class H seal", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/aeo-security/seals",
      headers: authHeader,
      payload: {
        sealNumber: `H-TEST-${Date.now().toString().slice(-6)}`,
        sealType: "BOLT_SEAL_CLASS_H",
        iso17712Compliant: true,
        associatedEquipmentIdentifier: "TEST-889900-1",
        affixedDate: "2026-08-28",
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.validation.isHighSecurityClassH).toBe(true);
  });

  it("GET /api/aeo-security/partners should return business partners", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/aeo-security/partners",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("POST /api/aeo-security/partners/screen should calculate partner security risk score", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/aeo-security/partners/screen",
      headers: authHeader,
      payload: {
        partnerName: "Partner Test Express",
        partnerType: "HAULIER_CARRIER",
        hasAeoCertification: true,
        hasCtpatCertification: true,
        securityQuestionnaireScore: 90,
        monthsSinceLastAssessment: 4,
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.riskLevel).toBe("LOW_RISK");
    expect(json.data.calculatedRiskScore).toBeGreaterThanOrEqual(80);
  });

  it("GET /api/aeo-security/audits/:id/cae-report-pdf should stream CAE PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/aeo-security/audits",
      headers: authHeader,
    });
    const auditId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/aeo-security/audits/${auditId}/cae-report-pdf`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
  });

  it("GET /api/aeo-security/inspections/:id/seven-point-pdf should stream 7-Point Inspection PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/aeo-security/inspections",
      headers: authHeader,
    });
    const inspId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/aeo-security/inspections/${inspId}/seven-point-pdf`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
  });

  it("GET /api/aeo-security/seals/:id/custody-pdf should stream ISO 17712 Seal PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/aeo-security/seals",
      headers: authHeader,
    });
    const sealId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/aeo-security/seals/${sealId}/custody-pdf`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
  });

  it("GET /api/aeo-security/partners/risk-matrix-pdf should stream Partner Risk Matrix PDF", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/aeo-security/partners/risk-matrix-pdf",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
  });
});
