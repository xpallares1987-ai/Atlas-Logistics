export interface SealRecordInput {
  sealNumber: string;
  sealType:
    | "BOLT_SEAL_CLASS_H"
    | "CABLE_SEAL_CLASS_H"
    | "ELECTRONIC_E_SEAL"
    | "INDICATIVE_SEAL";
  iso17712Compliant: boolean;
  associatedEquipmentIdentifier?: string;
  associatedShipmentReference?: string;
  affixedDate?: string;
  verifiedAtPortOfEntry?: boolean;
  tamperIncidentReport?: string;
}

export interface SealValidationResult {
  sealNumber: string;
  isHighSecurityClassH: boolean;
  isValidForAeoTransit: boolean;
  status:
    "IN_STOCK" | "AFFIXED_TRANSIT" | "VERIFIED_INTACT" | "TAMPERED_BROKEN";
  securityFlags: string[];
}

export class Iso17712SealService {
  /**
   * Validates high-security seal status, ISO 17712 compliance and tamper integrity.
   */
  public static validateSeal(input: SealRecordInput): SealValidationResult {
    const securityFlags: string[] = [];

    const isHighSecurityClassH =
      input.iso17712Compliant &&
      (input.sealType === "BOLT_SEAL_CLASS_H" ||
        input.sealType === "CABLE_SEAL_CLASS_H" ||
        input.sealType === "ELECTRONIC_E_SEAL");

    if (!input.iso17712Compliant) {
      securityFlags.push(
        "Precinto no conforme con ISO 17712: Prohibido su uso para envíos de exportación OEA / C-TPAT.",
      );
    }

    if (input.sealType === "INDICATIVE_SEAL") {
      securityFlags.push(
        "Precinto indicativo (plástico): Solo permitido para paquetería interior, no para cierre de contenedor.",
      );
    }

    let status:
      "IN_STOCK" | "AFFIXED_TRANSIT" | "VERIFIED_INTACT" | "TAMPERED_BROKEN" =
      "IN_STOCK";

    if (input.tamperIncidentReport) {
      status = "TAMPERED_BROKEN";
      securityFlags.push(
        `Incidencia de seguridad registrada: ${input.tamperIncidentReport}`,
      );
    } else if (input.verifiedAtPortOfEntry) {
      status = "VERIFIED_INTACT";
    } else if (input.affixedDate) {
      status = "AFFIXED_TRANSIT";
    }

    const isValidForAeoTransit =
      isHighSecurityClassH && status !== "TAMPERED_BROKEN";

    return {
      sealNumber: input.sealNumber,
      isHighSecurityClassH,
      isValidForAeoTransit,
      status,
      securityFlags,
    };
  }
}
