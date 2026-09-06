import { describe, it, expect } from "vitest";
import { DgPackagingExemptionService } from "./dg-packaging-exemption.service.js";

describe("DgPackagingExemptionService (LQ, ADR 1.1.3.6 & Lithium Batteries)", () => {
  it("should evaluate Limited Quantity (LQ) compliance correctly", () => {
    // Eligible LQ: 0.5L in 1L max limit, 15 kg gross
    const res1 = DgPackagingExemptionService.evaluateLimitedQuantity(
      {
        unNumber: "UN 1203",
        innerReceptacleQuantityKgOrL: 0.5,
        packageGrossMassKg: 15.0,
      },
      1.0,
    );
    expect(res1.isEligible).toBe(true);

    // Ineligible LQ: 2.0L exceeds 1L inner limit
    const res2 = DgPackagingExemptionService.evaluateLimitedQuantity(
      {
        unNumber: "UN 1203",
        innerReceptacleQuantityKgOrL: 2.0,
        packageGrossMassKg: 15.0,
      },
      1.0,
    );
    expect(res2.isEligible).toBe(false);
  });

  it("should calculate ADR 1.1.3.6 points and identify exemption under 1000 points", () => {
    const calc = DgPackagingExemptionService.calculateAdrPoints([
      { unNumber: "UN 1203", transportCategory: 2, netQuantityKgOrL: 200 }, // 200 * 3 = 600 pts
      { unNumber: "UN 1993", transportCategory: 3, netQuantityKgOrL: 300 }, // 300 * 1 = 300 pts
    ]);

    expect(calc.totalPoints).toBe(900);
    expect(calc.isExempt1136).toBe(true);
    expect(calc.status).toBe("EXEMPT_UNDER_1000_POINTS");
    expect(calc.orangePlatesRequired).toBe(false);
    expect(calc.minExtinguisherCapacityKg).toBe(2);
  });

  it("should enforce full ADR requirements when exceeding 1000 points", () => {
    const calc = DgPackagingExemptionService.calculateAdrPoints([
      { unNumber: "UN 1203", transportCategory: 2, netQuantityKgOrL: 400 }, // 400 * 3 = 1200 pts
    ]);

    expect(calc.totalPoints).toBe(1200);
    expect(calc.isExempt1136).toBe(false);
    expect(calc.status).toBe("FULL_ADR_MANDATORY");
    expect(calc.orangePlatesRequired).toBe(true);
  });

  it("should classify Lithium Ion Batteries (UN 3480) under IATA DGR", () => {
    // Section IA: Large battery > 100Wh
    const resIA = DgPackagingExemptionService.classifyLithiumBattery({
      unNumber: "UN 3480",
      batteryWattHours: 150,
      packageCount: 5,
      stateOfChargePercentage: 25,
    });
    expect(resIA.section).toBe("SECTION_IA");
    expect(resIA.isCaoMandatory).toBe(true);
    expect(resIA.isDgdRequired).toBe(true);
    expect(resIA.isSocCompliant).toBe(true);

    // Section II: Small batteries <= 2 packages
    const resII = DgPackagingExemptionService.classifyLithiumBattery({
      unNumber: "UN 3480",
      batteryWattHours: 50,
      packageCount: 2,
      stateOfChargePercentage: 28,
    });
    expect(resII.section).toBe("SECTION_II");
    expect(resII.isDgdRequired).toBe(false);
  });
});
