import { describe, it, expect } from "vitest";
import {
  CbamFinancialService,
  CbamLiabilityInput,
} from "./cbam-financial.service.js";

describe("CbamFinancialService (EU ETS Valuation & Art. 9 Foreign Deductions)", () => {
  it("should calculate gross liability under default EU ETS benchmark price", () => {
    const input: CbamLiabilityInput = {
      totalEmbeddedEmissionsTco2e: 1000.0,
      euEtsBenchmarkPriceEur: 85.5,
    };

    const result = CbamFinancialService.calculateCarbonLiability(input);
    expect(result.grossCarbonLiabilityEur).toBe(85500.0);
    expect(result.netCarbonLiabilityEur).toBe(85500.0);
    expect(result.foreignCarbonPricePaidEur).toBe(0.0);
    expect(result.effectiveCarbonPricePerTco2e).toBe(85.5);
    expect(result.hasForeignDeduction).toBe(false);
  });

  it("should deduct foreign carbon price effectively paid in origin (Art. 9)", () => {
    const input: CbamLiabilityInput = {
      totalEmbeddedEmissionsTco2e: 1000.0,
      euEtsBenchmarkPriceEur: 85.5,
      foreignCarbonPricePaidEur: 60000.0, // e.g. Paid in UK ETS
    };

    const result = CbamFinancialService.calculateCarbonLiability(input);
    expect(result.grossCarbonLiabilityEur).toBe(85500.0);
    expect(result.foreignCarbonPricePaidEur).toBe(60000.0);
    expect(result.netCarbonLiabilityEur).toBe(25500.0); // 85500 - 60000
    expect(result.effectiveCarbonPricePerTco2e).toBe(25.5);
    expect(result.hasForeignDeduction).toBe(true);
    expect(result.notes).toContain("deducido un crédito");
  });

  it("should floor net liability at 0 if foreign price paid exceeds EU ETS obligation", () => {
    const input: CbamLiabilityInput = {
      totalEmbeddedEmissionsTco2e: 500.0,
      euEtsBenchmarkPriceEur: 80.0, // Gross 40,000 €
      foreignCarbonPricePaidEur: 45000.0,
    };

    const result = CbamFinancialService.calculateCarbonLiability(input);
    expect(result.grossCarbonLiabilityEur).toBe(40000.0);
    expect(result.netCarbonLiabilityEur).toBe(0.0);
    expect(result.notes).toContain("100% cubierta");
  });
});
