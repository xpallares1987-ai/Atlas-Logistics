/**
 * @file fueleu-flexibility.test.ts
 * @description Integration and unit tests for FuelEU Maritime Articles 20(1) & 20(2) Flexibility Mechanisms:
 * Surplus Banking to reporting year + 1 and Deficit Borrowing with 1.10 statutory penalty surcharge.
 * @module @atlas/tests/fueleu-flexibility
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import app from "../src/app.js";
import { db } from "../src/db/index.js";
import * as schema from "../src/db/schema/index.js";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";

// Mock authentication
vi.mock("../src/middleware/auth.js", () => ({
  authMiddleware: vi.fn(async () => {}),
  requireRole: vi.fn(() => async () => {}),
}));

describe("FuelEU Maritime Articles 20(1) & 20(2) — Flexibility (Banking & Borrowing)", () => {
  const baseYear = 2025;
  const targetYear = 2026;
  const bankingVesselId = "vessel_test_bank_01";
  const borrowingVesselId = "vessel_test_borrow_01";

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
          id: bankingVesselId,
          imoNumber: "9988001",
          vesselName: "Atlas Bio Trader",
          vesselType: "CONTAINER_SHIP",
          flagState: "PA",
          grossTonnageGt: 28000,
          deadweightTonnageDwt: 36000,
          mainEngineType: "DUAL_FUEL_METHANOL",
          operatingShippingLine: "Atlas Line",
          docHolderCompany: "Atlas Logistics DOC",
          classificationSociety: "DNV",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: borrowingVesselId,
          imoNumber: "9988002",
          vesselName: "Atlas North Star",
          vesselType: "CONTAINER_SHIP",
          flagState: "LR",
          grossTonnageGt: 32000,
          deadweightTonnageDwt: 42000,
          mainEngineType: "TWO_STROKE_SLOW_SPEED_DIESEL",
          operatingShippingLine: "Atlas Line",
          docHolderCompany: "Atlas Logistics DOC",
          classificationSociety: "Bureau Veritas",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
      .onConflictDoNothing();

    // Clean up existing accounts for isolation
    await db
      .delete(schema.fuelEuComplianceAccounts)
      .where(eq(schema.fuelEuComplianceAccounts.vesselId, bankingVesselId));
    await db
      .delete(schema.fuelEuComplianceAccounts)
      .where(eq(schema.fuelEuComplianceAccounts.vesselId, borrowingVesselId));
    await db
      .delete(schema.fuelEuPenaltiesLedger)
      .where(eq(schema.fuelEuPenaltiesLedger.vesselId, borrowingVesselId));

    // Seed surplus account (+8,000,000,000 gCO2eq = +8,000 tCO2eq)
    await db.insert(schema.fuelEuComplianceAccounts).values({
      id: "acc_bank_test_2025",
      vesselId: bankingVesselId,
      reportingYear: baseYear,
      targetGhgIntensityGco2eqPerMj: 89.34,
      actualAttainedGhgIntensityGco2eqPerMj: 35.0,
      totalAnnualEnergyMj: 147220100.0,
      complianceBalanceGco2eq: 8_000_000_000,
      complianceStatus: "SURPLUS",
      calculatedFuelEuPenaltyEur: 0.0,
      verifierAccreditationNumber: "VERIF-DNV-2025",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed deficit account (-4,000,000,000 gCO2eq = -4,000 tCO2eq) with €257,394.74 penalty
    await db.insert(schema.fuelEuComplianceAccounts).values({
      id: "acc_borrow_test_2025",
      vesselId: borrowingVesselId,
      reportingYear: baseYear,
      targetGhgIntensityGco2eqPerMj: 89.34,
      actualAttainedGhgIntensityGco2eqPerMj: 91.16,
      totalAnnualEnergyMj: 2197802197.8,
      complianceBalanceGco2eq: -4_000_000_000,
      complianceStatus: "DEFICIT",
      calculatedFuelEuPenaltyEur: 257394.74,
      verifierAccreditationNumber: "VERIF-BV-2025",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed penalty record in ledger for deficit vessel
    await db.insert(schema.fuelEuPenaltiesLedger).values({
      id: "pen_test_borrow_01",
      settlementReference: "PEN-2025-BORROW-01",
      vesselId: borrowingVesselId,
      reportingYear: baseYear,
      complianceDeficitGco2eq: 4_000_000_000,
      vlsfoEquivalentEnergyDeficitMj: 43878894.25,
      vlsfoEquivalentDeficitTonnes: 107.25,
      statutoryPenaltyRateEurPerTonne: 2400.0,
      penaltyMultiplierConsecutiveYears: 1.0,
      totalPenaltyPayableEur: 257394.74,
      offsetAmountEur: 0.0,
      netPayableEur: 257394.74,
      paymentStatus: "CALCULATED_PENDING",
      createdAt: new Date().toISOString(),
    });
  });

  it("POST /api/fueleu/compliance/:id/bank executes Article 20(1) surplus rollover into Year+1", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/fueleu/compliance/acc_bank_test_2025/bank",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        amountGco2eq: 5_000_000_000, // Bank 5,000 tCO2eq out of 8,000 tCO2eq
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.bankedGco2eq).toBe(5_000_000_000);
    expect(body.bankedTonnesCo2eq).toBe(5000);
    expect(body.sourceAccount.bankedSurplusTransferredNextYearGco2eq).toBe(
      5_000_000_000,
    );

    // Verify Year+1 account created in SQLite WAL
    const [targetAcc] = await db
      .select()
      .from(schema.fuelEuComplianceAccounts)
      .where(
        and(
          eq(schema.fuelEuComplianceAccounts.vesselId, bankingVesselId),
          eq(schema.fuelEuComplianceAccounts.reportingYear, targetYear),
        ),
      );

    expect(targetAcc).toBeDefined();
    expect(targetAcc.complianceBalanceGco2eq).toBe(5_000_000_000);
    expect(targetAcc.complianceStatus).toBe("SURPLUS");
  }, 15000);

  it("POST /api/fueleu/compliance/:id/borrow executes Article 20(2) deficit borrowing with 10% surcharge and neutralizes penalty", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/fueleu/compliance/acc_borrow_test_2025/borrow",
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        amountGco2eq: 4_000_000_000, // Borrow entire 4,000 tCO2eq deficit
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.borrowedPrincipalGco2eq).toBe(4_000_000_000);
    expect(body.borrowingSurchargePercent).toBe(10);
    expect(body.totalNextYearObligationGco2eq).toBe(4_400_000_000); // 4,000 * 1.10 = 4,400 tCO2eq
    expect(body.penaltyNeutralizedInCurrentYearEur).toBe(257394.74);

    // Verify current year account state
    const [sourceAcc] = await db
      .select()
      .from(schema.fuelEuComplianceAccounts)
      .where(eq(schema.fuelEuComplianceAccounts.id, "acc_borrow_test_2025"));

    expect(sourceAcc.complianceStatus).toBe("BALANCED_BY_POOL");
    expect(sourceAcc.calculatedFuelEuPenaltyEur).toBe(0.0);
    expect(sourceAcc.borrowedDeficitFromNextYearGco2eq).toBe(4_000_000_000);

    // Verify penalty record in ledger was compensated to €0.00
    const [penalty] = await db
      .select()
      .from(schema.fuelEuPenaltiesLedger)
      .where(eq(schema.fuelEuPenaltiesLedger.id, "pen_test_borrow_01"));

    expect(penalty.paymentStatus).toBe("POOL_COMPENSATED");
    expect(penalty.netPayableEur).toBe(0.0);
    expect(penalty.offsetAmountEur).toBe(257394.74);

    // Verify target year account carries debit of 4,400,000,000 gCO2eq
    const [targetAcc] = await db
      .select()
      .from(schema.fuelEuComplianceAccounts)
      .where(
        and(
          eq(schema.fuelEuComplianceAccounts.vesselId, borrowingVesselId),
          eq(schema.fuelEuComplianceAccounts.reportingYear, targetYear),
        ),
      );

    expect(targetAcc).toBeDefined();
    expect(targetAcc.complianceBalanceGco2eq).toBe(-4_400_000_000);
    expect(targetAcc.complianceStatus).toBe("DEFICIT");
  }, 15000);
});
