import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Dangerous Goods API Routes (/api/dangerous-goods)", () => {
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

  it("POST /api/dangerous-goods/shipments should create a new DGR shipment", async () => {
    const testRef = `DGD-TEST-${Date.now().toString().slice(-6)}`;
    const res = await app.inject({
      method: "POST",
      url: "/api/dangerous-goods/shipments",
      headers: authHeader,
      payload: {
        shipmentReference: testRef,
        transportMode: "MARITIME_OCEAN",
        carrierName: "CMA CGM",
        vesselOrFlightOrVehiclePlate: "MV Jacques Saade",
        voyageOrFlightNumber: "V.9902",
        originPortOrLocation: "Puerto de Algeciras",
        destinationPortOrLocation: "Puerto de Shanghai",
        shipperName: "Iberica Chemical Solutions SL",
        shipperAddress: "Valencia, Spain",
        consigneeName: "Shanghai Polymer Importers Ltd",
        consigneeAddress: "Shanghai, China",
        emergencyContactName: "CHEMTREC",
        emergencyContactPhone: "+34 91 562 04 20",
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.shipmentReference).toBe(testRef);
  });

  it("GET /api/dangerous-goods/shipments should return list of DGR shipments", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/dangerous-goods/shipments",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/dangerous-goods/shipments/:id should return single DGR shipment with details", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/dangerous-goods/shipments",
      headers: authHeader,
    });
    const shipId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/dangerous-goods/shipments/${shipId}`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(shipId);
    expect(Array.isArray(json.data.items)).toBe(true);
  });

  it("POST /api/dangerous-goods/shipments/:id/items should add dangerous goods item", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/dangerous-goods/shipments",
      headers: authHeader,
    });
    const shipId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "POST",
      url: `/api/dangerous-goods/shipments/${shipId}/items`,
      headers: authHeader,
      payload: {
        unNumber: "UN 1203",
        properShippingName: "GASOLINE",
        primaryHazardClass: "3",
        packingGroup: "PG_II",
        flashPointCelsius: -45,
        isMarinePollutant: true,
        packageCount: 2,
        netQuantityPerPackage: 200,
        unitOfMeasure: "LITERS",
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.unNumber).toBe("UN 1203");
    expect(json.data.totalNetQuantity).toBe(400);
  });

  it("POST /api/dangerous-goods/validate-segregation should audit container co-loading", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/dangerous-goods/validate-segregation",
      headers: authHeader,
      payload: {
        containerOrVehicleNumber: "TEST-CONTAINER-01",
        items: [
          { id: "1", unNumber: "UN 1203", primaryClass: "3" },
          { id: "2", unNumber: "UN 1789", primaryClass: "8" },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.auditResult.overallStatus).toBe("INCOMPATIBLE_VIOLATION");
    expect(json.auditResult.totalConflicts).toBe(1);
  });

  it("POST /api/dangerous-goods/calculate-adr-points should calculate points under 1.1.3.6", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/dangerous-goods/calculate-adr-points",
      headers: authHeader,
      payload: {
        items: [
          { unNumber: "UN 1203", transportCategory: 2, netQuantityKgOrL: 200 },
          { unNumber: "UN 1993", transportCategory: 3, netQuantityKgOrL: 300 },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.adrCalculation.totalPoints).toBe(900);
    expect(json.adrCalculation.isExempt1136).toBe(true);
  });

  it("POST /api/dangerous-goods/classify-lithium-battery should classify UN 3480", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/dangerous-goods/classify-lithium-battery",
      headers: authHeader,
      payload: {
        unNumber: "UN 3480",
        batteryWattHours: 150,
        packageCount: 5,
        stateOfChargePercentage: 25,
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.batteryClassification.section).toBe("SECTION_IA");
    expect(json.batteryClassification.isCaoMandatory).toBe(true);
  });

  it("GET /api/dangerous-goods/shipments/:id/dgd-pdf should stream Multimodal DGD PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/dangerous-goods/shipments",
      headers: authHeader,
    });
    const shipId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/dangerous-goods/shipments/${shipId}/dgd-pdf`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(500);
  });

  it("GET /api/dangerous-goods/shipments/:id/emergency-card-pdf should stream Emergency Card PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/dangerous-goods/shipments",
      headers: authHeader,
    });
    const shipId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/dangerous-goods/shipments/${shipId}/emergency-card-pdf`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(500);
  });
});
