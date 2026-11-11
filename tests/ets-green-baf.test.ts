import { describe, it, expect } from "vitest";
import { EtsGreenBafSettlementService } from "../src/modules/fueleu/ets-green-baf-settlement.service.js";

describe("EU ETS Maritime Phase-In & Green BAF Settlement", () => {
  it("should apply Directive (EU) 2023/959 statutory phase-in schedule", () => {
    expect(EtsGreenBafSettlementService.getPhaseInRate(2023)).toBe(0.4);
    expect(EtsGreenBafSettlementService.getPhaseInRate(2024)).toBe(0.4);
    expect(EtsGreenBafSettlementService.getPhaseInRate(2025)).toBe(0.7);
    expect(EtsGreenBafSettlementService.getPhaseInRate(2026)).toBe(1.0);
    expect(EtsGreenBafSettlementService.getPhaseInRate(2027)).toBe(1.0);
  });

  it("should calculate 70% phase-in and 100% intra-EU scope for 2025 voyage", () => {
    const res = EtsGreenBafSettlementService.calculateEtsAndGreenBaf({
      reportingYear: 2025,
      scope: "INTRA_EU_100",
      co2EmissionsTonnes: 100.0,
      ch4EmissionsTonnes: 0.1, // 0.1 * 28 = 2.8 tCO2eq
      n2oEmissionsTonnes: 0.01, // 0.01 * 265 = 2.65 tCO2eq
      euaPriceEurPerTonne: 80.0,
      carriedTeus: 500,
      fueleuPenaltyOrPremiumEur: 5000.0,
    });

    expect(res.reportingYear).toBe(2025);
    expect(res.phaseInRate).toBe(0.7);
    expect(res.scopeFactor).toBe(1.0);

    // Total gross: 100 + 2.8 + 2.65 = 105.45 tCO2eq
    expect(res.grossGhgTco2eq).toBe(105.45);
    expect(res.scopeSubjectGhgTco2eq).toBe(105.45);

    // Obligation: 105.45 * 0.70 = 73.815 EUA tonnes
    expect(res.statutorySurrenderObligationEuaTonnes).toBe(73.815);

    // Financial Liability: 73.815 * 80 = 5905.20 €
    expect(res.totalEtsFinancialLiabilityEur).toBe(5905.2);

    // Green BAF per TEU: (5000 + 5905.20) / 500 = 21.81 €/TEU
    expect(res.fueleuImpactPerTeuEur).toBe(10.0);
    expect(res.etsImpactPerTeuEur).toBe(11.81);
    expect(res.totalGreenBafSurchargePerTeuEur).toBe(21.81);
    expect(res.totalGreenBaf40FtContainerEur).toBe(43.62);
  });

  it("should calculate 50% extra-EU scope and 100% full phase-in for 2026 voyage", () => {
    const res = EtsGreenBafSettlementService.calculateEtsAndGreenBaf({
      reportingYear: 2026,
      scope: "EXTRA_EU_50",
      co2EmissionsTonnes: 200.0,
      euaPriceEurPerTonne: 75.0,
      carriedTeus: 1000,
      fueleuPenaltyOrPremiumEur: 0,
    });

    expect(res.reportingYear).toBe(2026);
    expect(res.phaseInRate).toBe(1.0);
    expect(res.scopeFactor).toBe(0.5);

    // Scope subject: 200 * 0.5 = 100 tCO2eq
    expect(res.scopeSubjectGhgTco2eq).toBe(100.0);
    expect(res.statutorySurrenderObligationEuaTonnes).toBe(100.0);
    expect(res.totalEtsFinancialLiabilityEur).toBe(7500.0);

    // Green BAF per TEU: 7500 / 1000 = 7.50 €/TEU
    expect(res.totalGreenBafSurchargePerTeuEur).toBe(7.5);
    expect(res.totalGreenBaf40FtContainerEur).toBe(15.0);
  });

  it("should settle Green BAF for canonical shipment sh_demo_01 on live voyage voy_2026_01", async () => {
    const settlement =
      await EtsGreenBafSettlementService.settleGreenBafForShipment({
        shipmentId: "sh_demo_01",
        voyageId: "voy_2026_01",
        teuCount: 2, // 1 x 40ft container
        customEuaPrice: 75.0,
      });

    expect(settlement.shipmentId).toBe("sh_demo_01");
    expect(settlement.voyageId).toBe("voy_2026_01");
    expect(settlement.teuCount).toBe(2);
    expect(settlement.greenBafPerTeuEur).toBeGreaterThan(0);
    expect(settlement.shipmentTotalGreenBafEur).toBe(
      Number((settlement.greenBafPerTeuEur * 2).toFixed(2)),
    );
    expect(settlement.auditReference).toContain("ETS-SETTLE-");
  });
});
