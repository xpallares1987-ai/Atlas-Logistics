/**
 * General Average Allowance Service (York-Antwerp Rules 2016 / 1994)
 * Deterministic computation of admissible General Average sacrifices, port of refuge expenses,
 * Rule XX (2.5% Commission on Funds Disbursed), and Rule XXI (CMI Annual Interest).
 */

export interface AllowanceItemInput {
  allowanceCategory:
    | "SHIP_SACRIFICE"
    | "CARGO_SACRIFICE_JETTISON"
    | "CARGO_SACRIFICE_EXTINGUISHMENT"
    | "REFUGE_PORT_DISBURSEMENTS"
    | "REFUGE_CREW_MAINTENANCE_FUEL"
    | "TEMPORARY_REPAIRS"
    | "SALVAGE_AWARD_LOF"
    | "COMMISSION_FUNDS_RULE_XX"
    | "CMI_INTEREST_RULE_XXI"
    | "ADJUSTERS_FEES_EXPENSES";
  yarRuleReference:
    | "RULE_I_JETTISON"
    | "RULE_II_DAMAGE_JETTISON"
    | "RULE_III_EXTINGUISHING_FIRE"
    | "RULE_VII_MACHINERY_DAMAGE"
    | "RULE_VIII_LIGHTENING_EXPENSES"
    | "RULE_X_PORT_OF_REFUGE"
    | "RULE_XI_CREW_WAGES_FUEL"
    | "RULE_XIV_TEMPORARY_REPAIRS"
    | "RULE_XX_COMMISSION_2_5_PCT"
    | "RULE_XXI_CMI_INTEREST"
    | "RULE_PARAMOUNT_GENERAL";
  description: string;
  creditedPartyType:
    | "SHIPOWNER"
    | "CARGO_OWNER"
    | "SALVOR"
    | "TIME_CHARTERER"
    | "AVERAGE_ADJUSTER";
  creditedPartyName: string;
  amountUsd: number;
  isDisbursement?: boolean; // Eligible for Rule XX 2.5% commission
  isAdmissible?: boolean;
}

export interface GaAllowanceSummary {
  totalShipSacrificesUsd: number;
  totalCargoSacrificesUsd: number;
  totalRefugeExpensesUsd: number;
  totalSalvageAwardsUsd: number;
  totalDisbursementsSubjectToCommissionUsd: number;
  ruleXxCommissionAmountUsd: number; // 2.5% of eligible disbursements
  daysElapsedForCmiInterest: number;
  cmiAnnualInterestRatePercentage: number;
  ruleXxiInterestAmountUsd: number;
  adjustersFeesExpensesUsd: number;
  grandTotalAllowancesUsd: number;
  allowanceBreakdown: {
    category: string;
    rule: string;
    party: string;
    amountUsd: number;
    admissible: boolean;
  }[];
}

export class GeneralAverageAllowanceService {
  /**
   * Calculates total admissible allowances with statutory 2.5% commission and CMI annual interest.
   */
  public static calculateAllowances(params: {
    items: AllowanceItemInput[];
    casualtyDate: string; // ISO date or YYYY-MM-DD
    adjustmentDate?: string; // ISO date or YYYY-MM-DD, defaults to now
    cmiAnnualInterestRatePercentage?: number; // Defaults to 6.0%
    includeRuleXxCommission?: boolean;
    includeRuleXxiInterest?: boolean;
  }): GaAllowanceSummary {
    const cmiRate = params.cmiAnnualInterestRatePercentage ?? 6.0;
    const includeRuleXx = params.includeRuleXxCommission !== false;
    const includeRuleXxi = params.includeRuleXxiInterest !== false;

    let shipSacrifices = 0;
    let cargoSacrifices = 0;
    let refugeExpenses = 0;
    let salvageAwards = 0;
    let adjustersFees = 0;
    let eligibleDisbursements = 0;

    const breakdown: {
      category: string;
      rule: string;
      party: string;
      amountUsd: number;
      admissible: boolean;
    }[] = [];

    for (const item of params.items) {
      const isAdmissible = item.isAdmissible !== false;
      if (!isAdmissible) {
        breakdown.push({
          category: item.allowanceCategory,
          rule: item.yarRuleReference,
          party: item.creditedPartyName,
          amountUsd: item.amountUsd,
          admissible: false,
        });
        continue;
      }

      switch (item.allowanceCategory) {
        case "SHIP_SACRIFICE":
          shipSacrifices += item.amountUsd;
          break;
        case "CARGO_SACRIFICE_JETTISON":
        case "CARGO_SACRIFICE_EXTINGUISHMENT":
          cargoSacrifices += item.amountUsd;
          break;
        case "REFUGE_PORT_DISBURSEMENTS":
        case "REFUGE_CREW_MAINTENANCE_FUEL":
        case "TEMPORARY_REPAIRS":
          refugeExpenses += item.amountUsd;
          if (item.isDisbursement !== false) {
            eligibleDisbursements += item.amountUsd;
          }
          break;
        case "SALVAGE_AWARD_LOF":
          salvageAwards += item.amountUsd;
          break;
        case "ADJUSTERS_FEES_EXPENSES":
          adjustersFees += item.amountUsd;
          break;
        default:
          break;
      }

      breakdown.push({
        category: item.allowanceCategory,
        rule: item.yarRuleReference,
        party: item.creditedPartyName,
        amountUsd: item.amountUsd,
        admissible: true,
      });
    }

    // 1. Rule XX: 2.5% Commission on Funds Provided / Disbursed
    const commissionRuleXx = includeRuleXx
      ? Math.round(eligibleDisbursements * 0.025 * 100) / 100
      : 0;

    // 2. Rule XXI: CMI Annual Interest from casualty date to adjustment date
    const startMs = new Date(params.casualtyDate).getTime();
    const endMs = params.adjustmentDate
      ? new Date(params.adjustmentDate).getTime()
      : Date.now();
    const daysElapsed = Math.max(
      1,
      Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)),
    );

    const basePrincipal =
      shipSacrifices +
      cargoSacrifices +
      refugeExpenses +
      salvageAwards +
      commissionRuleXx;

    const interestRuleXxi = includeRuleXxi
      ? Math.round(
          basePrincipal * (cmiRate / 100) * (daysElapsed / 365) * 100,
        ) / 100
      : 0;

    const grandTotal = basePrincipal + interestRuleXxi + adjustersFees;

    return {
      totalShipSacrificesUsd: Math.round(shipSacrifices * 100) / 100,
      totalCargoSacrificesUsd: Math.round(cargoSacrifices * 100) / 100,
      totalRefugeExpensesUsd: Math.round(refugeExpenses * 100) / 100,
      totalSalvageAwardsUsd: Math.round(salvageAwards * 100) / 100,
      totalDisbursementsSubjectToCommissionUsd:
        Math.round(eligibleDisbursements * 100) / 100,
      ruleXxCommissionAmountUsd: commissionRuleXx,
      daysElapsedForCmiInterest: daysElapsed,
      cmiAnnualInterestRatePercentage: cmiRate,
      ruleXxiInterestAmountUsd: interestRuleXxi,
      adjustersFeesExpensesUsd: Math.round(adjustersFees * 100) / 100,
      grandTotalAllowancesUsd: Math.round(grandTotal * 100) / 100,
      allowanceBreakdown: breakdown,
    };
  }
}
