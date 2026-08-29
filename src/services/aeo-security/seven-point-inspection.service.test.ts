import { describe, it, expect } from "vitest";
import {
  SevenPointInspectionService,
  SevenPointInspectionInput,
} from "./seven-point-inspection.service.js";

describe("SevenPointInspectionService", () => {
  const cleanInspection: SevenPointInspectionInput = {
    inspectionReference: "7PT-TEST-001",
    equipmentType: "OCEAN_CONTAINER",
    equipmentIdentifier: "MSKU-112233-4",
    inspectorName: "Juan Pérez",
    facilityLocation: "Terminal BCN",
    p1FrontWallPassed: true,
    p2LeftSidePassed: true,
    p3RightSidePassed: true,
    p4FloorPassed: true,
    p5RoofCeilingPassed: true,
    p6DoorsLocksPassed: true,
    p7UndercarriagePassed: true,
    hasAgriculturalContamination: false,
    physicalTamperingDetected: false,
  };

  it("should pass clean inspection when all 7 points and contamination checks are clean", () => {
    const result =
      SevenPointInspectionService.evaluateInspection(cleanInspection);

    expect(result.overallPassed).toBe(true);
    expect(result.inspectionResult).toBe("PASSED_CLEAN");
    expect(result.failedCheckpoints.length).toBe(0);
    expect(result.securityRiskAlerts.length).toBe(0);
  });

  it("should reject container when agricultural contamination (WDO) or tampering is detected", () => {
    const contaminated: SevenPointInspectionInput = {
      ...cleanInspection,
      hasAgriculturalContamination: true,
    };

    const result = SevenPointInspectionService.evaluateInspection(contaminated);

    expect(result.overallPassed).toBe(false);
    expect(result.inspectionResult).toBe("FAILED_REJECTED");
    expect(result.securityRiskAlerts.length).toBeGreaterThan(0);
  });

  it("should require maintenance when a structural point fails (e.g. damaged floor or door bar)", () => {
    const damagedFloor: SevenPointInspectionInput = {
      ...cleanInspection,
      p4FloorPassed: false,
    };

    const result = SevenPointInspectionService.evaluateInspection(damagedFloor);

    expect(result.overallPassed).toBe(false);
    expect(result.inspectionResult).toBe("MAINTENANCE_REQUIRED");
    expect(result.failedCheckpoints).toContain(
      "P4 - Suelo / Tableros de Madera (Floor / Crossmembers)",
    );
  });
});
