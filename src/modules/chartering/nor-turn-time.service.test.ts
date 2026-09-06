import { describe, it, expect } from "vitest";
import { NorTurnTimeService } from "./nor-turn-time.service.js";

describe("NorTurnTimeService", () => {
  it("should validate and compute 12h turn time on normal business day", () => {
    const result = NorTurnTimeService.validateAndComputeNor({
      norTenderedTimestamp: "2026-09-01T09:00:00Z", // Tuesday 09:00
      turnTimeHours: 12,
      norOfficeHoursOnly: true,
      norClauses: ["WIPON", "WIBON", "WIFPON", "WCCON"],
      isAtBerth: false, // At anchorage, but WIBON clause present
      isInPortLimits: true,
    });

    expect(result.isValidNorTendered).toBe(true);
    expect(result.effectiveNorTimestamp).toBe("2026-09-01T09:00:00.000Z");
    expect(result.turnTimeExpiryTimestamp).toBe("2026-09-01T21:00:00.000Z");
    expect(result.officialLaytimeCommencementTimestamp).toBe(
      "2026-09-01T21:00:00.000Z",
    );
    expect(result.clausesSatisfied.wibonSatisfied).toBe(true);
  });

  it("should shift effective NOR tendered on Sunday to Monday 08:00 UTC", () => {
    const result = NorTurnTimeService.validateAndComputeNor({
      norTenderedTimestamp: "2026-09-06T14:30:00Z", // Sunday 14:30
      turnTimeHours: 6,
      norOfficeHoursOnly: true,
      norClauses: ["WIPON", "WIBON"],
      isAtBerth: true,
    });

    expect(result.isValidNorTendered).toBe(true);
    expect(result.effectiveNorTimestamp).toBe("2026-09-07T08:00:00.000Z"); // Monday 08:00
    expect(result.turnTimeExpiryTimestamp).toBe("2026-09-07T14:00:00.000Z"); // Monday 14:00 (+6h)
  });

  it("should start laytime earlier if cargo operations commence prior to turn time expiry", () => {
    const result = NorTurnTimeService.validateAndComputeNor({
      norTenderedTimestamp: "2026-09-01T08:00:00Z",
      turnTimeHours: 12,
      actualOperationsCommencedTimestamp: "2026-09-01T12:00:00Z",
      countTurnTimeIfUsedEarlier: true,
    });

    expect(result.officialLaytimeCommencementTimestamp).toBe(
      "2026-09-01T12:00:00.000Z",
    );
    expect(result.laytimeCommencementReason).toContain("commenced immediately");
  });
});
