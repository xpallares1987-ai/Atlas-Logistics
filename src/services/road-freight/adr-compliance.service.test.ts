import { describe, it, expect } from "vitest";
import { AdrComplianceService } from "./adr-compliance.service.js";

describe("AdrComplianceService", () => {
  it("should calculate 1.1.3.6 exemption correctly for small loads (<= 1,000 points)", () => {
    // 200 kg of Category 2 (Gasoline UN 1203) -> 200 * 3 = 600 points <= 1,000 points
    const res = AdrComplianceService.calculateAdrExemption([
      {
        unCode: "UN 1203",
        properShippingName: "GASOLINA",
        adrClass: "3",
        transportCategory: 2,
        quantityUnits: 200,
      },
    ]);

    expect(res.isHazardous).toBe(true);
    expect(res.totalPoints).toBe(600);
    expect(res.isExempt1136).toBe(true);
    expect(res.orangePlatesRequired).toBe(false);
    expect(res.driverAdrCertificateRequired).toBe(false);
  });

  it("should require full ADR and orange plates if points exceed 1,000", () => {
    // 500 kg of Category 2 (500 * 3 = 1,500 points > 1,000 points)
    const res = AdrComplianceService.calculateAdrExemption([
      {
        unCode: "UN 1203",
        properShippingName: "GASOLINA",
        adrClass: "3",
        transportCategory: 2,
        quantityUnits: 500,
        tunnelRestrictionCode: "(D/E)",
      },
    ]);

    expect(res.totalPoints).toBe(1500);
    expect(res.isExempt1136).toBe(false);
    expect(res.orangePlatesRequired).toBe(true);
    expect(res.driverAdrCertificateRequired).toBe(true);
    expect(res.tunnelRestrictionCodes).toContain("(D/E)");
  });

  it("should immediately reject exemption if transport contains Category 0 items", () => {
    const res = AdrComplianceService.calculateAdrExemption([
      {
        unCode: "UN 0113",
        properShippingName: "GUANILNITROSOAMINOGUANILIDENO",
        adrClass: "1.1A",
        transportCategory: 0,
        quantityUnits: 5,
      },
    ]);

    expect(res.hasCategoryZeroItem).toBe(true);
    expect(res.isExempt1136).toBe(false);
    expect(res.orangePlatesRequired).toBe(true);
  });
});
