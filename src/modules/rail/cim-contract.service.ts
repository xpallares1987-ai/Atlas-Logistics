/**
 * CimContractService
 *
 * Deterministic COTIF / CIM Uniform Rules (Appendix B) Legal Liability & Claims Engine.
 * Calculates statutory carrier liability limits (17.00 SDR/kg), protest notification deadlines and prescription.
 */

export interface CimLiabilityInput {
  grossWeightKg: number;
  declaredValueEur?: number;
  sdrToEurRate?: number; // Default: 1.23 EUR / SDR
}

export interface CimLiabilityResult {
  grossWeightKg: number;
  sdrToEurRate: number;
  statutoryLimitSdr: number; // 17 SDR / kg
  statutoryLimitEur: number;
  isSpecialDeclarationOfValue: boolean;
  maxRecoverableAmountEur: number;
  legalNoticeDeadlineDays: number; // 7 calendar days
  prescriptionPeriodMonths: number; // 12 months (24 if willful misconduct)
  applicableLawArticle: string;
}

export class CimContractService {
  public static readonly STATUTORY_SDR_PER_KG = 17.0; // COTIF CIM Art. 30 § 1
  public static readonly DEFAULT_SDR_RATE = 1.23;

  public static calculateLiabilityLimit(
    input: CimLiabilityInput,
  ): CimLiabilityResult {
    const weight = Math.max(0, input.grossWeightKg);
    const rate = input.sdrToEurRate ?? this.DEFAULT_SDR_RATE;
    const statutoryLimitSdr = Number(
      (weight * this.STATUTORY_SDR_PER_KG).toFixed(2),
    );
    const statutoryLimitEur = Number((statutoryLimitSdr * rate).toFixed(2));

    const declared = input.declaredValueEur ?? 0;
    const isSpecialDeclarationOfValue = declared > statutoryLimitEur;
    const maxRecoverableAmountEur = isSpecialDeclarationOfValue
      ? declared
      : statutoryLimitEur;

    return {
      grossWeightKg: weight,
      sdrToEurRate: rate,
      statutoryLimitSdr,
      statutoryLimitEur,
      isSpecialDeclarationOfValue,
      maxRecoverableAmountEur,
      legalNoticeDeadlineDays: 7, // Art. 47 CIM (daños no aparentes)
      prescriptionPeriodMonths: 12, // Art. 48 CIM
      applicableLawArticle:
        "COTIF Convenio 1999 - Reglas Uniformes CIM Artículo 30 § 1 (17 DEG por kilogramo de masa bruta)",
    };
  }
}
