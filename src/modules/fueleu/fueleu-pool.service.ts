/**
 * @file fueleu-pool.service.ts
 * @description Domain service for FuelEU Maritime Article 21 Fleet Compliance Pooling and Penalty Neutralization.
 * Enforces multilateral GHG compliance balance aggregation across enrolled vessels, verification of net pool balance,
 * and atomic SQLite WAL transactional settlement offsetting statutory penalties to €0.00 in the ledger.
 * @module @atlas/api/modules/fueleu/pool-service
 * @see {@link docs/adr/0042-swift-iso20022-decarbonization-financial-clearing.md}
 */

import { db } from "../../db/index.js";
import * as schema from "../../db/schema/index.js";
import { eq, inArray } from "drizzle-orm";
import {
  FuelEuCalculatorService,
  FleetPoolVesselInput,
  FleetPoolResult,
} from "./fueleu-calculator.service.js";

export interface CreatePoolInput {
  poolCode: string;
  poolName: string;
  reportingYear: number;
  managingOperatorName: string;
  vesselIds: string[];
  remarks?: string;
}

export interface PoolSettlementResult {
  poolId: string;
  poolCode: string;
  reportingYear: number;
  isPoolCompliantZeroPenalty: boolean;
  consolidatedNetComplianceBalanceGco2eq: number;
  consolidatedNetComplianceBalanceTonnesCo2eq: number;
  totalVesselsCompensated: number;
  totalPenaltiesNeutralizedEur: number;
  status: "FINAL_SETTLED" | "DEFICIT_UNRESOLVED";
  reallocationNotes: string;
}

