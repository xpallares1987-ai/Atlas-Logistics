import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

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
});
