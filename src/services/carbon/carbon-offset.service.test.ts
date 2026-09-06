import { describe, expect, it } from "vitest";
import { CarbonOffsetService } from "./carbon-offset.service.js";

describe("CarbonOffsetService", () => {
  it("should generate certificate numbers with a cryptographically secure suffix", () => {
    const certificateNumber = CarbonOffsetService.generateCertificateNumber();
    const year = new Date().getFullYear();

    expect(certificateNumber).toMatch(
      new RegExp(`^ATLAS-CARBON-${year}-\\d{4,5}$`),
    );
  });

  it("should calculate correct carbon offset cost based on unit price", () => {
    const cost = CarbonOffsetService.calculateCost(12.5, 24.0);
    expect(cost).toBe(300);
  });
});
