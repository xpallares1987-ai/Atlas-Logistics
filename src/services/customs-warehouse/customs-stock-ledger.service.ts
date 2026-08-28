/**
 * Customs Stock Ledger Service (Libro Oficial de Existencias AEAT / CAU)
 *
 * Implements:
 * 1. Sequential immutable bookkeeping of bonded warehouse movements.
 * 2. Validation of Authorized Usual Forms of Handling under Article 220 UCC (Annex 71-03 Delegated Reg.).
 * 3. Traceability of inventory lot balances (packages, mass, suspended debt).
 */

export interface UsualHandlingValidationInput {
  handlingTypeCode:
    | "LABELING_MARKING"
    | "REPACKING_SORTING"
    | "VENTILATION_DRYING"
    | "TESTING_SAMPLING"
    | "PRESERVATION_CLEANING"
    | "ALTERATION_MANUFACTURING"; // forbidden in DA without processing authorization
  goodsDescription: string;
}

export interface UsualHandlingValidationResult {
  isAuthorizedUnderArt220: boolean;
  handlingCode: string;
  legalCategory: string;
  isSubstantialTransformation: boolean;
  requiresInwardProcessingAuthorization: boolean;
  notes: string;
}

export interface LedgerEntryInput {
  entrySequentialNumber: number;
  lotNumber: string;
  facilityCode: string;
  movementType:
    | "INCLUSION_BONDING"
    | "USUAL_HANDLING_ART220"
    | "PARTIAL_DISCHARGE"
    | "FULL_DISCHARGE"
    | "TRANSFER_BETWEEN_WAREHOUSES"
    | "AUDIT_ADJUSTMENT";
  documentReference: string;
  packagesDelta: number;
  previousPackagesBalance: number;
  grossMassDeltaKg: number;
  previousGrossMassBalanceKg: number;
  releasedSuspendedDebtEur: number;
  movementTimestamp: string;
  authorizedOfficerOrAgent: string;
  notes?: string;
}

export interface LedgerEntryRecord {
  entrySequentialNumber: number;
  lotNumber: string;
  facilityCode: string;
  movementType: string;
  documentReference: string;
  packagesDelta: number;
  packagesBalanceAfter: number;
  grossMassDeltaKg: number;
  grossMassBalanceAfterKg: number;
  releasedSuspendedDebtEur: number;
  movementTimestamp: string;
  authorizedOfficerOrAgent: string;
  notes: string;
  isAudited: boolean;
}

export class CustomsStockLedgerService {
  /**
   * Validates whether a requested form of warehouse handling is authorized under Article 220 UCC
   * without constituting a substantial transformation (which would require Inward Processing).
   */
  static validateUsualHandling(
    input: UsualHandlingValidationInput,
  ): UsualHandlingValidationResult {
    switch (input.handlingTypeCode) {
      case "LABELING_MARKING":
        return {
          isAuthorizedUnderArt220: true,
          handlingCode: "LABELING_MARKING",
          legalCategory:
            "Operación de etiquetado, precintado y marcado identificativo CE (Anexo 71-03 pto. 11)",
          isSubstantialTransformation: false,
          requiresInwardProcessingAuthorization: false,
          notes:
            "Manipulación usual autorizada para cumplimiento de normas de comercialización de la UE.",
        };

      case "REPACKING_SORTING":
        return {
          isAuthorizedUnderArt220: true,
          handlingCode: "REPACKING_SORTING",
          legalCategory:
            "Reacondicionamiento de envases, clasificación y paletizado (Anexo 71-03 pto. 3)",
          isSubstantialTransformation: false,
          requiresInwardProcessingAuthorization: false,
          notes:
            "Manipulación usual autorizada para preparación de distribución logística.",
        };

      case "PRESERVATION_CLEANING":
      case "VENTILATION_DRYING":
        return {
          isAuthorizedUnderArt220: true,
          handlingCode: input.handlingTypeCode,
          legalCategory:
            "Mantenimiento del estado de conservación, secado y eliminación de polvo (Anexo 71-03 pto. 1)",
          isSubstantialTransformation: false,
          requiresInwardProcessingAuthorization: false,
          notes:
            "Manipulación usual autorizada para evitar el deterioro de la mercancía durante la custodia.",
        };

      case "TESTING_SAMPLING":
        return {
          isAuthorizedUnderArt220: true,
          handlingCode: "TESTING_SAMPLING",
          legalCategory:
            "Extracción de muestras y ensayos de calibración sin consumo sustancial (Anexo 71-03 pto. 8)",
          isSubstantialTransformation: false,
          requiresInwardProcessingAuthorization: false,
          notes:
            "Manipulación usual autorizada para control de calidad aduanero y comercial.",
        };

      case "ALTERATION_MANUFACTURING":
      default:
        return {
          isAuthorizedUnderArt220: false,
          handlingCode: input.handlingTypeCode,
          legalCategory: "Transformación o fabricación sustancial",
          isSubstantialTransformation: true,
          requiresInwardProcessingAuthorization: true,
          notes:
            "NO AUTORIZADO en Depósito Aduanero ordinario. Esta operación altera la partida arancelaria y requiere autorización expresa de Perfeccionamiento Activo (Régimen 5100).",
        };
    }
  }

  /**
   * Creates a formal immutable stock ledger entry record with updated balance calculations.
   */
  static createStockLedgerEntry(input: LedgerEntryInput): LedgerEntryRecord {
    const packagesAfter = Math.max(
      0,
      input.previousPackagesBalance + input.packagesDelta,
    );
    const massAfter = Math.max(
      0,
      Math.round(
        (input.previousGrossMassBalanceKg + input.grossMassDeltaKg) * 100,
      ) / 100,
    );

    return {
      entrySequentialNumber: input.entrySequentialNumber,
      lotNumber: input.lotNumber,
      facilityCode: input.facilityCode,
      movementType: input.movementType,
      documentReference: input.documentReference,
      packagesDelta: input.packagesDelta,
      packagesBalanceAfter: packagesAfter,
      grossMassDeltaKg: input.grossMassDeltaKg,
      grossMassBalanceAfterKg: massAfter,
      releasedSuspendedDebtEur: Math.max(
        0,
        Number(input.releasedSuspendedDebtEur) || 0,
      ),
      movementTimestamp: input.movementTimestamp,
      authorizedOfficerOrAgent: input.authorizedOfficerOrAgent,
      notes:
        input.notes ||
        "Asiento contable registrado en el Libro Oficial de Existencias.",
      isAudited: true,
    };
  }
}
