/**
 * @file fueleu-flexibility.service.ts
 * @description Domain service for FuelEU Maritime Articles 20(1) & 20(2) Flexibility Mechanisms:
 * Surplus Banking to next reporting year and Deficit Borrowing with 1.10 statutory penalty surcharge.
 * Enforces atomic SQLite WAL transactions and automatic Year+1 rolling ledger synchronization.
 * @module @atlas/api/modules/fueleu/flexibility-service
 * @see {@link docs/adr/0042-swift-iso20022-decarbonization-financial-clearing.md}
 */

import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { FuelEuCalculatorService } from "./fueleu-calculator.service.js";

export interface BankingResult {
  vesselId: string;
  sourceYear: number;
  targetYear: number;
  bankedGco2eq: number;
  bankedTonnesCo2eq: number;
  sourceAccount: typeof schema.fuelEuComplianceAccounts.$inferSelect;
  targetAccount: typeof schema.fuelEuComplianceAccounts.$inferSelect;
  message: string;
}

export interface BorrowingResult {
  vesselId: string;
  sourceYear: number;
  targetYear: number;
  borrowedPrincipalGco2eq: number;
  borrowingSurchargePercent: number;
  totalNextYearObligationGco2eq: number;
  penaltyNeutralizedInCurrentYearEur: number;
  sourceAccount: typeof schema.fuelEuComplianceAccounts.$inferSelect;
  targetAccount: typeof schema.fuelEuComplianceAccounts.$inferSelect;
  message: string;
}

export class FuelEuFlexibilityService {
  /**
   * Article 20(1) — Surplus Banking
   * Rolls over surplus compliance balance (CB > 0) to reporting year + 1.
   */
  public static async bankSurplus(
    accountId: string,
    amountGco2eq?: number,
  ): Promise<BankingResult> {
    const [sourceAcc] = await db
      .select()
      .from(schema.fuelEuComplianceAccounts)
      .where(eq(schema.fuelEuComplianceAccounts.id, accountId));

    if (!sourceAcc) {
      throw new Error(`Compliance account not found: ${accountId}`);
    }

    if (sourceAcc.complianceBalanceGco2eq <= 0) {
      throw new Error(
        `Cannot bank surplus: Account has non-positive balance (${sourceAcc.complianceBalanceGco2eq} gCO2eq).`,
      );
    }

    const availableSurplus =
      sourceAcc.complianceBalanceGco2eq -
      sourceAcc.bankedSurplusTransferredNextYearGco2eq;

    if (availableSurplus <= 0) {
      throw new Error(
        "Available surplus has already been fully banked to subsequent years.",
      );
    }

    const toBankGco2eq = amountGco2eq
      ? Math.min(amountGco2eq, availableSurplus)
      : availableSurplus;

    const sourceYear = sourceAcc.reportingYear;
    const targetYear = sourceYear + 1;
    const nextYearTargetGhg =
      FuelEuCalculatorService.getTargetGhgIntensityForYear(targetYear);
    const nowIso = new Date().toISOString();

    let targetAccResult:
      typeof schema.fuelEuComplianceAccounts.$inferSelect | undefined;
    let updatedSourceAccResult:
      typeof schema.fuelEuComplianceAccounts.$inferSelect | undefined;

    await db.transaction(async (tx) => {
      // 1. Update source account
      const [updatedSource] = await tx
        .update(schema.fuelEuComplianceAccounts)
        .set({
          bankedSurplusTransferredNextYearGco2eq:
            sourceAcc.bankedSurplusTransferredNextYearGco2eq + toBankGco2eq,
          updatedAt: nowIso,
        })
        .where(eq(schema.fuelEuComplianceAccounts.id, sourceAcc.id))
        .returning();

      updatedSourceAccResult = updatedSource;

      // 2. Fetch or create Year+1 account
      const [existingTarget] = await tx
        .select()
        .from(schema.fuelEuComplianceAccounts)
        .where(
          and(
            eq(schema.fuelEuComplianceAccounts.vesselId, sourceAcc.vesselId),
            eq(schema.fuelEuComplianceAccounts.reportingYear, targetYear),
          ),
        );

      if (existingTarget) {
        const newBalance =
          existingTarget.complianceBalanceGco2eq + toBankGco2eq;
        const [updatedTarget] = await tx
          .update(schema.fuelEuComplianceAccounts)
          .set({
            complianceBalanceGco2eq: newBalance,
            complianceStatus: newBalance >= 0 ? "SURPLUS" : "DEFICIT",
            updatedAt: nowIso,
          })
          .where(eq(schema.fuelEuComplianceAccounts.id, existingTarget.id))
          .returning();

        targetAccResult = updatedTarget;
      } else {
        const targetAccountId = `acc_${sourceAcc.vesselId}_${targetYear}`;
        const [insertedTarget] = await tx
          .insert(schema.fuelEuComplianceAccounts)
          .values({
            id: targetAccountId,
            vesselId: sourceAcc.vesselId,
            reportingYear: targetYear,
            targetGhgIntensityGco2eqPerMj: nextYearTargetGhg,
            actualAttainedGhgIntensityGco2eqPerMj: 0.0,
            totalAnnualEnergyMj: 0.0,
            complianceBalanceGco2eq: toBankGco2eq,
            complianceStatus: "SURPLUS",
            calculatedFuelEuPenaltyEur: 0.0,
            bankedSurplusTransferredNextYearGco2eq: 0.0,
            borrowedDeficitFromNextYearGco2eq: 0.0,
            verifierAccreditationNumber: sourceAcc.verifierAccreditationNumber,
            createdAt: nowIso,
            updatedAt: nowIso,
          })
          .returning();

        targetAccResult = insertedTarget;
      }
    });

    const bankedTonnesCo2eq = Number((toBankGco2eq / 1_000_000).toFixed(4));

    return {
      vesselId: sourceAcc.vesselId,
      sourceYear,
      targetYear,
      bankedGco2eq: toBankGco2eq,
      bankedTonnesCo2eq,
      sourceAccount: updatedSourceAccResult!,
      targetAccount: targetAccResult!,
      message: `Banca de superávit ejecutada conforme al Art. 20(1). ${bankedTonnesCo2eq} t CO2eq transferidas del año ${sourceYear} al año ${targetYear}.`,
    };
  }

