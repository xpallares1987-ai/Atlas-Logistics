import { describe, it, expect } from "vitest";
import { ComplianceService } from "./compliance.service.js";

describe("ComplianceService (Deterministic Risk & Channel Routing)", () => {
  it("should assign Green Channel for valid EORI, compliant origin, and normal valuation", async () => {
    const audit = await ComplianceService.auditDeclaration({
      eoriNumber: "ESB88492019",
      originCountry: "VN",
      destinationCountry: "ES",
      hsCode: "8471.30.00.00",
      customsValue: 35000,
      grossWeightKg: 500,
      attachedDocumentTypes: ["DOC-INV", "DOC-HBL", "DOC-PKL"],
    });

    expect(audit.riskScore).toBeLessThanOrEqual(20);
    expect(audit.channel).toBe("Green Channel");
    expect(audit.isCleared).toBe(true);
    expect(audit.triggeredFlags).toHaveLength(0);
  });

  it("should assign Red Channel when origin is under trade embargo (e.g. KP / SY)", async () => {
    const audit = await ComplianceService.auditDeclaration({
      eoriNumber: "ESB88492019",
      originCountry: "KP", // North Korea Embargo
      destinationCountry: "ES",
      hsCode: "8504.40.90.90",
      customsValue: 12000,
      grossWeightKg: 300,
      attachedDocumentTypes: ["DOC-INV", "DOC-HBL"],
    });

    expect(audit.riskScore).toBeGreaterThan(60);
    expect(audit.channel).toBe("Red Channel");
    expect(audit.isCleared).toBe(false);
    expect(audit.triggeredFlags.some((f) => f.includes("SANC-01"))).toBe(true);
  });

  it("should assign Red Channel for dual-use restricted commodities", async () => {
    const audit = await ComplianceService.auditDeclaration({
      eoriNumber: "ESB88492019",
      originCountry: "US",
      destinationCountry: "ES",
      hsCode: "9013.80.00.00", // Dual-use lasers
      customsValue: 50000,
      grossWeightKg: 100,
      attachedDocumentTypes: ["DOC-INV", "DOC-HBL"],
    });

    expect(audit.channel).toBe("Red Channel");
    expect(audit.triggeredFlags.some((f) => f.includes("DUAL-01"))).toBe(true);
  });

  it("should penalize missing mandatory documents and missing EORI", async () => {
    const audit = await ComplianceService.auditDeclaration({
      eoriNumber: "INVALID_EORI",
      originCountry: "CN",
      destinationCountry: "ES",
      hsCode: "8504.40.90.90",
      customsValue: 20000,
      attachedDocumentTypes: [],
    });

    expect(audit.riskScore).toBeGreaterThan(20);
    expect(audit.triggeredFlags.some((f) => f.includes("EORI-02"))).toBe(true);
  });
});
