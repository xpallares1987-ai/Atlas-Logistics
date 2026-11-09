import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import scmV1Routes from "../src/routes/scm-v1.routes.js";
import { ensureWorkflowEngineTables } from "../src/scm/kernel/workflow-engine-tables.js";
import {
  isSolasVgmApplicable,
  resolveModeFromLegs,
  resolvePreDepartureCutoffMilestone,
  resolveStandardWorkflowDefinitionKey,
  resolveTransportModeFamily,
} from "../src/scm/kernel/transport-mode.js";
import {
  remapTaskTypeForMode,
  remapWorkflowDefinitionKeyForMode,
  resolveTaskMetadata,
} from "../src/scm/contexts/operational-intelligence/operations-cockpit-bff.context.js";

describe("SOLAS VGM is scoped exclusively to Ocean shipment files", () => {
  describe("1. Transport mode kernel", () => {
    it("classifies service/mode codes into mode families", () => {
      for (const c of [
        "OCEAN_FCL",
        "SEA",
        "FCL",
        "LCL_CONSOL",
        "FCL_DOOR_TO_PORT",
        undefined,
      ]) {
        expect(resolveTransportModeFamily(c)).toBe("OCEAN");
      }
      for (const c of [
        "AIR",
        "AIR_EXPRESS",
        "AIR_EXPEDITE",
        "air_pharma_express",
        "ULD",
      ]) {
        expect(resolveTransportModeFamily(c)).toBe("AIR");
      }
      for (const c of [
        "ROAD",
        "ROAD_FTL",
        "ROAD_LTL",
        "GROUND",
        "RAIL",
        "FTL",
        "LTL",
      ]) {
        expect(resolveTransportModeFamily(c)).toBe("ROAD");
      }
    });

    it("only applies SOLAS VGM to Ocean", () => {
      expect(isSolasVgmApplicable("OCEAN_FCL")).toBe(true);
      expect(isSolasVgmApplicable("SEA")).toBe(true);
      expect(isSolasVgmApplicable("AIR_EXPRESS")).toBe(false);
      expect(isSolasVgmApplicable("ROAD_FTL")).toBe(false);
      expect(isSolasVgmApplicable("RAIL")).toBe(false);
    });

    it("resolves mode-appropriate cut-off milestones and workflow keys", () => {
      expect(resolvePreDepartureCutoffMilestone("SEA").milestoneCode).toBe(
        "VGM_CUTOFF",
      );
      expect(resolvePreDepartureCutoffMilestone("AIR").milestoneCode).toBe(
        "AWB_SECURITY_CUTOFF",
      );
      expect(resolvePreDepartureCutoffMilestone("ROAD").milestoneCode).toBe(
        "CMR_LOADING_CHECK",
      );
      expect(resolvePreDepartureCutoffMilestone("AIR").slaName).not.toMatch(
        /VGM/,
      );
      expect(resolvePreDepartureCutoffMilestone("ROAD").slaName).not.toMatch(
        /VGM/,
      );

      expect(resolveStandardWorkflowDefinitionKey("OCEAN_FCL")).toBe(
        "OCEAN_EXPORT_STANDARD",
      );
      expect(resolveStandardWorkflowDefinitionKey("AIR_EXPRESS")).toBe(
        "AIR_EXPORT_STANDARD",
      );
      expect(resolveStandardWorkflowDefinitionKey("ROAD_FTL")).toBe(
        "ROAD_EXPORT_STANDARD",
      );
    });

    it("prefers the MAIN_CARRIAGE leg mode over pre-carriage", () => {
      expect(
        resolveModeFromLegs([
          { mode: "ROAD", legCategory: "PRE_CARRIAGE" },
          { mode: "SEA", legCategory: "MAIN_CARRIAGE" },
        ]),
      ).toBe("SEA");
      expect(resolveModeFromLegs([{ mode: "AIR" }])).toBe("AIR");
      expect(resolveModeFromLegs([])).toBeUndefined();
    });
  });

  describe("2. Cockpit BFF legacy task remapping", () => {
    it("remaps legacy Ocean tasks on Air and Ground shipment files", () => {
      expect(remapTaskTypeForMode("VERIFY_VGM_CUTOFF", "AIR_EXPRESS")).toBe(
        "VERIFY_AWB_SECURITY_WEIGHT",
      );
      expect(remapTaskTypeForMode("ISSUE_BILL_OF_LADING", "AIR_EXPRESS")).toBe(
        "ISSUE_AIR_WAYBILL",
      );
      expect(remapTaskTypeForMode("VERIFY_VGM_CUTOFF", "ROAD_FTL")).toBe(
        "VERIFY_VEHICLE_AXLE_WEIGHT",
      );
      expect(remapTaskTypeForMode("ISSUE_BILL_OF_LADING", "ROAD_FTL")).toBe(
        "ISSUE_ECMR_WAYBILL",
      );
      expect(remapTaskTypeForMode("VERIFY_VGM_CUTOFF", "OCEAN_FCL")).toBe(
        "VERIFY_VGM_CUTOFF",
      );
      expect(
        remapWorkflowDefinitionKeyForMode(
          "OCEAN_EXPORT_STANDARD",
          "AIR_EXPRESS",
        ),
      ).toBe("AIR_EXPORT_STANDARD");
    });

    it("never renders SOLAS VGM metadata outside Ocean", () => {
      const air = resolveTaskMetadata("VERIFY_VGM_CUTOFF", "AIR_EXPRESS");
      const road = resolveTaskMetadata("VERIFY_VGM_CUTOFF", "ROAD_FTL");
      const ocean = resolveTaskMetadata("VERIFY_VGM_CUTOFF", "OCEAN_FCL");
      expect(JSON.stringify(air)).not.toMatch(/VGM|SOLAS/);
      expect(JSON.stringify(road)).not.toMatch(/VGM|SOLAS/);
      expect(JSON.stringify(ocean)).toMatch(/VGM/);
    });
  });

  describe("3. End-to-end workflow instantiation per mode", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = Fastify();
      await app.register(scmV1Routes, { prefix: "/api/scm/v1" });
      await app.ready();
      await ensureWorkflowEngineTables();
    });

    afterAll(async () => {
      await app.close();
    });

    const cases = [
      {
        serviceType: "AIR_EXPRESS",
        transportMode: "AIR",
        originStopType: "AIRPORT",
        destinationStopType: "AIRPORT",
        expectedTasks: [
          "CONFIRM_CARRIER_BOOKING",
          "VERIFY_AWB_SECURITY_WEIGHT",
          "ISSUE_AIR_WAYBILL",
        ],
        expectedMilestone: "AWB_SECURITY_CUTOFF",
      },
      {
        serviceType: "ROAD_FTL",
        transportMode: "ROAD",
        originStopType: "ORIGIN",
        destinationStopType: "DESTINATION",
        expectedTasks: [
          "CONFIRM_CARRIER_BOOKING",
          "VERIFY_VEHICLE_AXLE_WEIGHT",
          "ISSUE_ECMR_WAYBILL",
        ],
        expectedMilestone: "CMR_LOADING_CHECK",
      },
    ];

    for (const c of cases) {
      it(`${c.serviceType} shipment files receive mode-specific tasks without SOLAS VGM`, async () => {
        const resShipment = await app.inject({
          method: "POST",
          url: "/api/scm/v1/operational/shipments",
          payload: {
            shipmentReference: `SHP-MODE-${c.serviceType}-${Date.now()}`,
            serviceType: c.serviceType,
            customerPartyId: "pty_global_export",
          },
        });
        expect(resShipment.statusCode).toBe(201);
        const shipment = resShipment.json();

        const resRoute = await app.inject({
          method: "POST",
          url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/route-plan`,
          payload: {
            stops: [
              { sequence: 1, locationId: "ESBCN", stopType: c.originStopType },
              {
                sequence: 2,
                locationId: "DEFRA",
                stopType: c.destinationStopType,
              },
            ],
            legs: [
              {
                sequence: 1,
                originLocationId: "ESBCN",
                destinationLocationId: "DEFRA",
                transportMode: c.transportMode,
                plannedDeparture: "2026-11-15T08:00:00Z",
                plannedArrival: "2026-11-16T12:00:00Z",
              },
            ],
          },
        });
        expect(resRoute.statusCode).toBe(201);

        const res360 = await app.inject({
          method: "GET",
          url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/360`,
        });
        expect(res360.statusCode).toBe(200);
        const model360 = res360.json();

        const taskTypes = model360.tasks.map((t: any) => t.taskType).sort();
        expect(taskTypes).toEqual([...c.expectedTasks].sort());
        expect(taskTypes).not.toContain("VERIFY_VGM_CUTOFF");
        expect(taskTypes).not.toContain("ISSUE_BILL_OF_LADING");

        const serialized = JSON.stringify(model360);
        expect(serialized).not.toContain("VGM_CUTOFF");
        expect(serialized).toContain(c.expectedMilestone);
      });
    }
  });
});
