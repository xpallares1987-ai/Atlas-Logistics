import { describe, it, expect } from "vitest";
import { Iso17712SealService } from "./iso-17712-seal.service.js";

describe("Iso17712SealService", () => {
  it("should validate a Class H bolt seal as valid for AEO export transit", () => {
    const result = Iso17712SealService.validateSeal({
      sealNumber: "H-ES-2026-001928",
      sealType: "BOLT_SEAL_CLASS_H",
      iso17712Compliant: true,
      associatedEquipmentIdentifier: "MSKU-998877-0",
      affixedDate: "2026-08-28 10:00:00",
    });

    expect(result.isHighSecurityClassH).toBe(true);
    expect(result.isValidForAeoTransit).toBe(true);
    expect(result.status).toBe("AFFIXED_TRANSIT");
    expect(result.securityFlags.length).toBe(0);
  });

  it("should flag broken or tampered seals as TAMPERED_BROKEN and invalid for transit", () => {
    const result = Iso17712SealService.validateSeal({
      sealNumber: "H-ES-2026-001928",
      sealType: "BOLT_SEAL_CLASS_H",
      iso17712Compliant: true,
      tamperIncidentReport:
        "Precinto roto con tenazas en área de descanso no vigilada.",
    });

    expect(result.status).toBe("TAMPERED_BROKEN");
    expect(result.isValidForAeoTransit).toBe(false);
    expect(result.securityFlags.length).toBeGreaterThan(0);
  });

  it("should reject indicative plastic seals for container transit", () => {
    const result = Iso17712SealService.validateSeal({
      sealNumber: "PLAST-1002",
      sealType: "INDICATIVE_SEAL",
      iso17712Compliant: false,
    });

    expect(result.isHighSecurityClassH).toBe(false);
    expect(result.isValidForAeoTransit).toBe(false);
  });
});
