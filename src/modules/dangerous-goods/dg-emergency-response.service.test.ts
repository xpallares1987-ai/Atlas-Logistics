import { describe, it, expect } from "vitest";
import { DgEmergencyResponseService } from "./dg-emergency-response.service.js";

describe("DgEmergencyResponseService (EmS Schedules & Kemler Codes)", () => {
  it("should resolve EmS schedules, Kemler hazard description and PPE for Gasoline", () => {
    const card = DgEmergencyResponseService.resolveEmergencyCard({
      unNumber: "UN 1203",
      primaryClass: "3",
      emsFireCode: "F-E",
      emsSpillageCode: "S-E",
      kemlerNumber: "33",
      adrTunnelCode: "D/E",
      emergencyPhone24h: "+34 91 562 04 20",
    });

    expect(card.emsFireDetail.code).toBe("F-E");
    expect(card.emsSpillageDetail.code).toBe("S-E");
    expect(card.kemlerInterpretation).toContain("Líquido muy inflamable");
    expect(card.tunnelInterpretation).toContain("túneles");
    expect(card.primaryFireExtinguisher).toContain("espuma");
  });

  it("should resolve specialized PPE for Class 8 Corrosives", () => {
    const card = DgEmergencyResponseService.resolveEmergencyCard({
      unNumber: "UN 1789",
      primaryClass: "8",
      emsFireCode: "F-A",
      emsSpillageCode: "S-B",
      kemlerNumber: "80",
      adrTunnelCode: "E",
      emergencyPhone24h: "+34 91 562 04 20",
    });

    expect(card.requiredPpe).toContain("Traje de protección química");
    expect(card.emsSpillageDetail.instructions).toContain("Neutralizar");
  });
});