export class FuelEuPoolService {
  /**
   * Registers a new fleet compliance pool (Art. 21) in SQLite WAL.
   * Pulls compliance balances of participating vessels from fuel_eu_compliance_accounts,
   * calculates the aggregate net balance, and saves the pool entity.
   */
  public static async createPool(input: CreatePoolInput): Promise<{
    pool: typeof schema.fuelEuPools.$inferSelect;
    poolEvaluation: FleetPoolResult;
  }> {
    if (
      !input.poolCode ||
      !input.poolName ||
      !input.vesselIds ||
      input.vesselIds.length === 0
    ) {
      throw new Error(
        "Pool registration requires poolCode, poolName, and at least one vesselId",
      );
    }

    // 1. Fetch compliance accounts for the given vessels and reporting year
    const accounts = await db
      .select({
        id: schema.fuelEuComplianceAccounts.id,
        vesselId: schema.fuelEuComplianceAccounts.vesselId,
        reportingYear: schema.fuelEuComplianceAccounts.reportingYear,
        complianceBalanceGco2eq:
          schema.fuelEuComplianceAccounts.complianceBalanceGco2eq,
        complianceStatus: schema.fuelEuComplianceAccounts.complianceStatus,
      })
      .from(schema.fuelEuComplianceAccounts)
      .where(
        inArray(schema.fuelEuComplianceAccounts.vesselId, input.vesselIds),
      );

    const yearAccounts = accounts.filter(
      (acc) => acc.reportingYear === input.reportingYear,
    );

    // Also fetch vessels metadata for reporting clarity
    const vessels = await db
      .select({
        id: schema.marineVessels.id,
        vesselName: schema.marineVessels.vesselName,
      })
      .from(schema.marineVessels)
      .where(inArray(schema.marineVessels.id, input.vesselIds));

    const vesselMap = new Map(vessels.map((v) => [v.id, v.vesselName]));

    const poolVesselInputs: FleetPoolVesselInput[] = input.vesselIds.map(
      (vId) => {
        const acc = yearAccounts.find((a) => a.vesselId === vId);
        return {
          vesselId: vId,
          vesselName: vesselMap.get(vId) || vId,
          complianceBalanceGco2eq: acc ? acc.complianceBalanceGco2eq : 0,
        };
      },
    );

    // 2. Evaluate multilateral compliance balance
    const poolEval = FuelEuCalculatorService.evaluatePoolBalance(
      input.poolCode,
      poolVesselInputs,
    );

    const poolId = `pool_${input.poolCode.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    const nowIso = new Date().toISOString();

    // 3. Insert pool entity into SQLite WAL
    const newPoolRecord: typeof schema.fuelEuPools.$inferInsert = {
      id: poolId,
      poolCode: input.poolCode,
      poolName: input.poolName,
      reportingYear: input.reportingYear,
      managingOperatorName: input.managingOperatorName,
      totalEnrolledVesselsCount: input.vesselIds.length,
      consolidatedNetComplianceBalanceGco2eq:
        poolEval.consolidatedNetBalanceGco2eq,
      isPoolCompliantZeroPenalty: poolEval.isPoolCompliant,
      status: "REGISTERED_EMSA",
      remarks: input.remarks || poolEval.reallocationNotes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const [insertedPool] = await db
      .insert(schema.fuelEuPools)
      .values(newPoolRecord)
      .onConflictDoUpdate({
        target: schema.fuelEuPools.id,
        set: {
          poolName: newPoolRecord.poolName,
          totalEnrolledVesselsCount: newPoolRecord.totalEnrolledVesselsCount,
          consolidatedNetComplianceBalanceGco2eq:
            newPoolRecord.consolidatedNetComplianceBalanceGco2eq,
          isPoolCompliantZeroPenalty: newPoolRecord.isPoolCompliantZeroPenalty,
          remarks: newPoolRecord.remarks,
          updatedAt: nowIso,
        },
      })
      .returning();

    // Link poolId to compliance accounts
    if (yearAccounts.length > 0) {
      for (const acc of yearAccounts) {
        await db
          .update(schema.fuelEuComplianceAccounts)
          .set({
            poolId: insertedPool.id,
            updatedAt: nowIso,
          })
          .where(eq(schema.fuelEuComplianceAccounts.id, acc.id));
      }
    }

    return {
      pool: insertedPool,
      poolEvaluation: poolEval,
    };
  }

  /**
   * Executes atomic penalty neutralization for an Article 21 Pool in SQLite WAL.
   * If consolidated net balance >= 0:
   *  1. Transitions pool status to FINAL_SETTLED.
   *  2. Updates enrolled vessel compliance accounts to 'BALANCED_BY_POOL'.
   *  3. In fuel_eu_penalties_ledger, offsets penalties to net_payable_eur = 0.0 with payment_status = 'POOL_COMPENSATED'.
   */
  public static async settlePoolCompensation(
    poolId: string,
  ): Promise<PoolSettlementResult> {
    const [pool] = await db
      .select()
      .from(schema.fuelEuPools)
      .where(eq(schema.fuelEuPools.id, poolId));

    if (!pool) {
      throw new Error(`Pool not found: ${poolId}`);
    }

    const consolidatedNetBalanceGco2eq =
      pool.consolidatedNetComplianceBalanceGco2eq;
    const isCompliant = pool.isPoolCompliantZeroPenalty;

    if (!isCompliant || consolidatedNetBalanceGco2eq < 0) {
      return {
        poolId: pool.id,
        poolCode: pool.poolCode,
        reportingYear: pool.reportingYear,
        isPoolCompliantZeroPenalty: false,
        consolidatedNetComplianceBalanceGco2eq: consolidatedNetBalanceGco2eq,
        consolidatedNetComplianceBalanceTonnesCo2eq: Number(
          (consolidatedNetBalanceGco2eq / 1_000_000).toFixed(4),
        ),
        totalVesselsCompensated: 0,
        totalPenaltiesNeutralizedEur: 0,
        status: "DEFICIT_UNRESOLVED",
        reallocationNotes: `Cannot neutralize penalties: Pool has a net compliance deficit of ${Math.abs(
          consolidatedNetBalanceGco2eq / 1_000_000,
        ).toFixed(2)} t CO2eq.`,
      };
    }

    const nowIso = new Date().toISOString();
    let totalNeutralizedEur = 0;
    let vesselsCompensatedCount = 0;

    // Execute atomic SQLite WAL transaction
    await db.transaction(async (tx) => {
      // 1. Update pool status to FINAL_SETTLED
      await tx
        .update(schema.fuelEuPools)
        .set({
          status: "FINAL_SETTLED",
          updatedAt: nowIso,
        })
        .where(eq(schema.fuelEuPools.id, pool.id));

      // 2. Fetch associated compliance accounts
      const associatedAccounts = await tx
        .select()
        .from(schema.fuelEuComplianceAccounts)
        .where(eq(schema.fuelEuComplianceAccounts.poolId, pool.id));

      const deficitVesselIds: string[] = [];

      for (const acc of associatedAccounts) {
        if (acc.complianceBalanceGco2eq < 0) {
          deficitVesselIds.push(acc.vesselId);
          await tx
            .update(schema.fuelEuComplianceAccounts)
            .set({
              complianceStatus: "BALANCED_BY_POOL",
              calculatedFuelEuPenaltyEur: 0.0,
              updatedAt: nowIso,
            })
            .where(eq(schema.fuelEuComplianceAccounts.id, acc.id));
        }
      }

      vesselsCompensatedCount = deficitVesselIds.length;

      // 3. Neutralize penalties in the ledger
      if (deficitVesselIds.length > 0) {
        const penalties = await tx
          .select()
          .from(schema.fuelEuPenaltiesLedger)
          .where(
            inArray(schema.fuelEuPenaltiesLedger.vesselId, deficitVesselIds),
          );

        for (const penalty of penalties) {
          if (
            penalty.reportingYear === pool.reportingYear &&
            penalty.paymentStatus !== "PAID_TO_EU_FUND"
          ) {
            totalNeutralizedEur += penalty.totalPenaltyPayableEur;

            await tx
              .update(schema.fuelEuPenaltiesLedger)
              .set({
                poolOffsetId: pool.id,
                offsetAmountEur: penalty.totalPenaltyPayableEur,
                netPayableEur: 0.0,
                paymentStatus: "POOL_COMPENSATED",
                settledAt: nowIso,
              })
              .where(eq(schema.fuelEuPenaltiesLedger.id, penalty.id));
          }
        }
      }
    });

    return {
      poolId: pool.id,
      poolCode: pool.poolCode,
      reportingYear: pool.reportingYear,
      isPoolCompliantZeroPenalty: true,
      consolidatedNetComplianceBalanceGco2eq: consolidatedNetBalanceGco2eq,
      consolidatedNetComplianceBalanceTonnesCo2eq: Number(
        (consolidatedNetBalanceGco2eq / 1_000_000).toFixed(4),
      ),
      totalVesselsCompensated: vesselsCompensatedCount,
      totalPenaltiesNeutralizedEur: Number(totalNeutralizedEur.toFixed(2)),
      status: "FINAL_SETTLED",
      reallocationNotes: `El Pool ${pool.poolCode} ha completado la compensación multilateral (Art. 21). ${vesselsCompensatedCount} buques con déficit neutralizados y ${totalNeutralizedEur.toLocaleString("es-ES", { minimumFractionDigits: 2 })} € de penalización compensados a 0,00 €.`,
    };
  }
}
