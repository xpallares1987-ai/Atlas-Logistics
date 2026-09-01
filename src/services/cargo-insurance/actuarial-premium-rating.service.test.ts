import { describe, it, expect } from "vitest";
import { ActuarialPremiumRatingService } from "./actuarial-premium-rating.service.js";

describe("ActuarialPremiumRatingService (ICC Clauses & Actuarial Rating)", () => {
  it("should calculate standard ICC (A) All Risks premium with war cover and taxes", () => {
    // 100,000 EUR insured sum, General Cargo, Maritime FCL
    // Base rate: 0.25% * 1.0 * 1.0 + 0.04% war = 0.29%
    // Net premium: 100,000 * 0.0029 = 290 EUR
    // IPS (6%): 17.40 EUR
    // Consorcio CCS (0.005%): 0.01 EUR
    // Gross payable: 307.41 EUR
    const res = ActuarialPremiumRatingService.calculatePremium({
      insuredValue: 100000,
      coverageClause: "ICC_A_ALL_RISKS_2009",
      commodityType: "GENERAL_CARGO",
      transportMode: "MARITIME_OCEAN_FCL",
      hasWarStrikesCover: true,
    });

    expect(res.totalAppliedRatePercentage).toBe(0.29);
    expect(res.netPremiumFinal).toBe(290);
    expect(res.ipsTaxAmount).toBe(17.4);
    expect(res.grossPremiumPayable).toBe(307.41);
    expect(res.isMinPremiumApplied).toBe(false);
  });

  it("should apply minimum premium threshold for small shipments", () => {
    const res = ActuarialPremiumRatingService.calculatePremium({
      insuredValue: 5000,
      coverageClause: "ICC_C_BASIC_PERILS_2009",
      minPremiumAmount: 60,
    });

    expect(res.netPremiumCalculated).toBeLessThan(60);
    expect(res.isMinPremiumApplied).toBe(true);
    expect(res.netPremiumFinal).toBe(60);
    expect(res.grossPremiumPayable).toBe(63.6); // 60 + 6% IPS (3.6)
  });

  it("should adjust rating for High-Tech Electronics in Air Cargo", () => {
    // ICC Air: 0.20% * 1.45 (Electronics) * 0.85 (Air) + 0.04% war = 0.2465 + 0.04 = 0.2865%
    const res = ActuarialPremiumRatingService.calculatePremium({
      insuredValue: 500000,
      coverageClause: "ICC_AIR_ALL_RISKS",
      commodityType: "ELECTRONICS_HIGH_TECH",
      transportMode: "AIR_CARGO",
      hasWarStrikesCover: true,
    });

    expect(res.totalAppliedRatePercentage).toBe(0.2865);
    expect(res.netPremiumFinal).toBe(1432.5);
    expect(res.grossPremiumPayable).toBeGreaterThan(1500);
  });
});
