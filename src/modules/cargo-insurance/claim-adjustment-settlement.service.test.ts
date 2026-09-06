import { describe, it, expect } from "vitest";
import { ClaimAdjustmentSettlementService } from "./claim-adjustment-settlement.service.js";

describe("ClaimAdjustmentSettlementService (Particular Average & Deductibles)", () => {
  it("should calculate partial damage indemnity with fixed deductible", () => {
    // Insured sum: 110,000 EUR
    // Sound Destination Value: 100,000 EUR
    // Damaged Salvage Value: 40,000 EUR
    // Loss: 60,000 EUR -> Depreciation: 60%
    // Gross Assessment: 110,000 * 0.60 = 66,000 EUR
    // Fixed Deductible: 1,000 EUR
    // Net Indemnity: 65,000 EUR
    const res = ClaimAdjustmentSettlementService.adjustClaim({
      totalInsuredValue: 110000,
      soundMarketValueAtDestination: 100000,
      damagedSalvageValueAtDestination: 40000,
      deductibleAmount: 1000,
      deductibleType: "FIXED_AMOUNT",
    });

    expect(res.depreciationPercentage).toBe(60);
    expect(res.lossType).toBe("PARTICULAR_AVERAGE");
    expect(res.grossClaimAssessmentAmount).toBe(66000);
    expect(res.deductibleAppliedAmount).toBe(1000);
    expect(res.netIndemnityPayableAmount).toBe(65000);
    expect(res.adjusterStatement).toContain("Indemnización neta");
  });

  it("should calculate actual total loss when salvage value is zero", () => {
    const res = ClaimAdjustmentSettlementService.adjustClaim({
      totalInsuredValue: 200000,
      soundMarketValueAtDestination: 180000,
      damagedSalvageValueAtDestination: 0,
      deductibleAmount: 500,
    });

    expect(res.depreciationPercentage).toBe(100);
    expect(res.lossType).toBe("ACTUAL_TOTAL_LOSS");
    expect(res.grossClaimAssessmentAmount).toBe(200000);
    expect(res.netIndemnityPayableAmount).toBe(199500);
  });
});
