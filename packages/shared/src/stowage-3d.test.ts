import { describe, it, expect } from "vitest";
import {
  EQUIPMENT_CATALOG,
  calculateCenterOfGravity,
  calculateAxleWeightDistribution,
  checkImoSegregationInContainer,
  optimizeStowage3D,
  PlacedCargoItem,
  STOWAGE_DEMO_PRESETS,
} from "./stowage-3d.js";

describe("3D Stowage & Weight Distribution Engine", () => {
  describe("Equipment Profiles Catalog", () => {
    it("should provide valid specifications for standard ISO containers and trailers", () => {
      const c20 = EQUIPMENT_CATALOG["20ft_dry"];
      expect(c20.internalLengthM).toBe(5.90);
      expect(c20.internalWidthM).toBe(2.35);
      expect(c20.maxPayloadKg).toBe(21800);

      const c40hc = EQUIPMENT_CATALOG["40ft_hc"];
      expect(c40hc.internalLengthM).toBe(12.03);
      expect(c40hc.internalHeightM).toBe(2.69);
      expect(c40hc.internalVolumeCbm).toBe(76.2);

      const mega = EQUIPMENT_CATALOG["megatrailer_136"];
      expect(mega.internalLengthM).toBe(13.62);
      expect(mega.category).toBe("ROAD_TRAILER");

      const uld = EQUIPMENT_CATALOG["air_uld_ld3"];
      expect(uld.category).toBe("AIR_CARGO");
    });
  });

  describe("Center of Gravity (CoG) & Stability", () => {
    const cont40 = EQUIPMENT_CATALOG["40ft_dry"];

    it("should return ideal center coordinates when container is empty", () => {
      const res = calculateCenterOfGravity(cont40, []);
      expect(res.cogX).toBe(cont40.internalWidthM / 2);
      expect(res.cogY).toBe(cont40.internalLengthM / 2);
      expect(res.stabilityScore).toBe(100);
      expect(res.lateralStatus).toBe("OPTIMAL");
    });

    it("should correctly compute CoG for symmetrically placed cargo", () => {
      const items: PlacedCargoItem[] = [
        {
          id: "1",
          name: "Left Cargo",
          lengthM: 2.0,
          widthM: 1.0,
          heightM: 1.0,
          weightKg: 2000,
          stackable: false,
          placed: true,
          x: 0.1,
          y: 5.0,
          z: 0,
          rotated: false,
          effectiveWidthM: 1.0,
          effectiveLengthM: 2.0,
          effectiveHeightM: 1.0,
        },
        {
          id: "2",
          name: "Right Cargo",
          lengthM: 2.0,
          widthM: 1.0,
          heightM: 1.0,
          weightKg: 2000,
          stackable: false,
          placed: true,
          x: 1.25, // symmetrical across center (width is 2.35)
          y: 5.0,
          z: 0,
          rotated: false,
          effectiveWidthM: 1.0,
          effectiveLengthM: 2.0,
          effectiveHeightM: 1.0,
        },
      ];

      const res = calculateCenterOfGravity(cont40, items);
      expect(res.lateralStatus).toBe("OPTIMAL");
      expect(Math.abs(res.lateralDeviationPercent)).toBeLessThan(5);
      expect(res.stabilityScore).toBeGreaterThanOrEqual(80);
    });

    it("should detect hazardous lateral deviation when heavy cargo is on one side", () => {
      const items: PlacedCargoItem[] = [
        {
          id: "heavy-left",
          name: "Heavy Machinery",
          lengthM: 4.0,
          widthM: 0.8,
          heightM: 1.2,
          weightKg: 9000,
          stackable: false,
          placed: true,
          x: 0,
          y: 4.0,
          z: 0,
          rotated: false,
          effectiveWidthM: 0.8,
          effectiveLengthM: 4.0,
          effectiveHeightM: 1.2,
        },
      ];

      const res = calculateCenterOfGravity(cont40, items);
      expect(res.lateralStatus).toBe("HAZARDOUS");
      expect(res.safetyRecommendations.some((r) => r.includes("Alerta de escora"))).toBe(true);
      expect(res.stabilityScore).toBeLessThan(75);
    });
  });

  describe("Road Axle Weight Distribution", () => {
    const cont40 = EQUIPMENT_CATALOG["40ft_dry"];

    it("should compute axle loads within legal limits for a balanced 15-tonne payload", () => {
      const items: PlacedCargoItem[] = [
        {
          id: "balanced",
          name: "Evenly Distributed Goods",
          lengthM: 8.0,
          widthM: 2.2,
          heightM: 1.5,
          weightKg: 15000,
          stackable: true,
          placed: true,
          x: 0.05,
          y: 2.0,
          z: 0,
          rotated: false,
          effectiveWidthM: 2.2,
          effectiveLengthM: 8.0,
          effectiveHeightM: 1.5,
        },
      ];

      const res = calculateAxleWeightDistribution(cont40, items);
      expect(res.grossCombinedWeightKg).toBeLessThanOrEqual(40000);
      expect(res.steerOverloadKg).toBe(0);
      expect(res.driveOverloadKg).toBe(0);
      expect(res.trailerOverloadKg).toBe(0);
      expect(res.isLegal).toBe(true);
    });

    it("should detect axle overload when excessive weight is placed at the extreme front", () => {
      const items: PlacedCargoItem[] = [
        {
          id: "front-heavy",
          name: "Massive Die Tooling",
          lengthM: 2.0,
          widthM: 2.0,
          heightM: 1.5,
          weightKg: 24000, // Very heavy near front bulkhead
          stackable: false,
          placed: true,
          x: 0.1,
          y: 0.2, // extreme front (nose)
          z: 0,
          rotated: false,
          effectiveWidthM: 2.0,
          effectiveLengthM: 2.0,
          effectiveHeightM: 1.5,
        },
      ];

      const res = calculateAxleWeightDistribution(cont40, items);
      expect(res.driveOverloadKg).toBeGreaterThan(0);
      expect(res.isLegal).toBe(false);
      expect(res.legalComplianceSummary).toContain("Infracción por sobrepeso");
    });
  });

  describe("IMO / IMDG 7.2.4 Hazardous Materials Segregation", () => {
    it("should allow co-loading of non-hazardous goods without conflict", () => {
      const items: PlacedCargoItem[] = [
        {
          id: "g1",
          name: "Textiles",
          lengthM: 1.2,
          widthM: 1.0,
          heightM: 1.0,
          weightKg: 400,
          stackable: true,
          placed: true,
          x: 0,
          y: 0,
          z: 0,
          rotated: false,
          effectiveWidthM: 1.0,
          effectiveLengthM: 1.2,
          effectiveHeightM: 1.0,
        },
      ];
      const check = checkImoSegregationInContainer(items);
      expect(check.hasIncompatibleHazard).toBe(false);
      expect(check.checks.length).toBe(0);
    });

    it("should flag critical segregation conflict between Class 3 and Class 5.1", () => {
      const items: PlacedCargoItem[] = [
        {
          id: "dg1",
          name: "Gasoline Drums",
          hazardClass: "3",
          lengthM: 1.2,
          widthM: 1.0,
          heightM: 1.0,
          weightKg: 1000,
          stackable: false,
          placed: true,
          x: 0,
          y: 0,
          z: 0,
          rotated: false,
          effectiveWidthM: 1.0,
          effectiveLengthM: 1.2,
          effectiveHeightM: 1.0,
        },
        {
          id: "dg2",
          name: "Hydrogen Peroxide",
          hazardClass: "5.1",
          lengthM: 1.2,
          widthM: 1.0,
          heightM: 1.0,
          weightKg: 800,
          stackable: false,
          placed: true,
          x: 1.0,
          y: 3.0,
          z: 0,
          rotated: false,
          effectiveWidthM: 1.0,
          effectiveLengthM: 1.2,
          effectiveHeightM: 1.0,
        },
      ];

      const check = checkImoSegregationInContainer(items);
      expect(check.hasIncompatibleHazard).toBe(true);
      expect(check.checks[0].imdgRequirementCode).toBe("2");
      expect(check.checks[0].isCompliant).toBe(false);
      expect(check.checks[0].statusMessage).toContain("Prohibición Estricta IMDG");
    });
  });

  describe("Algorithmic 3D Bin Packing Optimizer", () => {
    it("should optimize and pack a multimodal set into a 40ft HC container", () => {
      const preset = STOWAGE_DEMO_PRESETS.balanced_40hc;
      const container = EQUIPMENT_CATALOG[preset.containerType];
      const result = optimizeStowage3D(container, preset.items);

      expect(result.packedItems.length).toBeGreaterThan(0);
      expect(result.totalCargoWeightKg).toBeGreaterThan(5000);
      expect(result.volumeUtilizationPercent).toBeGreaterThan(0);
      expect(result.centerOfGravity.stabilityScore).toBeGreaterThan(60);
      expect(result.axleDistribution).toBeDefined();
    });

    it("should respect max payload constraints and place heavy cargo first on the floor", () => {
      const container = EQUIPMENT_CATALOG["20ft_dry"];
      const items = [
        { id: "1", name: "Heavy Motor", lengthM: 1.5, widthM: 1.5, heightM: 1.2, weightKg: 18000, stackable: false },
        { id: "2", name: "Extra Weight Exceeding Payload", lengthM: 2.0, widthM: 1.5, heightM: 1.5, weightKg: 8000, stackable: false },
      ];

      const result = optimizeStowage3D(container, items);
      // Item 1 takes 18,000 kg (max payload is 21,800 kg), item 2 (8,000 kg) exceeds 21,800 kg total
      expect(result.packedItems.length).toBe(1);
      expect(result.unpackedItems.length).toBe(1);
      expect(result.packedItems[0].z).toBe(0); // placed on the floor
    });
  });
});
