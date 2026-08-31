/**
 * General Average Adjustment & Apportionment Service (York-Antwerp Rules 2016)
 * Deterministic final adjustment, rate of contribution calculation,
 * debtor/creditor balance sheet reconciliation, and cash deposit calculation.
 */

import { GaAllowanceSummary } from "./ga-allowance.service.js";
import {
  ContributoryValuesSummary,
  AssessedContributoryInterest,
} from "./contributory-value.service.js";

export interface AdjustedInterestResult {
  interestCategory:
    "VESSEL" | "FREIGHT_AT_RISK" | "CARGO" | "CONTAINERS_EQUIPMENT";
  blReference?: string;
  containerNumber?: string;
  ownerOrReceiverName: string;
  cargoDescription?: string;
  contributoryValueUsd: number;
  grossContributionUsd: number;
  madeGoodAllowanceUsd: number;
  netFinancialBalanceUsd: number; // grossContribution - madeGood
  balanceType: "PAYABLE_DEBTOR" | "RECEIVABLE_CREDITOR" | "BALANCED";
  recommendedCashDepositUsd: number; // CV * (Rate% + 10% safety margin)
}

export interface GeneralAverageAdjustmentResult {
  totalAllowancesUsd: number;
  totalContributoryValueUsd: number;
  rateOfContributionPercentage: number; // (TotalAllowances / TotalCV) * 100
  totalDebtorContributionsUsd: number;
  totalCreditorRecoveriesUsd: number;
  netAdjustmentDiscrepancyUsd: number; // Should be ~0.00
  interests: AdjustedInterestResult[];
  adjustmentCertificationStatement: string;
}

export class GeneralAverageAdjustmentService {
  /**
   * Computes the final general average adjustment, rate of contribution, and interest balance sheets.
   */
  public static calculateAdjustment(params: {
    allowanceSummary: GaAllowanceSummary;
    contributorySummary: ContributoryValuesSummary;
    caseReference?: string;
    vesselName?: string;
  }): GeneralAverageAdjustmentResult {
    const totalAllowances = params.allowanceSummary.grandTotalAllowancesUsd;
    const totalCv = params.contributorySummary.totalContributoryValueUsd;

    const rateOfContribution =
      totalCv > 0 ? (totalAllowances / totalCv) * 100 : 0;
    const roundedRatePercentage =
      Math.round(rateOfContribution * 10000) / 10000; // 4 decimals

    const adjustedInterests: AdjustedInterestResult[] = [];
    let totalDebtorAmount = 0;
    let totalCreditorAmount = 0;

    for (const interest of params.contributorySummary.interests) {
      const grossContribution =
        Math.round(
          ((interest.contributoryValueUsd * rateOfContribution) / 100) * 100,
        ) / 100;
      const madeGood = interest.madeGoodAllowanceUsd;
      const netBalance = Math.round((grossContribution - madeGood) * 100) / 100;

      let balanceType: "PAYABLE_DEBTOR" | "RECEIVABLE_CREDITOR" | "BALANCED" =
        "BALANCED";
      if (netBalance > 0.01) {
        balanceType = "PAYABLE_DEBTOR";
        totalDebtorAmount += netBalance;
      } else if (netBalance < -0.01) {
        balanceType = "RECEIVABLE_CREDITOR";
        totalCreditorAmount += Math.abs(netBalance);
      }

      // Cash Deposit recommendation with safety margin (rate% + 10% safety margin)
      const cashDepositRate = Math.min(100, rateOfContribution + 10.0);
      const recommendedCashDeposit =
        Math.round(
          ((interest.contributoryValueUsd * cashDepositRate) / 100) * 100,
        ) / 100;

      adjustedInterests.push({
        interestCategory: interest.interestCategory,
        blReference: interest.blReference,
        containerNumber: interest.containerNumber,
        ownerOrReceiverName: interest.ownerOrReceiverName,
        cargoDescription: interest.cargoDescription,
        contributoryValueUsd: interest.contributoryValueUsd,
        grossContributionUsd: grossContribution,
        madeGoodAllowanceUsd: madeGood,
        netFinancialBalanceUsd: netBalance,
        balanceType,
        recommendedCashDepositUsd: recommendedCashDeposit,
      });
    }

    const discrepancy =
      Math.round((totalDebtorAmount - totalCreditorAmount) * 100) / 100;

    const certStatement =
      `We hereby certify that this General Average Adjustment for ${params.vesselName || "the vessel"} ` +
      `(${params.caseReference || "GA Case"}) has been drawn up in strict accordance with the York-Antwerp Rules 2016. ` +
      `The final rate of contribution is ${roundedRatePercentage.toFixed(4)}% upon the total contributory value of $${totalCv.toLocaleString()} USD.`;

    return {
      totalAllowancesUsd: totalAllowances,
      totalContributoryValueUsd: totalCv,
      rateOfContributionPercentage: roundedRatePercentage,
      totalDebtorContributionsUsd: Math.round(totalDebtorAmount * 100) / 100,
      totalCreditorRecoveriesUsd: Math.round(totalCreditorAmount * 100) / 100,
      netAdjustmentDiscrepancyUsd: discrepancy,
      interests: adjustedInterests,
      adjustmentCertificationStatement: certStatement,
    };
  }
}
