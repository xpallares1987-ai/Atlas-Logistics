import { describe, it, expect } from "vitest";
import {
  GlecCalculatorService,
  GLEC_EMISSION_FACTORS,
} from "./glec-calculator.service.js";

describe("GlecCalculatorService (ISO 14083 / GLEC Framework v3)", () => {
  it("should calculate leg emissions correctly for Ocean Container", () => {
    const input = {
      originName: "Shanghai Port",
      destinationName: "Valencia Port",
      mode: "OCEAN_CONTAINER" as const,
      distanceKm: 10000,
      weightKg: 20000, // 20 tonnes
    };

    const result = GlecCalculatorService.calculateLeg(input, 1);

    // 20 tonnes * 10,000 km = 200,000 t-km
    expect(result.weightTonnes).toBe(20);
    expect(result.tonneKm).toBe(200000);

    // factor wtw = 11.8 gCO2e / t-km -> 200,000 * 11.8 / 1,000,000 = 2.36 tCO2e
    expect(result.legTco2eWtw).toBeCloseTo(2.36, 2);
    expect(result.legTco2eTtw).toBeCloseTo(1.94, 2);
    expect(result.legTco2eWtt).toBeCloseTo(0.42, 2);
  });

  it("should calculate leg emissions correctly for Air Freight", () => {
    const input = {
      originName: "Frankfurt Airport",
      destinationName: "JFK Airport",
      mode: "AIR_FREIGHT" as const,
      distanceKm: 6000,
      weightKg: 5000, // 5 tonnes
    };

    const result = GlecCalculatorService.calculateLeg(input, 1);

    // 5 tonnes * 6000 km = 30,000 t-km
    // factor wtw = 602 g/t-km -> 30,000 * 602 / 1,000,000 = 18.06 tCO2e
    expect(result.tonneKm).toBe(30000);
    expect(result.legTco2eWtw).toBeCloseTo(18.06, 2);
  });

  it("should calculate total multimodal journey emissions accurately", () => {
    const legs = [
      {
        originName: "Valencia Port",
        destinationName: "Madrid Dry Port",
        mode: "ROAD_DIESEL" as const,
        distanceKm: 350,
        weightKg: 10000, // 10 tonnes
      },
      {
        originName: "Madrid Dry Port",
        destinationName: "Zaragoza Rail Plaza",
        mode: "RAIL_ELECTRIC" as const,
        distanceKm: 300,
        weightKg: 10000, // 10 tonnes
      },
    ];

    const journey = GlecCalculatorService.calculateJourney(legs);

    expect(journey.totalDistanceKm).toBe(650);
    expect(journey.totalWeightTonnes).toBe(10);
    expect(journey.legs.length).toBe(2);

    // Road: 10 * 350 = 3500 t-km * 62 g/t-km / 1M = 0.217 tCO2e
    // Rail: 10 * 300 = 3000 t-km * 14.5 g/t-km / 1M = 0.0435 tCO2e
    // Total = ~0.2605 tCO2e
    expect(journey.totalTco2eWtw).toBeCloseTo(0.2605, 3);
    expect(journey.carbonIntensityGco2ePerTkm).toBeGreaterThan(0);
  });

  it("should generate viable green alternative corridors", () => {
    const legs = [
      {
        originName: "Barcelona Hub",
        destinationName: "Paris South Terminal",
        mode: "ROAD_DIESEL" as const,
        distanceKm: 1000,
        weightKg: 20000,
      },
    ];

    const alternatives = GlecCalculatorService.generateGreenAlternatives(legs);

    expect(alternatives.length).toBeGreaterThan(0);
    const hvoAlt = alternatives.find((a) => a.alternativeMode === "ROAD_HVO");
    expect(hvoAlt).toBeDefined();
    expect(hvoAlt!.reductionPercentage).toBeGreaterThan(60);
    expect(hvoAlt!.savedTco2e).toBeGreaterThan(0);
  });
});
