import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import drayageRoutes from "../src/routes/drayage.routes.js";
import { ensureAddressesTables } from "../src/routes/addresses.routes.js";
import {
  calculateHaversineDistanceKm,
  estimateTruckTransitMinutes,
  formatTransitMinutes,
  calculateDrayageCosts,
  calculateDrayageCarbon,
} from "@atlas/shared";
import { drayageEngineService } from "../src/services/drayage-engine.service.js";
import { db } from "../src/db/index.js";
import {
  companies,
  addresses,
  addressContacts,
} from "../src/db/schema/index.js";
import { eq, inArray } from "drizzle-orm";

describe("Container Drayage Road Haulage & Carbon Engine (GLEC v3.0)", () => {
  let app: FastifyInstance;

  const testCompanyId = "company_drayage_test_01";
  const testOriginAddressId = "addr_test_origin_zaragoza";
  const testTerminalAddressId = "addr_test_terminal_barcelona";
  const testHaulierAddressId = "addr_test_haulier_transmar";

  // Coordinates
  const zaragozaLogisticsHub = { lat: 41.6488, lon: -0.8891 };
  const portDeBarcelonaTerminal = { lat: 41.3463, lon: 2.1699 };

  beforeAll(async () => {
    await ensureAddressesTables();
    const now = new Date();

    // 1. Seed test company
    await db
      .insert(companies)
      .values({
        id: testCompanyId,
        name: "Iberian Intermodal Logistics Corp",
        taxId: "ESB99887766",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 2. Seed test origin customer warehouse
    await db
      .insert(addresses)
      .values({
        id: testOriginAddressId,
        companyId: testCompanyId,
        addressType: "WAREHOUSE",
        companyName: "Zaragoza Distribution Hub S.L.",
        street1: "Plaza Logistics Platform, Parcela 12",
        zipCode: "50197",
        city: "Zaragoza",
        country: "ES",
        lat: zaragozaLogisticsHub.lat,
        lon: zaragozaLogisticsHub.lon,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 3. Seed test maritime terminal
    await db
      .insert(addresses)
      .values({
        id: testTerminalAddressId,
        companyId: testCompanyId,
        addressType: "TERMINAL",
        companyName: "BEST Terminal - Hutchison Ports",
        tradeName: "Barcelona Europe South Terminal",
        street1: "Moll Prat, s/n, Port de Barcelona",
        zipCode: "08039",
        city: "Barcelona",
        country: "ES",
        unLocode: "ESBCN",
        lat: portDeBarcelonaTerminal.lat,
        lon: portDeBarcelonaTerminal.lon,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // 4. Seed test haulier
    await db
      .insert(addresses)
      .values({
        id: testHaulierAddressId,
        companyId: testCompanyId,
        addressType: "HAULIER",
        companyName: "Trans-Marítim Container Services S.L.",
        street1: "Sector 3, Zona Franca",
        zipCode: "08040",
        city: "Barcelona",
        country: "ES",
        lat: 41.332,
        lon: 2.138,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    await db
      .insert(addressContacts)
      .values({
        id: "cnt_haulier_01",
        addressId: testHaulierAddressId,
        fullName: "Marc Vidal - Operaciones Tráfico",
        email: "trafico@transmaritim.test",
        phone: "+34 932 888 777",
        isPrimary: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    // Setup Fastify
    app = Fastify();
    await app.register(drayageRoutes, { prefix: "/api/drayage" });
    await app.ready();
  });

  afterAll(async () => {
    // Cleanup
    await db
      .delete(addressContacts)
      .where(eq(addressContacts.addressId, testHaulierAddressId));
    await db
      .delete(addresses)
      .where(
        inArray(addresses.id, [
          testOriginAddressId,
          testTerminalAddressId,
          testHaulierAddressId,
        ]),
      );
    await db.delete(companies).where(eq(companies.id, testCompanyId));
    if (app) {
      await app.close();
    }
  });

  describe("Unit: Haversine & Drayage Calculator Utilities (@atlas/shared)", () => {
    it("computes accurate road distance between Zaragoza and Port of Barcelona with circuity factor", () => {
      const roadDistanceKm = calculateHaversineDistanceKm(
        zaragozaLogisticsHub,
        portDeBarcelonaTerminal,
      );

      // Zaragoza to Barcelona direct distance is ~256 km, * 1.28 road tortuosity factor = ~328.9 km
      expect(roadDistanceKm).toBeGreaterThan(310);
      expect(roadDistanceKm).toBeLessThan(345);
    });

    it("estimates truck transit time including terminal maneuvering time", () => {
      // 100 km at 68 km/h ~ 88 mins + 15 mins terminal gate/maneuver = ~103 mins
      const transitShort = estimateTruckTransitMinutes(100);
      expect(transitShort).toBeGreaterThan(90);
      expect(transitShort).toBeLessThan(120);

      const formatted = formatTransitMinutes(transitShort);
      expect(formatted).toMatch(/^\d+h \d+m$/);
    });

    it("calculates granular drayage tariffs with base rate, FSC, and specialized surcharges", () => {
      const costDryStandard = calculateDrayageCosts({
        distanceKm: 150,
        cargoWeightKg: 18000,
        containerType: "40HC",
        baseRateEuro: 140,
        perKmRateEuro: 1.35,
        fuelSurchargePct: 12,
        tollPerKmEuro: 0.18,
      });

      // Base 140€ + 150 * 1.35€ = 342.50€
      expect(costDryStandard.baseRate).toBe(140);
      expect(costDryStandard.distanceRate).toBe(150 * 1.35);
      expect(costDryStandard.fuelSurcharge).toBeGreaterThan(0);
      expect(costDryStandard.tollsEurovignette).toBe(150 * 0.18);
      expect(costDryStandard.subtotalNet).toBeGreaterThan(350);
      expect(costDryStandard.vatAmount).toBeGreaterThan(0);
      expect(costDryStandard.totalGross).toBeGreaterThan(
        costDryStandard.subtotalNet,
      );
      expect(costDryStandard.currency).toBe("EUR");

      // Specialized: Reefer + Genset + Heavy Weight (>22t)
      const costHeavyReefer = calculateDrayageCosts({
        distanceKm: 200,
        cargoWeightKg: 26500, // Heavy weight > 22,000 kg
        containerType: "40HR",
        requiresGenset: true,
        isDangerousGoods: true,
      });

      expect(costHeavyReefer.equipmentSurcharge).toBeGreaterThan(0);
      expect(costHeavyReefer.heavyWeightSurcharge).toBeGreaterThan(0);
      expect(costHeavyReefer.dangerousGoodsSurcharge).toBeGreaterThan(0);
      expect(costHeavyReefer.totalGross).toBeGreaterThan(
        costDryStandard.totalGross,
      );
    });

    it("calculates Scope 3 greenhouse emissions under GLEC Framework v3.0 / ISO 14083", () => {
      const distanceKm = 300;
      const cargoWeightKg = 22000; // 22 metric tonnes

      const carbonData = calculateDrayageCarbon(distanceKm, cargoWeightKg);

      // Tonne-km = 300 km * 22 tonnes = 6,600 t-km
      expect(carbonData.tonnesKm).toBe(6600);
      expect(carbonData.frameworkVersion).toBe(
        "GLEC Framework v3.0 / ISO 14083",
      );
      expect(carbonData.conventionalDieselKgCO2e).toBeGreaterThan(0);
      expect(carbonData.hvo100RenewableKgCO2e).toBeGreaterThan(0);

      // HVO100 renewable diesel achieves 85% GHG emission reduction vs fossil diesel
      expect(carbonData.savingsPercentage).toBe(85);
      expect(carbonData.co2eSavingsKg).toBeGreaterThan(
        carbonData.conventionalDieselKgCO2e * 0.8,
      );
    });
  });

  describe("Service: Drayage Engine Service (Routing & Terminals)", () => {
    it("finds closest intermodal container terminals ordered by proximity", async () => {
      const nearestTerminals = await drayageEngineService.findNearestTerminals(
        zaragozaLogisticsHub,
        5,
      );

      expect(Array.isArray(nearestTerminals)).toBe(true);
      expect(nearestTerminals.length).toBeGreaterThanOrEqual(1);

      const foundTerminal = nearestTerminals.find(
        (t) => t.id === testTerminalAddressId,
      );
      expect(foundTerminal).toBeDefined();
      expect(foundTerminal?.companyName).toBe(
        "BEST Terminal - Hutchison Ports",
      );
      expect(foundTerminal?.distanceKm).toBeGreaterThan(0);
      expect(foundTerminal?.transitMinutes).toBeGreaterThan(0);
    });

    it("calculates complete drayage quote with OSRM routing and Haversine fallback", async () => {
      const quote = await drayageEngineService.calculateQuote({
        originCoords: zaragozaLogisticsHub,
        destinationCoords: portDeBarcelonaTerminal,
        containerType: "40HC",
        cargoWeightKg: 20000,
        requiresGenset: false,
        isDangerousGoods: false,
      });

      expect(quote).toBeDefined();
      expect(quote.distanceKm).toBeGreaterThan(250);
      expect(["OSRM_ROAD_NETWORK", "HAVERSINE_ESTIMATED"]).toContain(
        quote.routingEngine,
      );
      expect(quote.costs.totalGross).toBeGreaterThan(300);
      expect(quote.emissions.frameworkVersion).toContain("GLEC");
      expect(quote.emissions.savingsPercentage).toBe(85);
    });
  });

  describe("Fastify API: /api/drayage Endpoints", () => {
    it("GET /api/drayage/hauliers returns list of registered carriers with contacts", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/drayage/hauliers",
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);

      const haulier = data.find((h: any) => h.id === testHaulierAddressId);
      expect(haulier).toBeDefined();
      expect(haulier.companyName).toBe("Trans-Marítim Container Services S.L.");
      expect(haulier.primaryContact).toBeDefined();
      expect(haulier.primaryContact.email).toBe("trafico@transmaritim.test");
    });

    it("GET /api/drayage/nearest-terminals returns terminals sorted by proximity", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/drayage/nearest-terminals?lat=${zaragozaLogisticsHub.lat}&lon=${zaragozaLogisticsHub.lon}&limit=3`,
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data[0].distanceKm).toBeDefined();
      expect(data[0].transitFormatted).toBeDefined();
    });

    it("POST /api/drayage/quote generates comprehensive drayage tariff and carbon footprint", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/drayage/quote",
        payload: {
          originAddressId: testOriginAddressId,
          destinationAddressId: testTerminalAddressId,
          containerType: "40HC",
          cargoWeightKg: 19500,
          requiresGenset: true,
          isDangerousGoods: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.distanceKm).toBeGreaterThan(250);
      expect(data.costs).toBeDefined();
      expect(data.costs.totalGross).toBeGreaterThan(300);
      expect(data.costs.equipmentSurcharge).toBeGreaterThan(0);
      expect(data.emissions.co2eSavingsKg).toBeGreaterThan(0);
    });

    it("POST /api/drayage/orders dispatches a drayage transport mission and returns confirmation", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/drayage/orders",
        payload: {
          haulierAddressId: testHaulierAddressId,
          originAddressId: testOriginAddressId,
          destinationAddressId: testTerminalAddressId,
          containerNumber: "MSKU9182736",
          containerType: "40HC",
          bookingReference: "BKG-ESBCN-9988",
          pickupDate: new Date().toISOString(),
          notes: "Contenedor de exportación con precinto autorizado SOLAS.",
        },
      });

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res.body);
      expect(data.orderId).toBeDefined();
      expect(data.orderNumber).toMatch(/^DRY-/);
      expect(data.status).toBe("DISPATCHED");
      expect(data.haulier.companyName).toBe(
        "Trans-Marítim Container Services S.L.",
      );
      expect(data.driverPickupPin).toBeDefined();
      expect(data.driverPickupPin).toMatch(/^\d{4}$/);
      expect(data.qrDigest).toBeDefined();
      expect(data.quote).toBeDefined();
      expect(data.quote.distanceKm).toBeGreaterThan(250);
    });
  });
});
