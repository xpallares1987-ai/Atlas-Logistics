/**
 * Cargo Insurance Claim Adjustment & Settlement Service
 * Deterministic calculation of particular average depreciation, gross loss, and net indemnity after deductible.
 */

export interface ClaimAdjustmentInput {
  totalInsuredValue: number;
  soundMarketValueAtDestination: number;
  damagedSalvageValueAtDestination: number;
  deductibleAmount?: number;
  deductibleType?: "FIXED_AMOUNT" | "PERCENTAGE_OF_SUM";
}

export interface ClaimAdjustmentResult {
  totalInsuredValue: number;
  soundMarketValue: number;
  damagedSalvageValue: number;
  soundLossAmount: number;
  depreciationPercentage: number;
  lossType:
    "ACTUAL_TOTAL_LOSS" | "CONSTRUCTIVE_TOTAL_LOSS" | "PARTICULAR_AVERAGE";
  grossClaimAssessmentAmount: number;
  deductibleAppliedAmount: number;
  netIndemnityPayableAmount: number;
  adjusterStatement: string;
}

export class ClaimAdjustmentSettlementService {
  /**
   * Evaluates cargo loss and computes net indemnity payable under marine insurance practice.
   */
  public static adjustClaim(
    input: ClaimAdjustmentInput,
  ): ClaimAdjustmentResult {
    const insuredVal = Math.max(0, input.totalInsuredValue || 0);
    const soundVal = Math.max(1, input.soundMarketValueAtDestination || 1);
    const salvageVal = Math.max(0, input.damagedSalvageValueAtDestination || 0);

    const soundLoss = Math.max(0, soundVal - salvageVal);
    const depPct = Math.min(
      100,
      Math.round((soundLoss / soundVal) * 100 * 100) / 100,
    );

    let lossType:
      "ACTUAL_TOTAL_LOSS" | "CONSTRUCTIVE_TOTAL_LOSS" | "PARTICULAR_AVERAGE" =
      "PARTICULAR_AVERAGE";

    if (depPct >= 100) {
      lossType = "ACTUAL_TOTAL_LOSS";
    } else if (depPct >= 80) {
      lossType = "CONSTRUCTIVE_TOTAL_LOSS";
    }

    const grossAssessment =
      Math.round(((insuredVal * depPct) / 100) * 100) / 100;

    let appliedDeductible = 0;
    if (input.deductibleType === "PERCENTAGE_OF_SUM") {
      const pct = input.deductibleAmount || 1.0;
      appliedDeductible = Math.round(((insuredVal * pct) / 100) * 100) / 100;
    } else {
      appliedDeductible = Math.min(
        grossAssessment,
        input.deductibleAmount || 0,
      );
    }

    const netIndemnity = Math.max(
      0,
      Math.round((grossAssessment - appliedDeductible) * 100) / 100,
    );

    const statement =
      `Liquidación pericial de siniestro (${lossType}): Depreciación acreditada del ${depPct}%. ` +
      `Evaluación bruta: $${grossAssessment.toLocaleString("en-US", { minimumFractionDigits: 2 })}. ` +
      `Franquicia deducible: $${appliedDeductible.toLocaleString("en-US", { minimumFractionDigits: 2 })}. ` +
      `Indemnización neta a liquidar al beneficiario: $${netIndemnity.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`;

    return {
      totalInsuredValue: insuredVal,
      soundMarketValue: soundVal,
      damagedSalvageValue: salvageVal,
      soundLossAmount: soundLoss,
      depreciationPercentage: depPct,
      lossType,
      grossClaimAssessmentAmount: grossAssessment,
      deductibleAppliedAmount: appliedDeductible,
      netIndemnityPayableAmount: netIndemnity,
      adjusterStatement: statement,
    };
  }
}
