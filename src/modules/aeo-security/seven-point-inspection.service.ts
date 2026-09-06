export interface SevenPointInspectionInput {
  inspectionReference: string;
  equipmentType:
    | "OCEAN_CONTAINER"
    | "ROAD_TRAILER"
    | "REEFER_BOX"
    | "CURTAINSIDER"
    | "BOX_TRUCK";
  equipmentIdentifier: string;
  inspectorName: string;
  facilityLocation: string;
  p1FrontWallPassed: boolean;
  p2LeftSidePassed: boolean;
  p3RightSidePassed: boolean;
  p4FloorPassed: boolean;
  p5RoofCeilingPassed: boolean;
  p6DoorsLocksPassed: boolean;
  p7UndercarriagePassed: boolean;
  hasAgriculturalContamination?: boolean;
  physicalTamperingDetected?: boolean;
}

export interface SevenPointInspectionResult {
  inspectionReference: string;
  equipmentIdentifier: string;
  overallPassed: boolean;
  inspectionResult: "PASSED_CLEAN" | "FAILED_REJECTED" | "MAINTENANCE_REQUIRED";
  failedCheckpoints: string[];
  securityRiskAlerts: string[];
  actionRequired: string;
}

export class SevenPointInspectionService {
  /**
   * Evaluates the physical 7-point structural inspection for C-TPAT & OEAS compliance.
   */
  public static evaluateInspection(
    input: SevenPointInspectionInput,
  ): SevenPointInspectionResult {
    const failedCheckpoints: string[] = [];
    const securityRiskAlerts: string[] = [];

    if (!input.p1FrontWallPassed) {
      failedCheckpoints.push(
        "P1 - Pared Frontal / Mamparo (Front Wall / Bulkhead)",
      );
    }
    if (!input.p2LeftSidePassed) {
      failedCheckpoints.push("P2 - Lado Izquierdo (Left Side Panel)");
    }
    if (!input.p3RightSidePassed) {
      failedCheckpoints.push("P3 - Lado Derecho (Right Side Panel)");
    }
    if (!input.p4FloorPassed) {
      failedCheckpoints.push(
        "P4 - Suelo / Tableros de Madera (Floor / Crossmembers)",
      );
    }
    if (!input.p5RoofCeilingPassed) {
      failedCheckpoints.push(
        "P5 - Techo / Techo Exterior (Roof / Ceiling Structure)",
      );
    }
    if (!input.p6DoorsLocksPassed) {
      failedCheckpoints.push(
        "P6 - Puertas, Bisagras & Mecanismos de Cierre (Doors & Locking Bars)",
      );
    }
    if (!input.p7UndercarriagePassed) {
      failedCheckpoints.push(
        "P7 - Tren de Rodaje / Chasis Exterior (Undercarriage / Chassis)",
      );
    }

    if (input.hasAgriculturalContamination) {
      securityRiskAlerts.push(
        "Alerta Fitosanitaria C-TPAT: Presencia de tierra, residuos orgánicos o plagas (WDO check failed).",
      );
    }

    if (input.physicalTamperingDetected) {
      securityRiskAlerts.push(
        "Alerta de Seguridad Crítica: Indicios de manipulación física, compartimentos ocultos o soldaduras no originales.",
      );
    }

    const hasStructuralFailure = failedCheckpoints.length > 0;
    const hasCriticalContamination =
      Boolean(input.hasAgriculturalContamination) ||
      Boolean(input.physicalTamperingDetected);

    const overallPassed = !hasStructuralFailure && !hasCriticalContamination;

    let inspectionResult:
      "PASSED_CLEAN" | "FAILED_REJECTED" | "MAINTENANCE_REQUIRED" =
      "PASSED_CLEAN";
    let actionRequired =
      "Unidad de transporte conforme y apta para carga y precintado de alta seguridad ISO 17712.";

    if (hasCriticalContamination || input.physicalTamperingDetected) {
      inspectionResult = "FAILED_REJECTED";
      actionRequired =
        "Rechazar unidad. Trasladar a zona de cuarentena y notificar al Oficial de Seguridad de Instalación (PFSO).";
    } else if (hasStructuralFailure) {
      inspectionResult = "MAINTENANCE_REQUIRED";
      actionRequired =
        "Derivar a taller de reparación y subsanación antes de autorizar su posicionamiento en muelle.";
    }

    return {
      inspectionReference: input.inspectionReference,
      equipmentIdentifier: input.equipmentIdentifier,
      overallPassed,
      inspectionResult,
      failedCheckpoints,
      securityRiskAlerts,
      actionRequired,
    };
  }
}
