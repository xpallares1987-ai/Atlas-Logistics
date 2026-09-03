import { describe, expect, it } from "vitest";
import { CarbonOffsetService } from "./carbon-offset.service.js";

describe("CarbonOffsetService", () => {
  it("should generate certificate numbers with the expected secure format", () => {
    const certificateNumber = CarbonOffsetService.generateCertificateNumber();
    const year = new Date().getFullYear();

    expect(certificateNumber).toMatch(
      new RegExp(`^ATLAS-CARBON-${year}-\\d{4}$`),
    );
  });
});