  /**
   * Article 20(2) — Deficit Borrowing
   * Borrows compliance deficit from reporting year + 1 with a 1.10 penalizing surcharge factor.
   * Neutralizes current year penalty in the ledger and logs opening liability in target year.
   */
  public static async borrowDeficit(
    accountId: string,
    amountGco2eq?: number,
  ): Promise<BorrowingResult> {
    const [sourceAcc] = await db
      .select()
      .from(schema.fuelEuComplianceAccounts)
      .where(eq(schema.fuelEuComplianceAccounts.id, accountId));

    if (!sourceAcc) {
      throw new Error(`Compliance account not found: ${accountId}`);
    }

    if (sourceAcc.complianceBalanceGco2eq >= 0) {
      throw new Error(
        `Cannot borrow deficit: Account has non-negative balance (${sourceAcc.complianceBalanceGco2eq} gCO2eq).`,
      );
    }

    const deficitGco2eq = Math.abs(sourceAcc.complianceBalanceGco2eq);
    const toBorrowPrincipalGco2eq = amountGco2eq
      ? Math.min(amountGco2eq, deficitGco2eq)
      : deficitGco2eq;

    const borrowingEval = FuelEuCalculatorService.evaluateBorrowing(
      toBorrowPrincipalGco2eq,
    );
    const totalNextYearObligationGco2eq =
      borrowingEval.totalNextYearObligationGco2eq; // Principal * 1.10

    const sourceYear = sourceAcc.reportingYear;
    const targetYear = sourceYear + 1;
    const nextYearTargetGhg =
      FuelEuCalculatorService.getTargetGhgIntensityForYear(targetYear);
    const nowIso = new Date().toISOString();

    let targetAccResult:
      typeof schema.fuelEuComplianceAccounts.$inferSelect | undefined;
    let updatedSourceAccResult:
      typeof schema.fuelEuComplianceAccounts.$inferSelect | undefined;
    let neutralizedPenaltyEur = 0;

    await db.transaction(async (tx) => {
      // 1. Update source account: neutralize penalty and record borrowed amount
      neutralizedPenaltyEur = sourceAcc.calculatedFuelEuPenaltyEur;

      const [updatedSource] = await tx
        .update(schema.fuelEuComplianceAccounts)
        .set({
          complianceStatus: "BALANCED_BY_POOL", // Statutorily balanced by borrowing
          calculatedFuelEuPenaltyEur: 0.0,
          borrowedDeficitFromNextYearGco2eq:
            sourceAcc.borrowedDeficitFromNextYearGco2eq +
            toBorrowPrincipalGco2eq,
          updatedAt: nowIso,
        })
        .where(eq(schema.fuelEuComplianceAccounts.id, sourceAcc.id))
        .returning();

      updatedSourceAccResult = updatedSource;

      // 2. Neutralize penalty ledger record if present
      const penalties = await tx
        .select()
        .from(schema.fuelEuPenaltiesLedger)
        .where(
          and(
            eq(schema.fuelEuPenaltiesLedger.vesselId, sourceAcc.vesselId),
            eq(schema.fuelEuPenaltiesLedger.reportingYear, sourceYear),
          ),
        );

      for (const p of penalties) {
        if (p.paymentStatus !== "PAID_TO_EU_FUND") {
          await tx
            .update(schema.fuelEuPenaltiesLedger)
            .set({
              offsetAmountEur: p.totalPenaltyPayableEur,
              netPayableEur: 0.0,
              paymentStatus: "POOL_COMPENSATED",
              settledAt: nowIso,
            })
            .where(eq(schema.fuelEuPenaltiesLedger.id, p.id));
        }
      }

      // 3. Fetch or create Year+1 account with debit obligation
      const [existingTarget] = await tx
        .select()
        .from(schema.fuelEuComplianceAccounts)
        .where(
          and(
            eq(schema.fuelEuComplianceAccounts.vesselId, sourceAcc.vesselId),
            eq(schema.fuelEuComplianceAccounts.reportingYear, targetYear),
          ),
        );

      if (existingTarget) {
        const newBalance =
          existingTarget.complianceBalanceGco2eq -
          totalNextYearObligationGco2eq;
        const [updatedTarget] = await tx
          .update(schema.fuelEuComplianceAccounts)
          .set({
            complianceBalanceGco2eq: newBalance,
            complianceStatus: newBalance >= 0 ? "SURPLUS" : "DEFICIT",
            updatedAt: nowIso,
          })
          .where(eq(schema.fuelEuComplianceAccounts.id, existingTarget.id))
          .returning();

        targetAccResult = updatedTarget;
      } else {
        const targetAccountId = `acc_${sourceAcc.vesselId}_${targetYear}`;
        const [insertedTarget] = await tx
          .insert(schema.fuelEuComplianceAccounts)
          .values({
            id: targetAccountId,
            vesselId: sourceAcc.vesselId,
            reportingYear: targetYear,
            targetGhgIntensityGco2eqPerMj: nextYearTargetGhg,
            actualAttainedGhgIntensityGco2eqPerMj: 0.0,
            totalAnnualEnergyMj: 0.0,
            complianceBalanceGco2eq: -totalNextYearObligationGco2eq,
            complianceStatus: "DEFICIT",
            calculatedFuelEuPenaltyEur: 0.0,
            bankedSurplusTransferredNextYearGco2eq: 0.0,
            borrowedDeficitFromNextYearGco2eq: 0.0,
            verifierAccreditationNumber: sourceAcc.verifierAccreditationNumber,
            createdAt: nowIso,
            updatedAt: nowIso,
          })
          .returning();

        targetAccResult = insertedTarget;
      }
    });

    return {
      vesselId: sourceAcc.vesselId,
      sourceYear,
      targetYear,
      borrowedPrincipalGco2eq: toBorrowPrincipalGco2eq,
      borrowingSurchargePercent: 10.0,
      totalNextYearObligationGco2eq,
      penaltyNeutralizedInCurrentYearEur: neutralizedPenaltyEur,
      sourceAccount: updatedSourceAccResult!,
      targetAccount: targetAccResult!,
      message: `Anticipo de déficit ejecutado conforme al Art. 20(2). Obligación de ${(totalNextYearObligationGco2eq / 1_000_000).toFixed(4)} t CO2eq cargada al año ${targetYear} (incluye 10% de recargo estatutario).`,
    };
  }
}
