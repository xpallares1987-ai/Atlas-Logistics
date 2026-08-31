import { describe, it, expect } from "vitest";
import { ContributoryValueService } from "./contributory-value.service.js";

describe("ContributoryValueService (York-Antwerp Rules 2016)", () => {
  it("should assess contributory values with particular damage deductions and made good additions", () => {
    const result = ContributoryValueService.assessContributoryValues([
      {
        interestCategory: "VESSEL",
        ownerOrReceiverName: "Mediterranean Shipping Carriers SA",
        soundValueDestinationUsd: 18000000,
        particularDamageDeductionUsd: 500000,
        madeGoodAllowanceUsd: 250000,
      },
      {
        interestCategory: "FREIGHT_AT_RISK",
        ownerOrReceiverName: "Mediterranean Shipping Carriers SA",
        soundValueDestinationUsd: 650000,
        particularDamageDeductionUsd: 50000, // subsequent fuel/crew
        madeGoodAllowanceUsd: 0,
      },
      {
        interestCategory: "CARGO",
        blReference: "MSCU-VAL-01",
        ownerOrReceiverName: "Iberica Chem Trading SL",
        cargoDescription: "Resinas de Polipropileno",
        soundValueDestinationUsd: 1200000,
        particularDamageDeductionUsd: 0,
        madeGoodAllowanceUsd: 0,
      },
      {
        interestCategory: "CARGO",
        blReference: "MSCU-VAL-02",
        ownerOrReceiverName: "AgroGrain Exporters",
        cargoDescription: "Trigo a Granel (Jettisoned)",
        soundValueDestinationUsd: 800000,
        particularDamageDeductionUsd: 0,
        madeGoodAllowanceUsd: 150000, // Made good for jettison
      },
    ]);

    expect(result.vesselContributoryValueUsd).toBe(17750000); // 18M - 500k + 250k
    expect(result.freightContributoryValueUsd).toBe(600000); // 650k - 50k
    expect(result.cargoContributoryValueUsd).toBe(2150000); // 1.2M + (800k + 150k = 950k)
    expect(result.totalContributoryValueUsd).toBe(20500000); // 17.75M + 0.6M + 2.15M
    expect(result.interests.length).toBe(4);
  });
});
