/**
 * @file financial-netting-engine.test.ts
 * @description Comprehensive test suite for Bilateral Netting & IATA CASS Reconciliation Engine (T-63 / ADR 0040).
 */

import { describe, it, expect } from "vitest";
import {
  computeBilateralNetting,
  reconcileCassBilling,
  toScaledInt,
  fromScaledInt,
  roundToCents,
  type AgentTransaction,
  type ForwarderAwbRecord,
  type AirlineCassRecord,
} from "../src/scm/engines/financial-netting.engine.js";

describe("Financial Netting & IATA CASS Engine (T-63 / ADR 0040)", () => {
  describe("Precision Scaled Integer Math", () => {
    it("should convert floats to scaled micro-cents and back without drift", () => {
      const original = 1234.567;
      const scaled = toScaledInt(original);
      expect(scaled).toBe(1234567000);
      expect(fromScaledInt(scaled)).toBe(1234.57);
    });

    it("should round amounts to exact monetary cents", () => {
      expect(roundToCents(100.456)).toBe(100.46);
      expect(roundToCents(100.454)).toBe(100.45);
    });
  });

  describe("Autonomous Bilateral Netting", () => {
    it("should compute correct net settlement between two agents with multi-currency transactions", () => {
      const agentA = "AGENT-BCN";
      const agentB = "AGENT-FRA";

      const transactions: AgentTransaction[] = [
        // A owes B: 1,000 EUR @ 1.08 = 1,080 USD
        {
          id: "TX-01",
          reference: "INV-2026-001",
          debtorAgentId: agentA,
          creditorAgentId: agentB,
          type: "INVOICE",
          currency: "EUR",
          amount: 1000,
          exchangeRateToBase: 1.08,
          issueDate: "2026-11-01",
          dueDate: "2026-11-30",
        },
        // A owes B: 500 USD @ 1.00 = 500 USD
        {
          id: "TX-02",
          reference: "DN-2026-002",
          debtorAgentId: agentA,
          creditorAgentId: agentB,
          type: "DEBIT_NOTE",
          currency: "USD",
          amount: 500,
          exchangeRateToBase: 1.0,
          issueDate: "2026-11-05",
          dueDate: "2026-11-30",
        },
        // B owes A: 800 GBP @ 1.25 = 1,000 USD
        {
          id: "TX-03",
          reference: "INV-FRA-001",
          debtorAgentId: agentB,
          creditorAgentId: agentA,
          type: "INVOICE",
          currency: "GBP",
          amount: 800,
          exchangeRateToBase: 1.25,
          issueDate: "2026-11-10",
          dueDate: "2026-11-30",
        },
        // Unrelated third-party transaction (should be ignored)
        {
          id: "TX-99",
          reference: "INV-OTHER",
          debtorAgentId: agentA,
          creditorAgentId: "AGENT-NBO",
          type: "INVOICE",
          currency: "USD",
          amount: 9999,
          exchangeRateToBase: 1.0,
          issueDate: "2026-11-01",
          dueDate: "2026-11-30",
        },
      ];

      // AtoB = 1080 + 500 = 1580 USD
      // BtoA = 1000 USD
      // Net = 580 USD (Agent A pays Agent B)
      const advice = computeBilateralNetting(
        agentA,
        agentB,
        transactions,
        "USD",
      );

      expect(advice.grossVolumeAtoB).toBe(1580);
      expect(advice.grossVolumeBtoA).toBe(1000);
      expect(advice.netPayer).toBe(agentA);
      expect(advice.netReceiver).toBe(agentB);
      expect(advice.netSettlementAmount).toBe(580);
      expect(advice.reconciledTransactionsCount).toBe(3);
      expect(advice.transactionIds).toEqual(["TX-01", "TX-02", "TX-03"]);
    });

    it("should handle perfectly balanced netting with zero settlement transfer", () => {
      const agentA = "STATION-VLC";
      const agentB = "STATION-ROT";

      const transactions: AgentTransaction[] = [
        {
          id: "TX-1",
          reference: "REF-1",
          debtorAgentId: agentA,
          creditorAgentId: agentB,
          type: "INVOICE",
          currency: "EUR",
          amount: 500,
          exchangeRateToBase: 1.0,
          issueDate: "2026-11-01",
          dueDate: "2026-11-30",
        },
        {
          id: "TX-2",
          reference: "REF-2",
          debtorAgentId: agentB,
          creditorAgentId: agentA,
          type: "CREDIT_NOTE",
          currency: "EUR",
          amount: 500,
          exchangeRateToBase: 1.0,
          issueDate: "2026-11-02",
          dueDate: "2026-11-30",
        },
      ];

      const advice = computeBilateralNetting(
        agentA,
        agentB,
        transactions,
        "EUR",
      );
      expect(advice.netPayer).toBeNull();
      expect(advice.netReceiver).toBeNull();
      expect(advice.netSettlementAmount).toBe(0);
    });
  });

  describe("IATA CASS Airline Reconciliation", () => {
    const forwarderLedger: ForwarderAwbRecord[] = [
      // AWB 1: Exact Match
      {
        awbNumber: "074-12345675",
        chargeableWeightKg: 100,
        weightCharge: 500,
        fuelSurcharge: 80,
        securitySurcharge: 20,
        otherCharges: 10,
        totalAmount: 610,
        currency: "USD",
      },
      // AWB 2: Variance within acceptable tolerance ($2.00 diff)
      {
        awbNumber: "074-23456786",
        chargeableWeightKg: 200,
        weightCharge: 800,
        fuelSurcharge: 160,
        securitySurcharge: 40,
        otherCharges: 0,
        totalAmount: 1000,
        currency: "USD",
      },
      // AWB 3: Weight discrepancy beyond tolerance
      {
        awbNumber: "074-34567890",
        chargeableWeightKg: 150,
        weightCharge: 600,
        fuelSurcharge: 120,
        securitySurcharge: 30,
        otherCharges: 0,
        totalAmount: 750,
        currency: "USD",
      },
      // AWB 4: Unbilled in this CASS cycle
      {
        awbNumber: "074-45678901",
        chargeableWeightKg: 80,
        weightCharge: 320,
        fuelSurcharge: 64,
        securitySurcharge: 16,
        otherCharges: 0,
        totalAmount: 400,
        currency: "USD",
      },
    ];

    const airlineBilling: AirlineCassRecord[] = [
      // AWB 1: Matches forwarder exactly
      {
        cassInvoiceNumber: "CASS-INV-9901",
        awbNumber: "074-12345675",
        billedWeightKg: 100,
        billedWeightCharge: 500,
        billedFuelSurcharge: 80,
        billedSecuritySurcharge: 20,
        billedOtherCharges: 10,
        totalBilledAmount: 610,
        currency: "USD",
        billingPeriod: "2026-11-2",
      },
      // AWB 2: Billed 1002 USD (+$2.00 minor variance within $5 tolerance)
      {
        cassInvoiceNumber: "CASS-INV-9901",
        awbNumber: "074-23456786",
        billedWeightKg: 200,
        billedWeightCharge: 802,
        billedFuelSurcharge: 160,
        billedSecuritySurcharge: 40,
        billedOtherCharges: 0,
        totalBilledAmount: 1002,
        currency: "USD",
        billingPeriod: "2026-11-2",
      },
      // AWB 3: Billed 180kg instead of 150kg (+30kg -> 870 USD instead of 750 USD)
      {
        cassInvoiceNumber: "CASS-INV-9901",
        awbNumber: "074-34567890",
        billedWeightKg: 180,
        billedWeightCharge: 720,
        billedFuelSurcharge: 144,
        billedSecuritySurcharge: 36,
        billedOtherCharges: 0,
        totalBilledAmount: 900,
        currency: "USD",
        billingPeriod: "2026-11-2",
      },
      // AWB 5: Rogue/Orphan AWB billed by airline not in forwarder ledger
      {
        cassInvoiceNumber: "CASS-INV-9901",
        awbNumber: "074-99999999",
        billedWeightKg: 50,
        billedWeightCharge: 200,
        billedFuelSurcharge: 40,
        billedSecuritySurcharge: 10,
        billedOtherCharges: 0,
        totalBilledAmount: 250,
        currency: "USD",
        billingPeriod: "2026-11-2",
      },
    ];

    it("should categorize all AWBs into exact matches, tolerances, discrepancies, and unmatched records", () => {
      const summary = reconcileCassBilling(forwarderLedger, airlineBilling, {
        toleranceThreshold: 5.0,
      });

      expect(summary.exactMatchCount).toBe(1);
      expect(summary.toleranceMatchCount).toBe(1);
      expect(summary.discrepancyCount).toBe(1);
      expect(summary.unmatchedAirlineCount).toBe(1);
      expect(summary.unbilledForwarderCount).toBe(1);

      // Total forwarder = 610 + 1000 + 750 + 400 = 2760
      expect(summary.totalForwarderAmount).toBe(2760);
      // Total airline = 610 + 1002 + 900 + 250 = 2762
      expect(summary.totalAirlineAmount).toBe(2762);

      // Verify AWB 3 discrepancy details
      const awb3 = summary.items.find((i) => i.awbNumber === "074-34567890");
      expect(awb3).toBeDefined();
      expect(awb3?.status).toBe("DISCREPANCY_WEIGHT");
      expect(awb3?.weightVarianceKg).toBe(30);
      expect(awb3?.varianceAmount).toBe(150);
      expect(awb3?.disputeRequired).toBe(true);
      expect(awb3?.autoAccepted).toBe(false);

      // Verify orphan airline AWB
      const orphan = summary.items.find((i) => i.awbNumber === "074-99999999");
      expect(orphan).toBeDefined();
      expect(orphan?.status).toBe("UNMATCHED_AIRLINE_RECORD");
      expect(orphan?.disputeRequired).toBe(true);

      // Verify unbilled forwarder AWB
      const unbilled = summary.items.find(
        (i) => i.awbNumber === "074-45678901",
      );
      expect(unbilled).toBeDefined();
      expect(unbilled?.status).toBe("UNBILLED_FORWARDER_RECORD");
      expect(unbilled?.disputeRequired).toBe(false);
    });
  });
});
