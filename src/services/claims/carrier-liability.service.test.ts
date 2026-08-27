import { describe, it, expect } from "vitest";
import { CarrierLiabilityService } from "./carrier-liability.service.js";

describe("CarrierLiabilityService", () => {
  it("should calculate Hague-Visby limit based on weight vs package rule", () => {
    // Case 1: 3,200 kg across 4 packages -> 3,200 * 2 = 6,400 SDR vs 4 * 666.67 = 2,666.68 SDR -> 6,400 SDR
    const res1 = CarrierLiabilityService.calculateStatutoryLiability({
      convention: "HAGUE_VISBY",
      transportMode: "OCEAN",
      damagedWeightKg: 3200,
      packagesCount: 4,
      claimedAmount: 20000,
      incidentDate: new Date(),
    });

    expect(res1.statutorySdrRatePerKg).toBe(2.0);
    expect(res1.totalStatutoryLimitSdr).toBe(6400);
    expect(res1.totalStatutoryLimitEur).toBe(7968.0); // 6,400 * 1.245
    expect(res1.isLiabilityCapped).toBe(true);

    // Case 2: 100 kg across 2 packages -> 100 * 2 = 200 SDR vs 2 * 666.67 = 1,333.34 SDR -> Package rule wins!
    const res2 = CarrierLiabilityService.calculateStatutoryLiability({
      convention: "HAGUE_VISBY",
      transportMode: "OCEAN",
      damagedWeightKg: 100,
      packagesCount: 2,
      claimedAmount: 5000,
      incidentDate: new Date(),
    });

    expect(res2.totalStatutoryLimitSdr).toBe(1333.34);
    expect(res2.totalStatutoryLimitEur).toBe(1660.01);
  });

  it("should calculate Montreal Convention 1999 limit for air cargo (22 SDR/kg)", () => {
    const res = CarrierLiabilityService.calculateStatutoryLiability({
      convention: "MONTREAL_1999",
      transportMode: "AIR",
      damagedWeightKg: 120,
      claimedAmount: 45000,
      incidentDate: new Date(),
    });

    expect(res.statutorySdrRatePerKg).toBe(22.0);
    expect(res.totalStatutoryLimitSdr).toBe(2640); // 120 * 22
    expect(res.totalStatutoryLimitEur).toBe(3286.8); // 2640 * 1.245
    expect(res.timeBarDays).toBe(730);
    expect(res.noticeDeadlineDays).toBe(14);
  });

  it("should calculate CMR Convention limit for road transport (8.33 SDR/kg)", () => {
    const res = CarrierLiabilityService.calculateStatutoryLiability({
      convention: "CMR",
      transportMode: "ROAD",
      damagedWeightKg: 4200,
      claimedAmount: 38000,
      incidentDate: new Date(),
    });

    expect(res.statutorySdrRatePerKg).toBe(8.33);
    expect(res.totalStatutoryLimitSdr).toBe(34986); // 4200 * 8.33
    expect(res.totalStatutoryLimitEur).toBe(43557.57); // 34986 * 1.245
    expect(res.isLiabilityCapped).toBe(false); // Claim 38,000 is lower than statutory cap
  });

  it("should detect when a claim notice is delayed past the statutory notice deadline", () => {
    const pastDelivery = new Date(Date.now() - 86400000 * 20); // 20 days ago
    const lateNotice = new Date(); // today

    const res = CarrierLiabilityService.calculateStatutoryLiability({
      convention: "MONTREAL_1999",
      transportMode: "AIR",
      damagedWeightKg: 100,
      claimedAmount: 10000,
      incidentDate: pastDelivery,
      deliveryDate: pastDelivery,
      noticeDate: lateNotice,
    });

    expect(res.noticeExpired).toBe(true);
    expect(res.legalStatus).toBe("NOTICE_DELAYED");
  });
});
