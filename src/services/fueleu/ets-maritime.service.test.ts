import { describe, it, expect } from "vitest";
import { EtsMaritimeService } from "./ets-maritime.service.js";

describe("EtsMaritimeService (Directive (EU) 2023/959)", () => {
  it("should calculate 100% ETS liability for Intra-EU voyages including CH4 & N2O GWP", () => {
    const result = EtsMaritimeService.calculateEtsLiability({
      co2EmissionsTonnes: 100.0,
      ch4EmissionsTonnes: 0.5, // 0.5 * 28 = 14 tCO2eq
      n2oEmissionsTonnes: 0.02, // 0.02 * 265 = 5.3 tCO2eq
      scope: "INTRA_EU_100",
      euaPriceEurPerTonne: 80.0,
    });

    expect(result.scopeFactor).toBe(1.0);
    expect(result.grossCo2Tonnes).toBe(100.0);
    expect(result.grossCh4GwpTonnesCo2eq).toBe(14.0);
    expect(result.grossN2oGwpTonnesCo2eq).toBe(5.3);
    expect(result.totalGrossGhgTco2eq).toBe(119.3);
    expect(result.applicableScopeEmissionsTco2eq).toBe(119.3);
    expect(result.totalEtsFinancialLiabilityEur).toBe(119.3 * 80.0); // 9,544.00 €
  });

  it("should calculate 50% ETS liability for Extra-EU voyages", () => {
    const result = EtsMaritimeService.calculateEtsLiability({
      co2EmissionsTonnes: 1000.0,
      ch4EmissionsTonnes: 0.0,
      n2oEmissionsTonnes: 0.0,
      scope: "EXTRA_EU_50",
      euaPriceEurPerTonne: 75.0,
    });

    expect(result.scopeFactor).toBe(0.5);
    expect(result.totalGrossGhgTco2eq).toBe(1000.0);
    expect(result.applicableScopeEmissionsTco2eq).toBe(500.0);
    expect(result.totalEtsFinancialLiabilityEur).toBe(37500.0); // 500 * 75
  });

  it("should compute Green BAF and surcharge per TEU and 40ft container", () => {
    const greenBaf = EtsMaritimeService.calculateGreenBaf({
      carriedTeus: 5000,
      fueleuPenaltyOrFuelPremiumEur: 15000, // 3.00 € / TEU
      etsFinancialLiabilityEur: 50000, // 10.00 € / TEU
    });

    expect(greenBaf.carriedTeus).toBe(5000);
    expect(greenBaf.fueleuImpactPerTeuEur).toBe(3.0);
    expect(greenBaf.etsImpactPerTeuEur).toBe(10.0);
    expect(greenBaf.totalGreenBafSurchargePerTeuEur).toBe(13.0);
    expect(greenBaf.totalGreenSurchargeFor40FtContainerEur).toBe(26.0); // 2 TEUs
  });
});
