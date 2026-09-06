import { describe, it, expect } from "vitest";
import { GeneralAverageAdjustmentService } from "./ga-adjustment.service.js";

describe("GeneralAverageAdjustmentService (York-Antwerp Rules 2016)", () => {
  it("should compute rate of contribution and balance sheets for all interests", () => {
    const result = GeneralAverageAdjustmentService.calculateAdjustment({
      caseReference: "GA-2026-VAL-0012",
      vesselName: "MV Valencia Bridge",
      allowanceSummary: {
        totalShipSacrificesUsd: 250000,
        totalCargoSacrificesUsd: 150000,
        totalRefugeExpensesUsd: 100000,
        totalSalvageAwardsUsd: 500000,
        totalDisbursementsSubjectToCommissionUsd: 100000,
        ruleXxCommissionAmountUsd: 2500,
        daysElapsedForCmiInterest: 180,
        cmiAnnualInterestRatePercentage: 6.0,
        ruleXxiInterestAmountUsd: 29650,
        adjustersFeesExpensesUsd: 15000,
        grandTotalAllowancesUsd: 1047150, // ~$1.047M
        allowanceBreakdown: [],
      },
      contributorySummary: {
        vesselContributoryValueUsd: 12000000,
        freightContributoryValueUsd: 500000,
        cargoContributoryValueUsd: 2460000,
        containersContributoryValueUsd: 0,
        totalContributoryValueUsd: 14960000, // ~$14.96M
        interests: [
          {
            interestCategory: "VESSEL",
            ownerOrReceiverName: "Mediterranean Shipping Carriers SA",
            soundValueDestinationUsd: 12000000,
            particularDamageDeductionUsd: 0,
            madeGoodAllowanceUsd: 250000,
            contributoryValueUsd: 12000000,
          },
          {
            interestCategory: "FREIGHT_AT_RISK",
            ownerOrReceiverName: "Mediterranean Shipping Carriers SA",
            soundValueDestinationUsd: 500000,
            particularDamageDeductionUsd: 0,
            madeGoodAllowanceUsd: 0,
            contributoryValueUsd: 500000,
          },
          {
            interestCategory: "CARGO",
            blReference: "BL-VAL-01",
            ownerOrReceiverName: "Iberica Chem Trading SL",
            cargoDescription: "Resinas de Polipropileno",
            soundValueDestinationUsd: 1200000,
            particularDamageDeductionUsd: 0,
            madeGoodAllowanceUsd: 0,
            contributoryValueUsd: 1200000,
          },
          {
            interestCategory: "CARGO",
            blReference: "BL-VAL-02",
            ownerOrReceiverName: "AgroGrain Exporters",
            cargoDescription: "Trigo a Granel (Jettisoned)",
            soundValueDestinationUsd: 1260000,
            particularDamageDeductionUsd: 0,
            madeGoodAllowanceUsd: 150000,
            contributoryValueUsd: 1260000,
          },
        ],
      },
    });

    expect(result.rateOfContributionPercentage).toBeCloseTo(7.0, 1);
    expect(result.interests.length).toBe(4);
    expect(result.adjustmentCertificationStatement).toContain(
      "York-Antwerp Rules 2016",
    );
    expect(result.interests[2].recommendedCashDepositUsd).toBeGreaterThan(
      result.interests[2].grossContributionUsd,
    );
  });
});
