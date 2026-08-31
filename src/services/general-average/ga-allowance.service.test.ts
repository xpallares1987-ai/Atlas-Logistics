import { describe, it, expect } from "vitest";
import { GeneralAverageAllowanceService } from "./ga-allowance.service.js";

describe("GeneralAverageAllowanceService (York-Antwerp Rules 2016)", () => {
  it("should calculate allowances with Rule XX 2.5% commission and Rule XXI CMI interest", () => {
    const result = GeneralAverageAllowanceService.calculateAllowances({
      casualtyDate: "2026-01-01",
      adjustmentDate: "2026-07-02", // ~182 days
      cmiAnnualInterestRatePercentage: 6.0,
      items: [
        {
          allowanceCategory: "SHIP_SACRIFICE",
          yarRuleReference: "RULE_VII_MACHINERY_DAMAGE",
          description: "Daños a máquina principal al reflotar buque varado",
          creditedPartyType: "SHIPOWNER",
          creditedPartyName: "Naviera Cantábrica SA",
          amountUsd: 250000,
        },
        {
          allowanceCategory: "CARGO_SACRIFICE_EXTINGUISHMENT",
          yarRuleReference: "RULE_III_EXTINGUISHING_FIRE",
          description: "Daños por agua en extinción de incendio en Bodega 2",
          creditedPartyType: "CARGO_OWNER",
          creditedPartyName: "Iberica Grain Exporters SL",
          amountUsd: 120000,
        },
        {
          allowanceCategory: "REFUGE_PORT_DISBURSEMENTS",
          yarRuleReference: "RULE_X_PORT_OF_REFUGE",
          description:
            "Tasas portuarias extraordinarias y practicaje en Marsella",
          creditedPartyType: "SHIPOWNER",
          creditedPartyName: "Naviera Cantábrica SA",
          amountUsd: 80000,
          isDisbursement: true,
        },
        {
          allowanceCategory: "SALVAGE_AWARD_LOF",
          yarRuleReference: "RULE_PARAMOUNT_GENERAL",
          description: "Recompensa de salvamento remolcadores LOF 2024",
          creditedPartyType: "SALVOR",
          creditedPartyName: "Smit Salvage BV",
          amountUsd: 400000,
        },
      ],
    });

    expect(result.totalShipSacrificesUsd).toBe(250000);
    expect(result.totalCargoSacrificesUsd).toBe(120000);
    expect(result.totalRefugeExpensesUsd).toBe(80000);
    expect(result.totalSalvageAwardsUsd).toBe(400000);
    expect(result.ruleXxCommissionAmountUsd).toBe(2000); // 2.5% of 80,000
    expect(result.daysElapsedForCmiInterest).toBeGreaterThanOrEqual(180);
    expect(result.ruleXxiInterestAmountUsd).toBeGreaterThan(0);
    expect(result.grandTotalAllowancesUsd).toBeGreaterThan(850000);
  });

  it("should exclude inadmissible items from general average allowances", () => {
    const result = GeneralAverageAllowanceService.calculateAllowances({
      casualtyDate: "2026-08-01",
      adjustmentDate: "2026-08-15",
      items: [
        {
          allowanceCategory: "SHIP_SACRIFICE",
          yarRuleReference: "RULE_PARAMOUNT_GENERAL",
          description: "Reparación avería particular no indemnizable",
          creditedPartyType: "SHIPOWNER",
          creditedPartyName: "Naviera Cantábrica SA",
          amountUsd: 50000,
          isAdmissible: false,
        },
        {
          allowanceCategory: "CARGO_SACRIFICE_JETTISON",
          yarRuleReference: "RULE_I_JETTISON",
          description: "Echazón de 10 contenedores en cubierta",
          creditedPartyType: "CARGO_OWNER",
          creditedPartyName: "AgroTraders Ltd",
          amountUsd: 150000,
          isAdmissible: true,
        },
      ],
    });

    expect(result.totalShipSacrificesUsd).toBe(0);
    expect(result.totalCargoSacrificesUsd).toBe(150000);
    expect(result.allowanceBreakdown.length).toBe(2);
    expect(result.allowanceBreakdown[0].admissible).toBe(false);
  });
});
