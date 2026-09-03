import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { client, db } from "../db/index.js";
import {
  carbonCalculations,
  carbonCertificates,
  carbonOffsetProjects,
} from "../db/schema/index.js";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Scope 3 Carbon & Decarbonization API Routes (/api/carbon)", () => {
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

  it("GET /api/carbon/summary should return aggregated Scope 3 carbon metrics", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/carbon/summary",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.totalCalculations).toBeGreaterThanOrEqual(1);
    expect(data.totalTco2eWtw).toBeGreaterThan(0);
    expect(data.activeProjectsCount).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/carbon/projects should return verified offset projects catalog", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/carbon/projects",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const projects = res.json();
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThanOrEqual(3);
    expect(projects[0]).toHaveProperty("standard");
    expect(projects[0]).toHaveProperty("pricePerTco2eEur");
  });

  it("GET /api/carbon/calculations should list calculated journeys", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/carbon/calculations",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const list = res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/carbon/calculations should enforce bounded pagination", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/carbon/calculations?page=1&pageSize=1",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(Number(res.headers["x-total-count"])).toBeGreaterThanOrEqual(1);
    expect(res.headers["x-page-size"]).toBe("1");
  });

  it("GET /api/carbon/calculations should treat % and _ as literal search characters", async () => {
    const literalCalculationId = "calc-literal-percent";
    const controlCalculationId = "calc-literal-control";
    await db.insert(carbonCalculations).values([
      {
        id: literalCalculationId,
        referenceCode: "LOAD%_CHECK",
        originCity: "Madrid",
        destinationCity: "Paris",
        totalWeightKg: 1000,
        totalDistanceKm: 100,
        totalTco2eWtw: 1,
        totalTco2eTtw: 0.8,
        totalTco2eWtt: 0.2,
        carbonIntensityGco2ePerTkm: 10,
      },
      {
        id: controlCalculationId,
        referenceCode: "LOAD-PLAIN-CHECK",
        originCity: "Lisbon",
        destinationCity: "Berlin",
        totalWeightKg: 1000,
        totalDistanceKm: 100,
        totalTco2eWtw: 1,
        totalTco2eTtw: 0.8,
        totalTco2eWtt: 0.2,
        carbonIntensityGco2ePerTkm: 10,
      },
    ]);

    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/carbon/calculations?q=%25_&page=1&pageSize=100",
        headers: authHeader,
      });

      expect(res.statusCode).toBe(200);
      const ids = res.json().map((item: any) => item.id);
      expect(ids).toContain(literalCalculationId);
      expect(ids).not.toContain(controlCalculationId);
    } finally {
      await db
        .delete(carbonCalculations)
        .where(eq(carbonCalculations.id, literalCalculationId));
      await db
        .delete(carbonCalculations)
        .where(eq(carbonCalculations.id, controlCalculationId));
    }
  });

  it("GET /api/carbon/calculations should use a stable pagination order for identical timestamps", async () => {
    const firstId = "calc-stable-order-a";
    const secondId = "calc-stable-order-b";
    const sharedTimestamp = "2026-01-01 00:00:00";
    await db.insert(carbonCalculations).values([
      {
        id: firstId,
        referenceCode: "STABLE-A",
        originCity: "Madrid",
        destinationCity: "Paris",
        totalWeightKg: 1000,
        totalDistanceKm: 100,
        totalTco2eWtw: 1,
        totalTco2eTtw: 0.8,
        totalTco2eWtt: 0.2,
        carbonIntensityGco2ePerTkm: 10,
        createdAt: sharedTimestamp,
      },
      {
        id: secondId,
        referenceCode: "STABLE-B",
        originCity: "Madrid",
        destinationCity: "Paris",
        totalWeightKg: 1000,
        totalDistanceKm: 100,
        totalTco2eWtw: 1,
        totalTco2eTtw: 0.8,
        totalTco2eWtt: 0.2,
        carbonIntensityGco2ePerTkm: 10,
        createdAt: sharedTimestamp,
      },
    ]);

    try {
      const [page1, page2] = await Promise.all([
        app.inject({
          method: "GET",
          url: "/api/carbon/calculations?q=STABLE-&page=1&pageSize=1",
          headers: authHeader,
        }),
        app.inject({
          method: "GET",
          url: "/api/carbon/calculations?q=STABLE-&page=2&pageSize=1",
          headers: authHeader,
        }),
      ]);

      expect(page1.statusCode).toBe(200);
      expect(page2.statusCode).toBe(200);
      expect(page1.json()[0].id).toBe(secondId);
      expect(page2.json()[0].id).toBe(firstId);
    } finally {
      await db.delete(carbonCalculations).where(eq(carbonCalculations.id, firstId));
      await db
        .delete(carbonCalculations)
        .where(eq(carbonCalculations.id, secondId));
    }
  });

  it("POST /api/carbon/calculate should compute and save multimodal journey emissions", async () => {
    const payload = {
      referenceCode: "TEST-CALC-001",
      originCity: "Barcelona",
      destinationCity: "Milán",
      legs: [
        {
          originName: "Barcelona Port",
          destinationName: "Genoa Port",
          mode: "OCEAN_CONTAINER",
          distanceKm: 650,
          weightKg: 15000,
        },
        {
          originName: "Genoa Port",
          destinationName: "Milan Hub",
          mode: "ROAD_DIESEL",
          distanceKm: 140,
          weightKg: 15000,
        },
      ],
    };

    const res = await app.inject({
      method: "POST",
      url: "/api/carbon/calculate",
      headers: authHeader,
      payload,
    });

    expect(res.statusCode).toBe(200);
    const result = res.json();
    expect(result.success).toBe(true);
    expect(result.calculationId).toBeDefined();
    expect(result.journey.totalTco2eWtw).toBeGreaterThan(0);
    expect(result.journey.legs.length).toBe(2);
  });

  it("POST /api/carbon/calculate should roll back the parent when a leg insert fails", async () => {
    const referenceCode = "TEST-CALC-ROLLBACK";
    await client.execute(`
      CREATE TRIGGER test_fail_carbon_leg
      BEFORE INSERT ON carbon_calculation_legs
      WHEN NEW.origin_name = 'FORCE_TRANSACTION_FAILURE'
      BEGIN
        SELECT RAISE(FAIL, 'forced leg insertion failure');
      END;
    `);

    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/carbon/calculate",
        headers: authHeader,
        payload: {
          referenceCode,
          legs: [
            {
              originName: "Madrid",
              destinationName: "Paris",
              mode: "ROAD_DIESEL",
              distanceKm: 1200,
              weightKg: 20000,
            },
            {
              originName: "FORCE_TRANSACTION_FAILURE",
              destinationName: "Berlin",
              mode: "RAIL_ELECTRIC",
              distanceKm: 800,
              weightKg: 20000,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(500);
      const calculation = await db
        .select()
        .from(carbonCalculations)
        .where(eq(carbonCalculations.referenceCode, referenceCode))
        .get();
      expect(calculation).toBeUndefined();
    } finally {
      await client.execute("DROP TRIGGER test_fail_carbon_leg");
    }
  });

  it("POST /api/carbon/compare-green-route should return alternative corridors", async () => {
    const payload = {
      legs: [
        {
          originName: "Madrid Dry Port",
          destinationName: "Paris Hub",
          mode: "ROAD_DIESEL",
          distanceKm: 1200,
          weightKg: 20000,
        },
      ],
    };

    const res = await app.inject({
      method: "POST",
      url: "/api/carbon/compare-green-route",
      headers: authHeader,
      payload,
    });

    expect(res.statusCode).toBe(200);
    const data = res.json();
    expect(data.success).toBe(true);
    expect(data.alternatives.length).toBeGreaterThan(0);
    expect(data.alternatives[0].savedTco2e).toBeGreaterThan(0);
  });

  it("POST /api/carbon/calculate should reject unsupported transport modes", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/carbon/calculate",
      headers: authHeader,
      payload: {
        legs: [
          {
            originName: "Madrid",
            destinationName: "Paris",
            mode: "TELEPORT",
            distanceKm: 1200,
            weightKg: 20000,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Validation error");
  });

  it("POST /api/carbon/compare-green-route should reject non-positive measurements", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/carbon/compare-green-route",
      headers: authHeader,
      payload: {
        legs: [
          {
            originName: "Madrid",
            destinationName: "Paris",
            mode: "ROAD_DIESEL",
            distanceKm: 0,
            weightKg: -1,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Validation error");
  });

  it("POST /api/carbon/calculate should reject emissions below stored precision", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/carbon/calculate",
      headers: authHeader,
      payload: {
        referenceCode: "TEST-ZERO-ROUNDED",
        legs: [
          {
            originName: "A",
            destinationName: "B",
            mode: "ROAD_DIESEL",
            distanceKm: 1,
            weightKg: 1,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain("below the supported precision");
  });

  it("POST /api/carbon/compare-green-route should reject a zero-rounded base", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/carbon/compare-green-route",
      headers: authHeader,
      payload: {
        legs: [
          {
            originName: "A",
            destinationName: "B",
            mode: "ROAD_DIESEL",
            distanceKm: 1,
            weightKg: 1,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain("below the supported precision");
  });

  it("POST /api/carbon/offset should reject malformed identifiers", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/carbon/offset",
      headers: authHeader,
      payload: {
        calculationId: "",
        projectId: "",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Validation error");
  });

  it("POST /api/carbon/offset should return 404 for a missing calculation", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/carbon/offset",
      headers: authHeader,
      payload: {
        calculationId: "missing-carbon-calculation",
        projectId: "proj-amazon-reforest-01",
        beneficiaryName: "Test Customer",
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().message).toContain("not found");
  });

  it("POST /api/carbon/offset should return 409 for an already-offset calculation", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/carbon/offset",
      headers: authHeader,
      payload: {
        calculationId: "calc-sh-2026-0891",
        projectId: "proj-amazon-reforest-01",
        beneficiaryName: "Test Customer",
      },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().message).toBe("This calculation has already been offset");
  });

  it("GET /api/carbon/certificates should enforce bounded pagination", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/carbon/certificates?page=1&pageSize=1",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(Number(res.headers["x-total-count"])).toBeGreaterThanOrEqual(1);
    expect(res.headers["x-page-size"]).toBe("1");
  });

  it("GET /api/carbon/certificates should use a stable pagination order for identical timestamps", async () => {
    const testProjectId = "proj-stable-certificates";
    const firstCalcId = "calc-stable-cert-a";
    const secondCalcId = "calc-stable-cert-b";
    const firstCertId = "cert-stable-order-a";
    const secondCertId = "cert-stable-order-b";
    const issuedAt = "2099-01-01 00:00:00";
    await db.insert(carbonOffsetProjects).values({
      id: testProjectId,
      name: "Stable Order Project",
      standard: "GOLD_STANDARD",
      category: "REFORESTATION",
      country: "ES",
      pricePerTco2eEur: 10,
      availableCreditsTco2e: 1000,
      description: "Temporary test project for stable pagination",
    });
    await db.insert(carbonCalculations).values([
      {
        id: firstCalcId,
        referenceCode: "CERT-STABLE-A",
        originCity: "Madrid",
        destinationCity: "Paris",
        totalWeightKg: 1000,
        totalDistanceKm: 100,
        totalTco2eWtw: 1,
        totalTco2eTtw: 0.8,
        totalTco2eWtt: 0.2,
        carbonIntensityGco2ePerTkm: 10,
      },
      {
        id: secondCalcId,
        referenceCode: "CERT-STABLE-B",
        originCity: "Madrid",
        destinationCity: "Paris",
        totalWeightKg: 1000,
        totalDistanceKm: 100,
        totalTco2eWtw: 1,
        totalTco2eTtw: 0.8,
        totalTco2eWtt: 0.2,
        carbonIntensityGco2ePerTkm: 10,
      },
    ]);
    await db.insert(carbonCertificates).values([
      {
        id: firstCertId,
        certificateNumber: "ATLAS-CARBON-STABLE-A",
        calculationId: firstCalcId,
        beneficiaryName: "Stable A",
        projectId: testProjectId,
        projectName: "Stable Order Project",
        projectStandard: "GOLD_STANDARD",
        offsetTco2e: 1,
        amountPaidEur: 10,
        qrValidationUrl: "https://example.test/cert-a",
        issuedAt,
      },
      {
        id: secondCertId,
        certificateNumber: "ATLAS-CARBON-STABLE-B",
        calculationId: secondCalcId,
        beneficiaryName: "Stable B",
        projectId: testProjectId,
        projectName: "Stable Order Project",
        projectStandard: "GOLD_STANDARD",
        offsetTco2e: 1,
        amountPaidEur: 10,
        qrValidationUrl: "https://example.test/cert-b",
        issuedAt,
      },
    ]);

    try {
      const [page1, page2] = await Promise.all([
        app.inject({
          method: "GET",
          url: "/api/carbon/certificates?page=1&pageSize=1",
          headers: authHeader,
        }),
        app.inject({
          method: "GET",
          url: "/api/carbon/certificates?page=2&pageSize=1",
          headers: authHeader,
        }),
      ]);

      expect(page1.statusCode).toBe(200);
      expect(page2.statusCode).toBe(200);
      const ids = [page1.json()[0].id, page2.json()[0].id];
      expect(ids).toContain(secondCertId);
      expect(ids).toContain(firstCertId);
    } finally {
      await db.delete(carbonCertificates).where(eq(carbonCertificates.id, firstCertId));
      await db
        .delete(carbonCertificates)
        .where(eq(carbonCertificates.id, secondCertId));
      await db.delete(carbonCalculations).where(eq(carbonCalculations.id, firstCalcId));
      await db
        .delete(carbonCalculations)
        .where(eq(carbonCalculations.id, secondCalcId));
      await db
        .delete(carbonOffsetProjects)
        .where(eq(carbonOffsetProjects.id, testProjectId));
    }
  });
});
