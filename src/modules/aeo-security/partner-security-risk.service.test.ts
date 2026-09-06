import { describe, it, expect } from "vitest";
import { PartnerSecurityRiskService } from "./partner-security-risk.service.js";

describe("PartnerSecurityRiskService", () => {
  it("should classify an AEO and C-TPAT certified partner as LOW_RISK", () => {
    const result = PartnerSecurityRiskService.assessPartnerRisk({
      partnerName: "Trans-Iberia SA",
      partnerType: "HAULIER_CARRIER",
      hasAeoCertification: true,
      hasCtpatCertification: true,
      iso28000Certified: true,
      securityQuestionnaireScore: 95.0,
      monthsSinceLastAssessment: 6,
    });

    expect(result.calculatedRiskScore).toBeGreaterThanOrEqual(80.0);
    expect(result.riskLevel).toBe("LOW_RISK");
    expect(result.recommendedStatus).toBe("APPROVED_PARTNER");
    expect(result.dueForReassessment).toBe(false);
  });

  it("should classify an uncertified partner with low questionnaire score as HIGH_RISK", () => {
    const result = PartnerSecurityRiskService.assessPartnerRisk({
      partnerName: "Unknown Haulier Ltd",
      partnerType: "HAULIER_CARRIER",
      hasAeoCertification: false,
      hasCtpatCertification: false,
      iso28000Certified: false,
      securityQuestionnaireScore: 40.0,
      monthsSinceLastAssessment: 14,
    });

    expect(result.calculatedRiskScore).toBeLessThan(60.0);
    expect(result.riskLevel).toBe("HIGH_RISK_ENHANCED_CONTROL");
    expect(result.recommendedStatus).toBe("SUSPENDED_REVOKED");
    expect(result.dueForReassessment).toBe(true);
  });
});
