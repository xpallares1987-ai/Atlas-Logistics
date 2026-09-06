import { describe, it, expect } from "vitest";
import { TariffService } from "./tariff.service.js";

describe("TariffService (Deterministic Customs Duties & Taxes)", () => {
  it("should calculate standard ad valorem duty and VAT correctly", async () => {
    const result = await TariffService.calculateCustomsDuties({
      hsCode: "8504.40.90.90",
      fobValue: 10000,
      freightCost: 1500,
      insuranceCost: 100,
      currency: "EUR",
      originCountry: "CN",
      destinationCountry: "ES",
    });

    expect(result.customsValueCif).toBe(11600); // 10000 + 1500 + 100
    expect(result.dutyRateApplied).toBeCloseTo(0.033, 3); // 3.3% for 8504
    expect(result.importDuty).toBe(Math.round(11600 * 0.033 * 100) / 100); // 382.80
    expect(result.vatBase).toBe(11600 + result.importDuty); // 11982.80
    expect(result.vatRateApplied).toBe(0.21); // 21%
    expect(result.vatAmount).toBe(
      Math.round((11600 + 382.8) * 0.21 * 100) / 100,
    ); // 2516.39
    expect(result.totalCustomsPayable).toBe(
      result.importDuty + result.vatAmount,
    );
    expect(result.taxBreakdown).toHaveLength(2);
    expect(result.taxBreakdown[0].code).toBe("A00");
    expect(result.taxBreakdown[1].code).toBe("B00");
  });

  it("should apply 0% preferential duty when EUR.1 certificate is present", async () => {
    const result = await TariffService.calculateCustomsDuties({
      hsCode: "6109.10.00.10", // 12% standard duty
      fobValue: 20000,
      freightCost: 2000,
      insuranceCost: 200,
      originCountry: "TR",
      destinationCountry: "ES",
      hasPreferentialOriginCert: true,
    });

    expect(result.customsValueCif).toBe(22200);
    expect(result.dutyType).toBe("PREFERENTIAL_ZERO");
    expect(result.dutyRateApplied).toBe(0);
    expect(result.importDuty).toBe(0);
    expect(result.vatBase).toBe(22200);
    expect(result.vatAmount).toBe(Math.round(22200 * 0.21 * 100) / 100);
    expect(result.totalCustomsPayable).toBe(result.vatAmount);
  });

  it("should calculate specific duty based on gross weight", async () => {
    const result = await TariffService.calculateCustomsDuties({
      hsCode: "2204.21.06.00", // Wine: specific duty 0.131 €/kg
      fobValue: 5000,
      freightCost: 500,
      grossWeightKg: 1000,
      originCountry: "CL",
    });

    expect(result.importDuty).toBe(131); // 1000 * 0.131
    expect(result.vatBase).toBe(5500 + 131);
  });

  it("should search and find TARIC HS codes by keyword or code prefix", async () => {
    const searchCode = await TariffService.searchHsCodes("8504");
    expect(searchCode.length).toBeGreaterThan(0);
    expect(searchCode[0].code).toContain("8504");

    const searchDesc = await TariffService.searchHsCodes("laptop");
    expect(searchDesc.length).toBeGreaterThan(0);
    expect(searchDesc[0].code).toBe("8471.30.00.00");
  });
});
