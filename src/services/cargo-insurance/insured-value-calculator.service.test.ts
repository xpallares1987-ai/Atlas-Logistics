import { describe, it, expect } from "vitest";
import { InsuredValueCalculatorService } from "./insured-value-calculator.service.js";

describe("InsuredValueCalculatorService (UCP 600 Art. 28 / Incoterms CIF)", () => {
  it("should calculate statutory 110% CIF insured value with default 10% markup", () => {
    const res = InsuredValueCalculatorService.calculateInsuredValue({
      commercialInvoiceValue: 100000,
      freightAmount: 8000,
      estimatedInsuranceAmount: 500,
    });

    expect(res.cifBaseAmount).toBe(108500);
    expect(res.markupPercentage).toBe(10);
    expect(res.totalInsuredValue).toBe(119350); // 108500 * 1.10
    expect(res.markupAmount).toBe(10850);
    expect(res.ucp600ComplianceStatement).toContain("Cumple plenamente");
    expect(res.isWithinConveyanceLimit).toBe(true);
  });

  it("should detect conveyance limit excess for high value shipments", () => {
    const res = InsuredValueCalculatorService.calculateInsuredValue({
      commercialInvoiceValue: 1200000,
      freightAmount: 50000,
      conveyanceLimitAmount: 1000000,
    });

    expect(res.totalInsuredValue).toBe(1375000); // 1250000 * 1.10
    expect(res.isWithinConveyanceLimit).toBe(false);
    expect(res.conveyanceLimitExcess).toBe(375000);
  });

  it("should warn if markup is lower than 10%", () => {
    const res = InsuredValueCalculatorService.calculateInsuredValue({
      commercialInvoiceValue: 50000,
      markupPercentage: 5,
    });

    expect(res.totalInsuredValue).toBe(52500);
    expect(res.ucp600ComplianceStatement).toContain("ALERTA UCP 600");
  });
});
