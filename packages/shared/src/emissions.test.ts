import { describe, it, expect } from "vitest";
import {
  calculateScope3Emissions,
  estimateDistance,
  evaluateEcoEfficiency,
} from "./emissions";

describe("Scope 3 Carbon Footprint Calculator", () => {
  describe("estimateDistance", () => {
    it("should correctly estimate distances for recognized lanes", () => {
      // China to Europe
      const oceanLane = estimateDistance("SHANGHAI", "ROTTERDAM", "OCEAN");
      expect(oceanLane.distance).toBe(18000);
      expect(oceanLane.estimated).toBe(true);

      const airLane = estimateDistance("CN", "DE", "AIR");
      expect(airLane.distance).toBe(9000);

      // China to US
      const usLane = estimateDistance("CN", "LAX", "OCEAN");
      expect(usLane.distance).toBe(11500);

      // Europe to US
      const transatlantic = estimateDistance("ROTTERDAM", "NY", "OCEAN");
      expect(transatlantic.distance).toBe(6500);
    });

    it("should handle reverse lanes symmetrically", () => {
      // Europe to China (reverse CN-EU)
      const barcelonaToYantian = estimateDistance("Barcelona", "Yantian", "OCEAN");
      expect(barcelonaToYantian.distance).toBe(18000);

      const barcelonaToNingbo = estimateDistance("Barcelona", "Ningbo", "OCEAN");
      expect(barcelonaToNingbo.distance).toBe(18000);

      const rotterdamToShanghai = estimateDistance("Rotterdam", "Shanghai", "OCEAN");
      expect(rotterdamToShanghai.distance).toBe(18000);

      // US to China (reverse CN-US)
      const laxToShanghai = estimateDistance("LAX", "Shanghai", "OCEAN");
      expect(laxToShanghai.distance).toBe(11500);

      // US to Europe (reverse EU-US)
      const nyToRotterdam = estimateDistance("NY", "Rotterdam", "OCEAN");
      expect(nyToRotterdam.distance).toBe(6500);
    });

    it("should fallback to default distances for unrecognized lanes", () => {
      const unknownOcean = estimateDistance("XYZ", "ABC", "OCEAN");
      expect(unknownOcean.distance).toBe(8000);

      const unknownAir = estimateDistance("XYZ", "ABC", "AIR");
      expect(unknownAir.distance).toBe(4000);
    });
  });

  describe("calculateScope3Emissions", () => {
    it("should calculate emissions correctly when distance is provided", () => {
      const result = calculateScope3Emissions({
        mode: "OCEAN",
        weightKg: 20000, // 20 tonnes
        distanceKm: 10000,
      });

      // 20 tonnes * 10000 km * 0.012 factor = 2400 kg CO2e
      expect(result.co2eKg).toBe(2400);
      expect(result.co2eTonnes).toBe(2.4);
      expect(result.rating).toBe("amber");
      expect(result.factorUsed).toBe(0.012);
      expect(result.isDistanceEstimated).toBe(false);
    });

    it("should automatically estimate distance if distanceKm is omitted", () => {
      const result = calculateScope3Emissions({
        mode: "OCEAN",
        weightKg: 10000, // 10 tonnes
        origin: "SHANGHAI",
        destination: "ROTTERDAM",
      });

      // Estimated distance CN-EU = 18000 km
      // 10 tonnes * 18000 km * 0.012 factor = 2160 kg CO2e
      expect(result.estimatedDistanceKm).toBe(18000);
      expect(result.co2eKg).toBe(2160);
      expect(result.isDistanceEstimated).toBe(true);
    });

    it("should apply reefer multiplier correctly", () => {
      const dryResult = calculateScope3Emissions({
        mode: "OCEAN",
        weightKg: 20000,
        distanceKm: 10000,
        isReefer: false,
      });

      const reeferResult = calculateScope3Emissions({
        mode: "OCEAN",
        weightKg: 20000,
        distanceKm: 10000,
        isReefer: true,
      });

      // Reefer should have 25% higher emissions factor
      expect(reeferResult.co2eKg).toBe(dryResult.co2eKg * 1.25);
      expect(reeferResult.factorUsed).toBe(0.015); // 0.012 * 1.25
    });

    it("should apply equipment-based reefer multiplier", () => {
      const reeferResult = calculateScope3Emissions({
        mode: "OCEAN",
        weightKg: 20000,
        distanceKm: 10000,
        equipmentType: "40RF", // Reefer container
      });

      expect(reeferResult.factorUsed).toBe(0.015);
    });
  });

  describe("evaluateEcoEfficiency", () => {
    it("should provide correct eco scores and descriptors", () => {
      const seaEco = evaluateEcoEfficiency(500, "OCEAN");
      expect(seaEco.score).toBeGreaterThan(90);
      expect(seaEco.descriptor).toBe("Optimal Sea Routing");

      const airEco = evaluateEcoEfficiency(50000, "AIR");
      expect(airEco.score).toBeLessThan(50);
      expect(airEco.descriptor).toBe("High Carbon Intensity");
    });
  });
});
