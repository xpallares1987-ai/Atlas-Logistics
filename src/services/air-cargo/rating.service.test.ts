import { describe, it, expect } from "vitest";
import { AirCargoRatingService } from "./rating.service.js";

describe("AirCargoRatingService - Volumetric & Multi-Tier Rating Engine", () => {
  it("should calculate volume and volumetric weight (1:6000 ratio)", () => {
    // 2 pallets: 120cm x 80cm x 100cm = 0.96 m³ each -> 1.92 m³ total
    // Volumetric weight: (120 * 80 * 100 / 6000) * 2 = 160 * 2 = 320 kg
    const dims = AirCargoRatingService.computeDimensions([
      { lengthCm: 120, widthCm: 80, heightCm: 100, quantity: 2 },
    ]);

    expect(dims.totalPieces).toBe(2);
    expect(dims.volumeCbm).toBe(1.92);
    expect(dims.volumetricWeightKg).toBe(320);
  });

  it("should round chargeable weight to standard IATA half-kilograms", () => {
    expect(AirCargoRatingService.roundIataWeight(12.1)).toBe(12.5);
    expect(AirCargoRatingService.roundIataWeight(12.6)).toBe(13.0);
    expect(AirCargoRatingService.roundIataWeight(500.0)).toBe(500.0);
  });

  it("should compute full air rating where volumetric weight exceeds actual weight", () => {
    const result = AirCargoRatingService.calculateRating({
      originAirport: "MAD",
      destinationAirport: "JFK",
      pieces: [{ lengthCm: 120, widthCm: 80, heightCm: 100, quantity: 2 }],
      actualGrossWeightKg: 250, // Volumetric is 320 kg
    });

    expect(result.actualGrossWeightKg).toBe(250);
    expect(result.volumetricWeightKg).toBe(320);
    expect(result.isVolumetricHigher).toBe(true);
    expect(result.chargeableWeightKg).toBe(320);
    expect(result.rateClass).toBe("Q300"); // 300-500 kg bracket
    expect(result.appliedRatePerKg).toBe(3.8);
    expect(result.freightCharge).toBe(1216.0); // 320 * 3.80

    // Surcharges
    const myc = result.otherCharges.find((c) => c.code === "MYC");
    const scc = result.otherCharges.find((c) => c.code === "SCC");
    const awc = result.otherCharges.find((c) => c.code === "AWC");
    const cgc = result.otherCharges.find((c) => c.code === "CGC");

    expect(myc?.amount).toBe(304.0); // 320 * 0.95
    expect(scc?.amount).toBe(48.0); // 320 * 0.15
    expect(awc?.amount).toBe(25.0); // Fixed 25.00
    expect(cgc?.amount).toBe(48.0); // 320 * 0.15 = 48.00 >= min 35.00

    expect(result.totalOtherCharges).toBe(425.0);
    expect(result.totalFreightPayable).toBe(1641.0);
  });

  it("should apply airline minimum charge (M) for small packages", () => {
    const result = AirCargoRatingService.calculateRating({
      originAirport: "MAD",
      destinationAirport: "FRA",
      pieces: [{ lengthCm: 20, widthCm: 20, heightCm: 20, quantity: 1 }],
      actualGrossWeightKg: 2, // 2kg @ 6.50 = 13.00 < 75.00 min
    });

    expect(result.chargeableWeightKg).toBe(2);
    expect(result.rateClass).toBe("M");
    expect(result.freightCharge).toBe(75.0);
  });
});
