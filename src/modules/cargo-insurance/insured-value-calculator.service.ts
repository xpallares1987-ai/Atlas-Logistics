/**
 * Insured Value Calculator Service (UCP 600 Art. 28 / Incoterms® 2020 CIF/CIP)
 * Deterministic calculation of statutory insured sum and commercial markup.
 */

export interface InsuredValueCalculationInput {
  commercialInvoiceValue: number;
  freightAmount?: number;
  estimatedInsuranceAmount?: number;
  markupPercentage?: number; // Default 10% under UCP 600 / Incoterms CIF
  conveyanceLimitAmount?: number;
}

export interface InsuredValueCalculationResult {
  commercialInvoiceValue: number;
  freightAmount: number;
  cifBaseAmount: number;
  markupPercentage: number;
  markupAmount: number;
  totalInsuredValue: number; // 110% CIF sum
  isWithinConveyanceLimit: boolean;
  conveyanceLimitAmount?: number;
  conveyanceLimitExcess?: number;
  ucp600ComplianceStatement: string;
}

export class InsuredValueCalculatorService {
  /**
   * Computes the official 110% CIF/CIP insured value under UCP 600 Art. 28.
   */
  public static calculateInsuredValue(
    input: InsuredValueCalculationInput,
  ): InsuredValueCalculationResult {
    const invoice = Math.max(0, input.commercialInvoiceValue || 0);
    const freight = Math.max(0, input.freightAmount || 0);
    const estInsurance = Math.max(0, input.estimatedInsuranceAmount || 0);
    const markupPct =
      input.markupPercentage !== undefined
        ? Math.max(0, input.markupPercentage)
        : 10.0;

    const cifBase = invoice + freight + estInsurance;
    const markupFactor = 1 + markupPct / 100;
    const totalInsured = Math.round(cifBase * markupFactor * 100) / 100;
    const markupAmount = Math.round((totalInsured - cifBase) * 100) / 100;

    const limit = input.conveyanceLimitAmount;
    const isWithinLimit = limit ? totalInsured <= limit : true;
    const excess =
      limit && totalInsured > limit
        ? Math.round((totalInsured - limit) * 100) / 100
        : 0;

    const complianceStmt =
      `Suma asegurada calculada al ${100 + markupPct}% CIF (${totalInsured.toLocaleString("en-US", { minimumFractionDigits: 2 })}). ` +
      (markupPct >= 10
        ? "Cumple plenamente el requisito estatutario del Artículo 28 de las Reglas UCP 600 y los Incoterms® 2020 CIF/CIP (mínimo 110%)."
        : `ALERTA UCP 600: El recargo del ${markupPct}% es inferior al 10% mínimo exigido para créditos documentarios.`);

    return {
      commercialInvoiceValue: invoice,
      freightAmount: freight,
      cifBaseAmount: Math.round(cifBase * 100) / 100,
      markupPercentage: markupPct,
      markupAmount,
      totalInsuredValue: totalInsured,
      isWithinConveyanceLimit: isWithinLimit,
      conveyanceLimitAmount: limit,
      conveyanceLimitExcess: excess,
      ucp600ComplianceStatement: complianceStmt,
    };
  }
}
