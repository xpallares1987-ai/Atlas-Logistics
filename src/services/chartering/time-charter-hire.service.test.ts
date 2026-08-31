import { describe, it, expect } from "vitest";
import { TimeCharterHireService } from "./time-charter-hire.service.js";

describe("TimeCharterHireService", () => {
  it("should calculate gross hire and off-hire deductions with bunker compensation", () => {
    // 30 days time charter at 18,500 USD/day = 555,000 USD gross
    const result = TimeCharterHireService.calculateHireStatement({
      charterPeriodStart: "2026-09-01T00:00:00Z",
      charterPeriodEnd: "2026-10-01T00:00:00Z", // 30 days
      dailyHireRateUsd: 18500,
      addressCommissionPercentage: 2.5,
      brokeragePercentage: 1.25,
      offHireEvents: [
        {
          offHireReference: "OFF-2026-001",
          offHireReason: "MAIN_ENGINE_BREAKDOWN",
          offHireStartTimestamp: "2026-09-10T00:00:00Z",
          offHireEndTimestamp: "2026-09-12T00:00:00Z", // 2.0 days (48h)
          bunkerVlsfoConsumedMt: 5.0, // 5 MT * 580 = 2900 USD
          bunkerMgoConsumedMt: 1.0, // 1 MT * 750 = 750 USD
          vlsfoPriceUsdPerMt: 580,
          mgoPriceUsdPerMt: 750,
        },
      ],
    });

    expect(result.grossPeriodDaysDecimal).toBe(30.0);
    expect(result.grossHireAmountUsd).toBe(555000);
    expect(result.totalOffHireDaysDecimal).toBe(2.0);
    expect(result.totalOffHireHireDeductionUsd).toBe(37000); // 2 days * 18500
    expect(result.totalBunkerCompensationUsd).toBe(3650); // 2900 + 750
    expect(result.netHireDaysDecimal).toBe(28.0);
    expect(result.netPayableToOwnerUsd).toBeGreaterThan(450000);
    expect(result.financialSummary).toContain(
      "Periodo de fletamento: 30 días brutos",
    );
  });
});
