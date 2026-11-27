/**
 * @file fueleu-pool-settlement.test.ts
 * @description Integration and unit tests for FuelEU Maritime Article 21 Fleet Compliance Pooling and Penalty Neutralization.
 * Verifies multilateral net compliance balance aggregation, pool creation in SQLite WAL, and atomic penalty compensation to €0.00.
 * @module @atlas/tests/fueleu-pool-settlement
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import app from "../src/app.js";
import { db } from "../src/db/index.js";
import * as schema from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

// Mock authentication
vi.mock("../src/middleware/auth.js", () => ({
  authMiddleware: vi.fn(async () => {}),
  requireRole: vi.fn(() => async () => {}),
}));

describe("FuelEU Maritime Article 21 — Fleet Compliance Pooling & Penalty Compensation", () => {
  const testYear = 2025;
  const surplusVesselId = "vessel_test_surplus_99";
  const deficitVesselId = "vessel_test_deficit_99";
  const poolCode = "POOL-2025-TEST-VERIFIED";

  let authToken: string;

  beforeEach(async () => {
    authToken = jwt.sign(
      {
        sub: "user-test-operator",
        email: "operator@atlas-maritime.eu",
        roles: ["ADMIN", "COMPLIANCE_OFFICER"],
      },
      process.env.JWT_SECRET || "atlas-dev-secret-key-32-chars-minimum-length!",
    );

    // Seed test vessels
    await db
      .insert(schema.marineVessels)
      .values([
        {
          id: surplusVesselId,
          imoNumber: "9999001",
          vesselName: "Atlas Green Pioneer (E-Methanol)",
          vesselType: "CONTAINER_SHIP",
          flagState: "PA",
          grossTonnageGt: 35000,
          deadweightTonnageDwt: 45000,
          mainEngineType: "DUAL_FUEL_METHANOL",
          operatingShippingLine: "Atlas Green Line",
          docHolderCompany: "Atlas Logistics DOC",
          classificationSociety: "DNV",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: deficitVesselId,
          imoNumber: "9999002",
          vesselName: "Atlas Conventional Carrier (VLSFO)",
          vesselType: "CONTAINER_SHIP",
          flagState: "LR",
          grossTonnageGt: 40000,
          deadweightTonnageDwt: 52000,
          mainEngineType: "TWO_STROKE_SLOW_SPEED_DIESEL",
          operatingShippingLine: "Atlas Conventional Line",
          docHolderCompany: "Atlas Logistics DOC",
          classificationSociety: "Bureau Veritas",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
      .onConflictDoNothing();

    // Clean up previous test entries for isolation
    await db
      .delete(schema.fuelEuPenaltiesLedger)
      .where(eq(schema.fuelEuPenaltiesLedger.vesselId, deficitVesselId));
    await db
      .delete(schema.fuelEuComplianceAccounts)
      .where(eq(schema.fuelEuComplianceAccounts.vesselId, surplusVesselId));
    await db
      .delete(schema.fuelEuComplianceAccounts)
      .where(eq(schema.fuelEuComplianceAccounts.vesselId, deficitVesselId));
    await db
      .delete(schema.fuelEuPools)
      .where(eq(schema.fuelEuPools.poolCode, poolCode));

    // Seed compliance accounts:
    // Surplus vessel: +15,000,000,000 gCO2eq (+15,000 tCO2eq surplus)
    // Deficit vessel: -5,000,000,000 gCO2eq (-5,000 tCO2eq deficit)
    // Consolidated net: +10,000,000,000 gCO2eq (COMPLIANT POOL)
    await db.insert(schema.fuelEuComplianceAccounts).values([
      {
        id: "acc_surplus_test",
        vesselId: surplusVesselId,
        reportingYear: testYear,
        targetGhgIntensityGco2eqPerMj: 89.34,
        actualAttainedGhgIntensityGco2eqPerMj: 25.0,
        totalAnnualEnergyMj: 233146409.7,
        complianceBalanceGco2eq: 15_000_000_000,
        complianceStatus: "SURPLUS",
        calculatedFuelEuPenaltyEur: 0.0,
        verifierAccreditationNumber: "VERIF-DNV-2025",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "acc_deficit_test",
        vesselId: deficitVesselId,
        reportingYear: testYear,
        targetGhgIntensityGco2eqPerMj: 89.34,
        actualAttainedGhgIntensityGco2eqPerMj: 91.16,
        totalAnnualEnergyMj: 2747252747.25,
        complianceBalanceGco2eq: -5_000_000_000,
        complianceStatus: "DEFICIT",
        calculatedFuelEuPenaltyEur: 321743.43,
        verifierAccreditationNumber: "VERIF-BV-2025",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    // Seed penalty in the ledger for deficit vessel
    await db.insert(schema.fuelEuPenaltiesLedger).values({
      id: "pen_test_deficit_99",
      settlementReference: "PEN-2025-TEST-99",
      vesselId: deficitVesselId,
      reportingYear: testYear,
      complianceDeficitGco2eq: 5_000_000_000,
      vlsfoEquivalentEnergyDeficitMj: 54848617.81,
      vlsfoEquivalentDeficitTonnes: 134.06,
      statutoryPenaltyRateEurPerTonne: 2400.0,
      penaltyMultiplierConsecutiveYears: 1.0,
      totalPenaltyPayableEur: 321743.43,
      offsetAmountEur: 0.0,
      netPayableEur: 321743.43,
      paymentStatus: "CALCULATED_PENDING",
      createdAt: new Date().toISOString(),
    });
  });

  it("POST /api/fueleu/pools creates and registers a compliant Article 21 fleet pool", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/fueleu/pools",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        poolCode,
        poolName: "Atlas Green Alliance Baltic Pool 2025",
        reportingYear: testYear,
        managingOperatorName: "Atlas Maritime Pooling AG",
        vesselIds: [surplusVesselId, deficitVesselId],
        remarks:
          "Multilateral compliance pool balancing green methanol surplus against conventional VLSFO",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.pool).toBeDefined();
    expect(body.pool.poolCode).toBe(poolCode);
    expect(body.pool.totalEnrolledVesselsCount).toBe(2);
    expect(body.pool.consolidatedNetComplianceBalanceGco2eq).toBe(
      10_000_000_000,
    );
    expect(body.pool.isPoolCompliantZeroPenalty).toBe(true);
    expect(body.pool.status).toBe("REGISTERED_EMSA");

    // Check poolId was linked in compliance accounts
    const [acc] = await db
      .select()
      .from(schema.fuelEuComplianceAccounts)
      .where(eq(schema.fuelEuComplianceAccounts.vesselId, deficitVesselId));
    expect(acc.poolId).toBe(body.pool.id);
  });

  it("POST /api/fueleu/pools/:id/settle executes atomic penalty neutralization to €0.00", async () => {
    // 1. Create pool
    const createRes = await app.inject({
      method: "POST",
      url: "/api/fueleu/pools",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        poolCode,
        poolName: "Atlas Green Alliance Baltic Pool 2025",
        reportingYear: testYear,
        managingOperatorName: "Atlas Maritime Pooling AG",
        vesselIds: [surplusVesselId, deficitVesselId],
      },
    });

    const poolId = JSON.parse(createRes.payload).pool.id;

    // 2. Execute settlement
    const settleRes = await app.inject({
      method: "POST",
      url: `/api/fueleu/pools/${poolId}/settle`,
      headers: {
        authorization: `Bearer ${authToken}`,
      },
    });

    expect(settleRes.statusCode, settleRes.payload).toBe(200);
    const settleBody = JSON.parse(settleRes.payload);
    expect(settleBody.success).toBe(true);
    expect(settleBody.settlement.status).toBe("FINAL_SETTLED");
    expect(settleBody.settlement.isPoolCompliantZeroPenalty).toBe(true);
    expect(settleBody.settlement.totalVesselsCompensated).toBe(1);
    expect(settleBody.settlement.totalPenaltiesNeutralizedEur).toBe(321743.43);

    // 3. Verify database state in SQLite WAL
    // Check pool status
    const [settledPool] = await db
      .select()
      .from(schema.fuelEuPools)
      .where(eq(schema.fuelEuPools.id, poolId));
    expect(settledPool.status).toBe("FINAL_SETTLED");

    // Check compliance account for deficit vessel
    const [updatedAcc] = await db
      .select()
      .from(schema.fuelEuComplianceAccounts)
      .where(eq(schema.fuelEuComplianceAccounts.vesselId, deficitVesselId));
    expect(updatedAcc.complianceStatus).toBe("BALANCED_BY_POOL");
    expect(updatedAcc.calculatedFuelEuPenaltyEur).toBe(0.0);

    // Check penalty ledger for deficit vessel
    const [updatedPenalty] = await db
      .select()
      .from(schema.fuelEuPenaltiesLedger)
      .where(eq(schema.fuelEuPenaltiesLedger.vesselId, deficitVesselId));
    expect(updatedPenalty.paymentStatus).toBe("POOL_COMPENSATED");
    expect(updatedPenalty.poolOffsetId).toBe(poolId);
    expect(updatedPenalty.offsetAmountEur).toBe(321743.43);
    expect(updatedPenalty.netPayableEur).toBe(0.0);
  });
});
