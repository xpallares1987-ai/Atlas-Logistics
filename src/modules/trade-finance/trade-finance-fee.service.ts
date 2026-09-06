export interface FeeCalculationInput {
  creditAmount: number;
  currency: string;
  tenorDays: number; // e.g. 0 for Sight, 60, 90, 180
  validityMonths?: number; // Duration of credit in months
  openingFeeRatePct?: number; // Default 0.25% per 90-day quarter
  confirmationFeeRatePct?: number; // Default 0.50% p.a. (linked to country/bank risk)
  discrepanciesCount?: number;
  discrepancyFeeAmount?: number; // Default 75.0 EUR/USD
  amendmentsCount?: number;
  amendmentFeeAmount?: number; // Default 50.0 EUR/USD
  paymentSettlementFeeAmount?: number; // Default 60.0 EUR/USD
}

export interface FeeCalculationResult {
  currency: string;
  creditAmount: number;
  tenorDays: number;
  quarterPeriods: number;
  openingFeeRatePct: number;
  confirmationFeeRatePct: number;
  calculatedOpeningFeeEur: number;
  calculatedConfirmationFeeEur: number;
  calculatedDiscrepancyFeeEur: number;
  calculatedAmendmentFeeEur: number;
  calculatedPaymentFeeEur: number;
  totalBankFeesEur: number;
  effectiveBankCostPct: number;
}

export class TradeFinanceFeeService {
  /**
   * Calculates comprehensive bank charges, opening fees, confirmation spreads, and discrepancy penalties.
   */
  public static calculateFees(
    input: FeeCalculationInput,
  ): FeeCalculationResult {
    const openingRate = input.openingFeeRatePct ?? 0.25;
    const confirmRate = input.confirmationFeeRatePct ?? 0.5;
    const discFeeUnit = input.discrepancyFeeAmount ?? 75.0;
    const amendFeeUnit = input.amendmentFeeAmount ?? 50.0;
    const payFeeUnit = input.paymentSettlementFeeAmount ?? 60.0;
    const discCount = input.discrepanciesCount ?? 0;
    const amendCount = input.amendmentsCount ?? 0;

    // Minimum 1 quarter (90 days) for opening fee
    const effectiveDays = Math.max(
      90,
      input.tenorDays ||
        (input.validityMonths ? input.validityMonths * 30 : 90),
    );
    const quarterPeriods = Math.max(1, Math.ceil(effectiveDays / 90));

    // Opening Fee (€) = Amount * (OpeningRate% / 100) * Quarters
    const calculatedOpeningFeeEur = Number(
      (input.creditAmount * (openingRate / 100) * quarterPeriods).toFixed(2),
    );

    // Confirmation Fee (€) = Amount * (ConfirmRate% / 100) * (Days / 360)
    const confirmationFraction = effectiveDays / 360;
    const calculatedConfirmationFeeEur = Number(
      (input.creditAmount * (confirmRate / 100) * confirmationFraction).toFixed(
        2,
      ),
    );

    // Discrepancy & Amendment Fees
    const calculatedDiscrepancyFeeEur = Number(
      (discCount * discFeeUnit).toFixed(2),
    );
    const calculatedAmendmentFeeEur = Number(
      (amendCount * amendFeeUnit).toFixed(2),
    );
    const calculatedPaymentFeeEur = Number(payFeeUnit.toFixed(2));

    const totalBankFeesEur = Number(
      (
        calculatedOpeningFeeEur +
        calculatedConfirmationFeeEur +
        calculatedDiscrepancyFeeEur +
        calculatedAmendmentFeeEur +
        calculatedPaymentFeeEur
      ).toFixed(2),
    );

    const effectiveBankCostPct = Number(
      ((totalBankFeesEur / input.creditAmount) * 100).toFixed(3),
    );

    return {
      currency: input.currency || "EUR",
      creditAmount: input.creditAmount,
      tenorDays: input.tenorDays,
      quarterPeriods,
      openingFeeRatePct: openingRate,
      confirmationFeeRatePct: confirmRate,
      calculatedOpeningFeeEur,
      calculatedConfirmationFeeEur,
      calculatedDiscrepancyFeeEur,
      calculatedAmendmentFeeEur,
      calculatedPaymentFeeEur,
      totalBankFeesEur,
      effectiveBankCostPct,
    };
  }
}
