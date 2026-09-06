import { describe, it, expect } from "vitest";
import { CustomsNormalizerService } from "./customs-normalizer.service.js";

describe("CustomsNormalizerService", () => {
  it("should normalize EXW by adding pre-carriage, export costs, freight, and insurance", () => {
    const result = CustomsNormalizerService.normalizeCustomsValue({
      incotermCode: "EXW",
      invoiceValue: 50000,
      preCarriageCost: 600,
      exportFormalitiesCost: 150,
      internationalFreightCost: 3500,
      insuranceCost: 250,
    });

    expect(result.customsValueCif).toBe(54500);
    expect(result.totalAdditions).toBe(4500);
    expect(result.totalDeductions).toBe(0);
    expect(result.adjustments).toHaveLength(4);
    expect(result.duaBox46Value).toBe(54500);
  });

  it("should normalize FOB by adding freight and insurance", () => {
    const result = CustomsNormalizerService.normalizeCustomsValue({
      incotermCode: "FOB",
      invoiceValue: 80000,
      internationalFreightCost: 4000,
      insuranceCost: 300,
    });

    expect(result.customsValueCif).toBe(84300);
    expect(result.totalAdditions).toBe(4300);
    expect(result.totalDeductions).toBe(0);
  });

  it("should leave CIF and CIP invoice value as exact customs value", () => {
    const resultCif = CustomsNormalizerService.normalizeCustomsValue({
      incotermCode: "CIF",
      invoiceValue: 120000,
    });
    expect(resultCif.customsValueCif).toBe(120000);
    expect(resultCif.totalAdditions).toBe(0);

    const resultCip = CustomsNormalizerService.normalizeCustomsValue({
      incotermCode: "CIP",
      invoiceValue: 185000,
    });
    expect(resultCip.customsValueCif).toBe(185000);
    expect(resultCip.totalAdditions).toBe(0);
  });

  it("should normalize DDP by deducting import duties, VAT, and destination transport", () => {
    const result = CustomsNormalizerService.normalizeCustomsValue({
      incotermCode: "DDP",
      invoiceValue: 100000,
      importDutyCost: 4000,
      importVatCost: 21000,
      destinationHandlingCost: 1500,
    });

    expect(result.customsValueCif).toBe(73500); // 100,000 - 4000 - 21000 - 1500
    expect(result.totalDeductions).toBe(26500);
    expect(result.totalAdditions).toBe(0);
    expect(result.adjustments).toHaveLength(3);
  });
});
