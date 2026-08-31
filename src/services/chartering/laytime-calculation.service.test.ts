import { describe, it, expect } from "vitest";
import { LaytimeCalculationService } from "./laytime-calculation.service.js";

describe("LaytimeCalculationService", () => {
  it("should calculate demurrage with rain and SHEX deductions", () => {
    // 35,000 MT at 5,000 MT/day = 7.0 days allowed (604,800 sec)
    const result = LaytimeCalculationService.calculateLaytime({
      cargoQuantityMt: 35000,
      rateMtPerDay: 5000,
      laytimeTerms: "SHEX_EIU",
      demurrageRateUsdPerDay: 14000,
      despatchRateUsdPerDay: 7000,
      laytimeCommencedTimestamp: "2026-09-01T08:00:00Z",
      operationsCompletedTimestamp: "2026-09-10T12:00:00Z",
      events: [
        {
          eventStartTimestamp: "2026-09-01T08:00:00Z",
          eventEndTimestamp: "2026-09-03T08:00:00Z", // 2 days working (48h)
          eventType: "WORKING_OPERATIONS",
        },
        {
          eventStartTimestamp: "2026-09-03T08:00:00Z",
          eventEndTimestamp: "2026-09-03T20:00:00Z", // 12h rain stoppage
          eventType: "RAIN_STOPPAGE",
        },
        {
          eventStartTimestamp: "2026-09-03T20:00:00Z",
          eventEndTimestamp: "2026-09-06T00:00:00Z", // 2d 4h working (52h)
          eventType: "WORKING_OPERATIONS",
        },
        {
          eventStartTimestamp: "2026-09-06T00:00:00Z",
          eventEndTimestamp: "2026-09-07T00:00:00Z", // Sunday (24h) excluded under SHEX
          eventType: "SUNDAY_SHEX_EXCLUDED",
        },
        {
          eventStartTimestamp: "2026-09-07T00:00:00Z",
          eventEndTimestamp: "2026-09-10T12:00:00Z", // 3.5 days working (84h)
          eventType: "WORKING_OPERATIONS",
        },
      ],
    });

    expect(result.allowedDaysDecimal).toBe(7.0);
    expect(result.allowedLaytimeFormatted).toBe("7d 00h 00m");
    expect(result.totalDeductionsSeconds).toBe(36 * 3600); // 12h rain + 24h sunday = 36h
    // Net used = 48h + 52h + 84h = 184h = 7.6667 days
    expect(result.isDemurrage).toBe(true);
    expect(result.payableParty).toBe("CHARTERER_PAYS_OWNER");
    expect(result.totalDemurrageAmountUsd).toBeGreaterThan(0);
    expect(result.totalDespatchAmountUsd).toBe(0);
  });

  it("should calculate despatch when operation finishes earlier than allowed time", () => {
    // 10,000 MT at 2,000 MT/day = 5.0 days allowed (120h)
    const result = LaytimeCalculationService.calculateLaytime({
      cargoQuantityMt: 10000,
      rateMtPerDay: 2000,
      laytimeTerms: "SHINC",
      demurrageRateUsdPerDay: 12000,
      despatchRateUsdPerDay: 6000,
      laytimeCommencedTimestamp: "2026-09-01T08:00:00Z",
      operationsCompletedTimestamp: "2026-09-04T08:00:00Z", // 3.0 days used (72h)
      events: [
        {
          eventStartTimestamp: "2026-09-01T08:00:00Z",
          eventEndTimestamp: "2026-09-04T08:00:00Z",
          eventType: "WORKING_OPERATIONS",
        },
      ],
    });

    expect(result.allowedDaysDecimal).toBe(5.0);
    expect(result.isDemurrage).toBe(false);
    expect(result.despatchDaysDecimal).toBe(2.0); // 2.0 days saved
    expect(result.totalDespatchAmountUsd).toBe(12000); // 2 days * 6000 USD/day
    expect(result.payableParty).toBe("OWNER_PAYS_CHARTERER");
    expect(result.calculationSummary).toContain("PRONTO DESPACHO");
  });

  it("should enforce Once On Demurrage Always On Demurrage rule", () => {
    // 2.0 days allowed (48h)
    const result = LaytimeCalculationService.calculateLaytime({
      cargoQuantityMt: 4000,
      rateMtPerDay: 2000,
      laytimeTerms: "SHEX_EIU",
      demurrageRateUsdPerDay: 10000,
      despatchRateUsdPerDay: 5000,
      laytimeCommencedTimestamp: "2026-09-01T00:00:00Z",
      operationsCompletedTimestamp: "2026-09-05T00:00:00Z",
      events: [
        {
          eventStartTimestamp: "2026-09-01T00:00:00Z",
          eventEndTimestamp: "2026-09-03T00:00:00Z", // 48h working -> completes allowed laytime!
          eventType: "WORKING_OPERATIONS",
        },
        {
          eventStartTimestamp: "2026-09-03T00:00:00Z",
          eventEndTimestamp: "2026-09-04T00:00:00Z", // Rain after on demurrage
          eventType: "RAIN_STOPPAGE",
        },
      ],
      enforceOnceOnDemurrageRule: true,
    });

    const rainEvent = result.eventBreakdowns.find(
      (e) => e.eventType === "RAIN_STOPPAGE",
    );
    expect(rainEvent?.isOnDemurrageDuringEvent).toBe(true);
    expect(rainEvent?.percentCounted).toBe(100); // Not deducted because vessel is on demurrage!
  });
});
