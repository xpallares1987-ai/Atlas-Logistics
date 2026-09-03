import { randomInt } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { CarbonOffsetService } from "./carbon-offset.service.js";

vi.mock("node:crypto", () => ({
  randomInt: vi.fn(() => 4242),
}));

describe("CarbonOffsetService", () => {
  it("should generate certificate numbers with a cryptographically secure suffix", () => {
    const certificateNumber = CarbonOffsetService.generateCertificateNumber();
    const year = new Date().getFullYear();

    expect(randomInt).toHaveBeenCalledWith(1000, 10000);
    expect(certificateNumber).toBe(`ATLAS-CARBON-${year}-4242`);
  });
});
