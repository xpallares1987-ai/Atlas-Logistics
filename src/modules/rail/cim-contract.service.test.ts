import { describe, it, expect } from "vitest";
import {
  CimContractService,
  CimLiabilityInput,
} from "./cim-contract.service.js";

describe("CimContractService (COTIF / CIM Uniform Rules Liability Limits)", () => {
  it("should calculate standard 17.00 SDR/kg statutory carrier liability limit", () => {
    const input: CimLiabilityInput = {
      grossWeightKg: 20000.0, // 20 tonnes
      sdrToEurRate: 1.23,
    };

    const result = CimContractService.calculateLiabilityLimit(input);
    expect(result.statutoryLimitSdr).toBe(340000.0); // 20,000 * 17
    expect(result.statutoryLimitEur).toBe(418200.0); // 340,000 * 1.23
    expect(result.isSpecialDeclarationOfValue).toBe(false);
    expect(result.maxRecoverableAmountEur).toBe(418200.0);
    expect(result.legalNoticeDeadlineDays).toBe(7);
  });

  it("should honor special declaration of value exceeding statutory limit", () => {
    const input: CimLiabilityInput = {
      grossWeightKg: 1000.0, // Statutory limit = 1000 * 17 * 1.23 = 20,910 €
      declaredValueEur: 85000.0, // Special declared value
      sdrToEurRate: 1.23,
    };

    const result = CimContractService.calculateLiabilityLimit(input);
    expect(result.isSpecialDeclarationOfValue).toBe(true);
    expect(result.maxRecoverableAmountEur).toBe(85000.0);
  });
});
