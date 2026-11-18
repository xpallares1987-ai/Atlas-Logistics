/**
 * @file equipment-demurrage-lifecycle.test.ts
 * @description Comprehensive automated integration test suite for Track B:
 * Equipment Control & Demurrage/Detention (D&D) Engine (atlas-equipment-demurrage, atlas-schema-equipment-control).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { demurrageOperationsRoutes } from "../src/routes/operations/demurrage.routes.js";
import {
  validateEquipmentTransition,
  getExpectedNextEvents,
  calculateCalendarDays,
  calculateTieredPenalty,
  evaluateDemurrageAndDetention,
  verifyAndCalculateSolasVgm,
} from "@atlas/shared";
import { DemurrageEngineService } from "../src/services/equipment/demurrage-engine.service.js";
import { db } from "../src/db/index.js";
import {
  containers,
  containerVgm,
  equipmentLifecycle,
  demurrageAccruals,
} from "../src/db/schema/containers.js";
import { shipments } from "../src/db/schema/operations.js";
import { companies, addresses, locations } from "../src/db/schema/core.js";
import { costs } from "../src/db/schema/finance.js";
import { eq, and } from "drizzle-orm";

describe("Track B: Equipment Control & Demurrage/Detention (D&D) Engine", () => {
  let app: FastifyInstance;

  // Canonical test identifiers
  const testCompanyId = "c-trackb-test-01";
  const testShipmentId = "sh-trackb-test-01";
  const testContainer1 = "MSKU9284710"; // Canonical valid ISO 6346 container (Check digit 0)
  const testContainer2 = "CMAU1234564"; // Valid ISO 6346 (Check digit 4)
  const testContainerImport = "MEDU7890125"; // Valid ISO 6346 (Check digit 5)

  beforeAll(async () => {
    app = Fastify();
    await app.register(demurrageOperationsRoutes, {
      prefix: "/api/operations",
    });
    await app.ready();

    // 1. Ensure test company
    await db
      .insert(companies)
      .values({
        id: testCompanyId,
        name: "Track B Test Corp",
      })
      .onConflictDoNothing();

    // 2. Ensure test shipment
    await db
      .insert(shipments)
      .values({
        id: testShipmentId,
        companyId: testCompanyId,
        status: "ARRIVED_POD",
        origin: "Shanghai, China",
        destination: "Valencia, Spain",
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    // Clean up test data
    try {
      await db
        .delete(demurrageAccruals)
        .where(eq(demurrageAccruals.shipmentId, testShipmentId));
      await db
        .delete(equipmentLifecycle)
        .where(eq(equipmentLifecycle.shipmentId, testShipmentId));
      await db
        .delete(containerVgm)
        .where(eq(containerVgm.shipmentId, testShipmentId));
      await db
        .delete(containers)
        .where(eq(containers.shipmentId, testShipmentId));
      await db.delete(costs).where(eq(costs.shipmentId, testShipmentId));
      await db.delete(shipments).where(eq(shipments.id, testShipmentId));
      await db.delete(companies).where(eq(companies.id, testCompanyId));
    } catch (_e) {
      // Ignore cleanup error
    }
  });

  // ==========================================================================
  // SECTION 1: DOMAIN ENGINE - EQUIPMENT STATE MACHINE & LIFECYCLE
  // ==========================================================================

  describe("1. Equipment State Machine & Sequential Integrity", () => {
    it("allows valid initial starting milestones (GATE_OUT_EMPTY, GATE_IN_LADEN, DISCHARGED)", () => {
      expect(validateEquipmentTransition(null, "GATE_OUT_EMPTY").valid).toBe(
        true,
      );
      expect(validateEquipmentTransition(null, "GATE_IN_LADEN").valid).toBe(
        true,
      );
      expect(validateEquipmentTransition(null, "DISCHARGED").valid).toBe(true);
    });

    it("rejects illegal initial starting milestones (GATE_OUT_LADEN, GATE_IN_EMPTY)", () => {
      const res1 = validateEquipmentTransition(null, "GATE_IN_EMPTY");
      expect(res1.valid).toBe(false);
      expect(res1.reason).toContain("Initial equipment event cannot be");

      const res2 = validateEquipmentTransition(null, "GATE_OUT_LADEN");
      expect(res2.valid).toBe(false);
    });

    it("validates sequential export transitions (GATE_OUT_EMPTY -> GATE_IN_LADEN)", () => {
      const res = validateEquipmentTransition(
        "GATE_OUT_EMPTY",
        "GATE_IN_LADEN",
      );
      expect(res.valid).toBe(true);
    });

    it("validates sequential import transitions (DISCHARGED -> GATE_OUT_LADEN -> GATE_IN_EMPTY)", () => {
      const step1 = validateEquipmentTransition("DISCHARGED", "GATE_OUT_LADEN");
      expect(step1.valid).toBe(true);

      const step2 = validateEquipmentTransition(
        "GATE_OUT_LADEN",
        "GATE_IN_EMPTY",
      );
      expect(step2.valid).toBe(true);
    });

    it("rejects illegal out-of-order transitions", () => {
      // Cannot jump from empty dispatch directly to laden gate-out
      const res1 = validateEquipmentTransition(
        "GATE_OUT_EMPTY",
        "GATE_OUT_LADEN",
      );
      expect(res1.valid).toBe(false);
      expect(res1.reason).toContain("Invalid lifecycle transition");

      // Cannot jump from vessel discharge directly to empty return
      const res2 = validateEquipmentTransition("DISCHARGED", "GATE_IN_EMPTY");
      expect(res2.valid).toBe(false);
    });

    it("provides expected subsequent events for given status", () => {
      expect(getExpectedNextEvents(null)).toEqual([
        "GATE_OUT_EMPTY",
        "GATE_IN_LADEN",
        "DISCHARGED",
      ]);
      expect(getExpectedNextEvents("DISCHARGED")).toEqual(["GATE_OUT_LADEN"]);
      expect(getExpectedNextEvents("GATE_OUT_LADEN")).toEqual([
        "GATE_IN_EMPTY",
      ]);
    });
  });

  // ==========================================================================
  // SECTION 2: DOMAIN ENGINE - DEMURRAGE VS DETENTION CLOCK ENGINE
  // ==========================================================================

  describe("2. Demurrage vs Detention Clocks & Free Time Engine", () => {
    it("correctly calculates calendar dwell days between events", () => {
      const start = new Date("2026-05-01T08:00:00Z");
      const end = new Date("2026-05-10T14:00:00Z");
      expect(calculateCalendarDays(start, end)).toBe(9);
    });

    it("evaluates demurrage clock inside free time (0 penalties)", () => {
      const events = [
        {
          containerId: "c1",
          containerNumber: testContainer1,
          eventType: "DISCHARGED" as const,
          eventTimestamp: new Date("2026-05-01T08:00:00Z"),
          reportedBy: "TERMINAL_EDI",
        },
        {
          containerId: "c1",
          containerNumber: testContainer1,
          eventType: "GATE_OUT_LADEN" as const,
          eventTimestamp: new Date("2026-05-04T10:00:00Z"),
          reportedBy: "GATE_OCR",
        },
      ];

      const res = evaluateDemurrageAndDetention({
        containerNumber: testContainer1,
        events,
        demurrageFreeDays: 5,
        defaultDemurrageDailyRate: 150,
        asOfDate: "2026-05-04T12:00:00Z",
      });

      expect(res.demurrage.started).toBe(true);
      expect(res.demurrage.completed).toBe(true);
      expect(res.demurrage.grossCalendarDays).toBe(3);
      expect(res.demurrage.freeDaysRemaining).toBe(2);
      expect(res.demurrage.billableDays).toBe(0);
      expect(res.demurrage.accruedAmount).toBe(0);
      expect(res.isOverdue).toBe(false);
    });

    it("evaluates demurrage clock exceeding free time with tiered penalty rates", () => {
      // 10 calendar days dwell, 5 free days allowed -> 5 billable days
      const events = [
        {
          containerId: "c1",
          containerNumber: testContainer1,
          eventType: "DISCHARGED" as const,
          eventTimestamp: new Date("2026-05-01T08:00:00Z"),
          reportedBy: "TERMINAL_EDI",
        },
        {
          containerId: "c1",
          containerNumber: testContainer1,
          eventType: "GATE_OUT_LADEN" as const,
          eventTimestamp: new Date("2026-05-11T08:00:00Z"),
          reportedBy: "GATE_OCR",
        },
      ];

      // Tier 1: Days 1-4: $150/day. Tier 2: Days 5+: $250/day.
      // 5 billable days: 4 days * 150 = 600, 1 day * 250 = 250 -> Total = 850
      const tiers = [
        { fromDay: 1, toDay: 4, dailyRate: 150, currency: "USD" },
        { fromDay: 5, dailyRate: 250, currency: "USD" },
      ];

      const res = evaluateDemurrageAndDetention({
        containerNumber: testContainer1,
        events,
        demurrageFreeDays: 5,
        demurrageTiers: tiers,
      });

      expect(res.demurrage.grossCalendarDays).toBe(10);
      expect(res.demurrage.billableDays).toBe(5);
      expect(res.demurrage.accruedAmount).toBe(850);
      expect(res.demurrage.tierBreakdown).toHaveLength(2);
      expect(res.demurrage.tierBreakdown[0].subtotal).toBe(600);
      expect(res.demurrage.tierBreakdown[1].subtotal).toBe(250);
      expect(res.isOverdue).toBe(true);
    });

    it("subtracts approved FMC OSRA 2022 clock suspensions from gross dwell", () => {
      // 10 calendar days dwell, 3 days suspended for terminal closure, 5 free days
      // Net dwell = 10 - 3 = 7 days. Billable = 7 - 5 = 2 days.
      const events = [
        {
          containerId: "c1",
          containerNumber: testContainer1,
          eventType: "DISCHARGED" as const,
          eventTimestamp: new Date("2026-05-01T08:00:00Z"),
          reportedBy: "TERMINAL_EDI",
        },
        {
          containerId: "c1",
          containerNumber: testContainer1,
          eventType: "GATE_OUT_LADEN" as const,
          eventTimestamp: new Date("2026-05-11T08:00:00Z"),
          reportedBy: "GATE_OCR",
        },
      ];

      const suspensions = [
        {
          id: "susp-01",
          code: "TERMINAL_GATE_CLOSED" as const,
          reason: "Terminal gate closed due to high winds",
          startDate: "2026-05-03",
          endDate: "2026-05-05",
          suspendedDays: 3,
          approved: true,
        },
      ];

      const res = evaluateDemurrageAndDetention({
        containerNumber: testContainer1,
        events,
        demurrageFreeDays: 5,
        defaultDemurrageDailyRate: 150,
        suspensions,
      });

      expect(res.demurrage.grossCalendarDays).toBe(10);
      expect(res.demurrage.suspendedDays).toBe(3);
      expect(res.demurrage.netDwellDays).toBe(7);
      expect(res.demurrage.billableDays).toBe(2);
      expect(res.demurrage.accruedAmount).toBe(300); // 2 days * 150
    });

    it("strictly separates Demurrage (port dwell) and Detention (customer dwell)", () => {
      // Port dwell: May 01 to May 05 (4 days -> within 5 free days)
      // Customer dwell: May 05 to May 17 (12 days -> 7 free days -> 5 billable days at $100 = $500)
      const events = [
        {
          containerId: "c1",
          containerNumber: testContainer1,
          eventType: "DISCHARGED" as const,
          eventTimestamp: new Date("2026-05-01T08:00:00Z"),
          reportedBy: "TERMINAL_EDI",
        },
        {
          containerId: "c1",
          containerNumber: testContainer1,
          eventType: "GATE_OUT_LADEN" as const,
          eventTimestamp: new Date("2026-05-05T08:00:00Z"),
          reportedBy: "GATE_OCR",
        },
        {
          containerId: "c1",
          containerNumber: testContainer1,
          eventType: "GATE_IN_EMPTY" as const,
          eventTimestamp: new Date("2026-05-17T08:00:00Z"),
          reportedBy: "DEPOT_GATE",
        },
      ];

      const res = evaluateDemurrageAndDetention({
        containerNumber: testContainer1,
        events,
        demurrageFreeDays: 5,
        detentionFreeDays: 7,
        defaultDemurrageDailyRate: 150,
        defaultDetentionDailyRate: 100,
      });

      expect(res.demurrage.billableDays).toBe(0);
      expect(res.demurrage.accruedAmount).toBe(0);

      expect(res.detention.started).toBe(true);
      expect(res.detention.completed).toBe(true);
      expect(res.detention.grossCalendarDays).toBe(12);
      expect(res.detention.billableDays).toBe(5);
      expect(res.detention.accruedAmount).toBe(500);

      expect(res.totalAccruedAmount).toBe(500);
      expect(res.currentStatus).toBe("GATE_IN_EMPTY");
    });
  });

  // ==========================================================================
  // SECTION 3: DOMAIN ENGINE - SOLAS VGM COMPLIANCE
  // ==========================================================================

  describe("3. SOLAS Verified Gross Mass (VGM) Verification", () => {
    it("successfully certifies VGM under Method 1 (certified scale weighing)", () => {
      const vgm = verifyAndCalculateSolasVgm({
        containerNumber: testContainer1,
        weighingMethod: "METHOD_1",
        tareWeightKg: 2200,
        scaleGrossWeightKg: 24500,
        authorizedPerson: "Captain J. Vance",
        signatureDate: "2026-05-01",
      });

      expect(vgm.isValid).toBe(true);
      expect(vgm.vgmWeightKg).toBe(24500);
      expect(vgm.tareWeightKg).toBe(2200);
      expect(vgm.netCargoWeightKg).toBe(22300);
      expect(vgm.errors).toHaveLength(0);
    });

    it("successfully certifies VGM under Method 2 (cargo packages + dunnage + tare)", () => {
      const vgm = verifyAndCalculateSolasVgm({
        containerNumber: testContainer1,
        weighingMethod: "METHOD_2",
        tareWeightKg: 3800, // 40ft tare
        cargoPackagesWeightKg: 18500,
        dunnageAndSecuringWeightKg: 450,
        authorizedPerson: "Elena Rostova",
        signatureDate: "2026-05-01",
      });

      expect(vgm.isValid).toBe(true);
      expect(vgm.vgmWeightKg).toBe(22750); // 3800 + 18500 + 450
      expect(vgm.netCargoWeightKg).toBe(18950);
      expect(vgm.errors).toHaveLength(0);
    });

    it("rejects VGM if container number fails ISO 6346 check digit verification", () => {
      const vgm = verifyAndCalculateSolasVgm({
        containerNumber: "MSKU9284719", // Invalid check digit (correct is 2)
        weighingMethod: "METHOD_1",
        tareWeightKg: 2200,
        scaleGrossWeightKg: 20000,
        authorizedPerson: "John Doe",
        signatureDate: "2026-05-01",
      });

      expect(vgm.isValid).toBe(false);
      expect(vgm.errors.some((e) => e.includes("ISO 6346"))).toBe(true);
    });

    it("rejects VGM if total mass exceeds CSC safety plate maximum permissible rating", () => {
      const vgm = verifyAndCalculateSolasVgm({
        containerNumber: testContainer1,
        weighingMethod: "METHOD_1",
        tareWeightKg: 2200,
        scaleGrossWeightKg: 34000, // Exceeds 30,480 kg
        authorizedPerson: "John Doe",
        signatureDate: "2026-05-01",
      });

      expect(vgm.isValid).toBe(false);
      expect(
        vgm.errors.some((e) => e.includes("exceeds maximum permissible gross")),
      ).toBe(true);
    });

    it("rejects VGM if authorized representative signatory is missing", () => {
      const vgm = verifyAndCalculateSolasVgm({
        containerNumber: testContainer1,
        weighingMethod: "METHOD_1",
        tareWeightKg: 2200,
        scaleGrossWeightKg: 20000,
        authorizedPerson: "", // Missing
        signatureDate: "2026-05-01",
      });

      expect(vgm.isValid).toBe(false);
      expect(vgm.errors.some((e) => e.includes("signatory"))).toBe(true);
    });
  });

  // ==========================================================================
  // SECTION 4: SERVICE LAYER - EQUIPMENT LIFECYCLE & ACCRUAL WORKER
  // ==========================================================================

  describe("4. DemurrageEngineService - Database & Accrual Execution", () => {
    it("records equipment milestone and enforces valid transition sequence", async () => {
      // Step 1: DISCHARGED
      const step1 = await DemurrageEngineService.recordEquipmentEvent({
        shipmentId: testShipmentId,
        containerNumber: testContainer1,
        eventType: "DISCHARGED",
        eventTimestamp: new Date("2026-05-01T08:00:00Z"),
        reportedBy: "PORT_TERMINAL_EDI",
        tenantId: testCompanyId,
      });

      expect(step1.status).toBe("DISCHARGED");
      expect(step1.container.containerNumber).toBe(testContainer1);

      // Step 2: Try illegal transition (DISCHARGED -> GATE_IN_EMPTY) -> must throw
      await expect(
        DemurrageEngineService.recordEquipmentEvent({
          shipmentId: testShipmentId,
          containerNumber: testContainer1,
          eventType: "GATE_IN_EMPTY",
          reportedBy: "DEPOT_GATE",
          tenantId: testCompanyId,
        }),
      ).rejects.toThrow("Invalid lifecycle transition");

      // Step 3: Legal transition (DISCHARGED -> GATE_OUT_LADEN)
      const step2 = await DemurrageEngineService.recordEquipmentEvent({
        shipmentId: testShipmentId,
        containerNumber: testContainer1,
        eventType: "GATE_OUT_LADEN",
        eventTimestamp: new Date("2026-05-08T08:00:00Z"),
        reportedBy: "GATE_OCR",
        tenantId: testCompanyId,
      });

      expect(step2.status).toBe("GATE_OUT_LADEN");

      // Verify lifecycle records
      const history =
        await DemurrageEngineService.getContainerLifecycle(testContainer1);
      expect(history).toHaveLength(2);
      expect(history[0].eventType).toBe("DISCHARGED");
      expect(history[1].eventType).toBe("GATE_OUT_LADEN");
    });

    it("evaluates container D&D with full database history", async () => {
      const res = await DemurrageEngineService.calculateEquipmentDAndD(
        testContainer1,
        {
          demurrageFreeDays: 5,
          defaultDemurrageDailyRate: 150,
        },
      );

      // Discharged May 01 -> Gate Out May 08 = 7 days gross dwell.
      // 5 free days -> 2 billable days * 150 = $300.
      expect(res.demurrage.grossCalendarDays).toBe(7);
      expect(res.demurrage.billableDays).toBe(2);
      expect(res.demurrage.accruedAmount).toBe(300);
      expect(res.currentStatus).toBe("GATE_OUT_LADEN");
    });

    it("generates daily penalty accruals and posts cost line to costs table idempotently", async () => {
      // Container 1 is currently GATE_OUT_LADEN (May 08).
      // Let's test Detention accrual on May 20 (12 days dwell with 7 free days = 5 billable days).
      const accrualDate = "2026-05-20";

      const run1 = await DemurrageEngineService.generateDailyDemurrageAccruals({
        asOfDate: accrualDate,
        tenantId: testCompanyId,
      });

      expect(run1.accrualsGenerated).toBeGreaterThanOrEqual(1);
      expect(run1.costsPosted).toBeGreaterThanOrEqual(1);

      // Check costs table in database
      const costRows = await db
        .select()
        .from(costs)
        .where(eq(costs.shipmentId, testShipmentId));
      expect(costRows.length).toBeGreaterThanOrEqual(1);
      expect(costRows[0].description).toContain("D&D Detention Accrual");

      // IDEMPOTENCY CHECK: Run again for the exact same date
      const run2 = await DemurrageEngineService.generateDailyDemurrageAccruals({
        asOfDate: accrualDate,
        tenantId: testCompanyId,
      });

      // No duplicate accruals or duplicate costs created
      expect(run2.accrualsGenerated).toBe(0);
      expect(run2.costsPosted).toBe(0);

      // Cost rows count unchanged
      const costRowsAfter = await db
        .select()
        .from(costs)
        .where(eq(costs.shipmentId, testShipmentId));
      expect(costRowsAfter.length).toBe(costRows.length);
    });

    it("certifies and persists SOLAS VGM certificate in database", async () => {
      const result = await DemurrageEngineService.certifySolasVgm({
        shipmentId: testShipmentId,
        containerNumber: testContainer1,
        weighingMethod: "METHOD_1",
        tareWeightKg: 2250,
        scaleGrossWeightKg: 26800,
        authorizedPerson: "Marcus Aurelius",
        signatureDate: "2026-05-01T12:00:00Z",
        tenantId: testCompanyId,
      });

      expect(result.certificate.vgmWeightKg).toBe(26800);
      expect(result.certificate.authorizedPerson).toBe("Marcus Aurelius");

      // Verify record exists in container_vgm
      const [dbVgm] = await db
        .select()
        .from(containerVgm)
        .where(eq(containerVgm.id, result.certificate.id));
      expect(dbVgm).toBeDefined();
      expect(dbVgm.vgmWeightKg).toBe(26800);

      // Verify container record tare and payload updated
      const [dbCont] = await db
        .select()
        .from(containers)
        .where(eq(containers.containerNumber, testContainer1));
      expect(dbCont.tareWeightKg).toBe(2250);
    });
  });

  // ==========================================================================
  // SECTION 5: FASTIFY HTTP ROUTES INTEGRATION
  // ==========================================================================

  describe("5. Fastify HTTP Endpoints Integration", () => {
    it("POST /api/operations/demurrage/events records milestone", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/operations/demurrage/events",
        payload: {
          shipmentId: testShipmentId,
          containerNumber: testContainer1,
          eventType: "GATE_IN_EMPTY",
          eventTimestamp: "2026-05-25T10:00:00Z",
          reportedBy: "DEPOT_GATE_PWA",
          tenantId: testCompanyId,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("GATE_IN_EMPTY");
    });

    it("GET /api/operations/demurrage/containers/:containerNumber/lifecycle retrieves history", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/operations/demurrage/containers/${testContainer1}/lifecycle`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.containerNumber).toBe(testContainer1);
      expect(body.events.length).toBeGreaterThanOrEqual(3);
    });

    it("POST /api/operations/demurrage/calculate returns calculation result", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/operations/demurrage/calculate",
        payload: {
          containerNumber: testContainer1,
          options: {
            demurrageFreeDays: 5,
            detentionFreeDays: 7,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.demurrage).toBeDefined();
      expect(body.data.detention).toBeDefined();
    });

    it("POST /api/operations/demurrage/vgm-certify registers VGM declaration", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/operations/demurrage/vgm-certify",
        payload: {
          shipmentId: testShipmentId,
          containerNumber: testContainer1,
          weighingMethod: "METHOD_2",
          tareWeightKg: 2250,
          cargoPackagesWeightKg: 19500,
          dunnageAndSecuringWeightKg: 350,
          authorizedPerson: "Elena Vance",
          signatureDate: "2026-05-02T10:00:00Z",
          tenantId: testCompanyId,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.certificate.vgmWeightKg).toBe(22100);
    });

    it("POST /api/operations/demurrage/vgm-certify rejects invalid check digit with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/operations/demurrage/vgm-certify",
        payload: {
          shipmentId: testShipmentId,
          containerNumber: "INVALID9999",
          weighingMethod: "METHOD_1",
          tareWeightKg: 2200,
          scaleGrossWeightKg: 20000,
          authorizedPerson: "Tester",
          signatureDate: "2026-05-01",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain("ISO 6346");
    });
  });
});
