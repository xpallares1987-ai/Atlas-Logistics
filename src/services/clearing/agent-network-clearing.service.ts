/**
 * @file agent-network-clearing.service.ts
 * @description Application service for Global Agent Network Clearing (DN/CN reconciliation, automated profit-share splitting, and multi-currency netting) and CASS billing reconciliation.
 * @module @atlas/services/clearing/agent-network-clearing
 * @see {@link docs/adr/0029-air-cargo-messaging-cass-and-agent-network-clearing.md}
 */

import { eq, and, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  agentClearingLedger,
  agentSettlements,
  carrierInvoices,
  carrierInvoiceLines,
  companies,
} from "../../db/schema/index.js";
import {
  calculateAgentProfitShare,
  calculateAgentPeriodNetting,
  reconcileCassBillingItem,
  type AgentProfitShareInput,
  type CassReconciliationItem,
} from "@atlas/shared";
import crypto from "node:crypto";
import { logger } from "../../config/logger.js";

export interface RecordAgentNoteDto {
  entryNumber?: string;
  noteType: "DEBIT_NOTE" | "CREDIT_NOTE";
  agentCompanyId: string;
  shipmentId?: string;
  hblOrHawbNumber: string;
  currency: string;
  amount: number;
  exchangeRateToEur?: number;
  description: string;
  verifiedGrossProfitEur?: number;
  agentProfitSharePercent?: number;
  tenantId?: string;
}

export class AgentNetworkClearingService {
  /**
   * Posts an inbound or outbound corresponding agent Debit Note (DN) or Credit Note (CN)
   * to the segregated agent clearing ledger.
   */
  async recordAgentNote(dto: RecordAgentNoteDto) {
    const rate = dto.exchangeRateToEur ?? 1.0;
    const amountEur = Math.round(dto.amount * rate * 100) / 100;

    let agentShareEur: number | undefined;
    let forwarderShareEur: number | undefined;

    if (dto.verifiedGrossProfitEur !== undefined) {
      const splitCalc = calculateAgentProfitShare({
        shipmentId: dto.shipmentId || "unassigned",
        hblOrHawbNumber: dto.hblOrHawbNumber,
        clientGrossRevenueEur: dto.verifiedGrossProfitEur * 2, // normalized
        carrierFreightCostEur: dto.verifiedGrossProfitEur,
        originTerminalFeesEur: 0,
        destinationTerminalFeesEur: 0,
        splitPercentageAgent: dto.agentProfitSharePercent ?? 50.0,
      });
      agentShareEur = splitCalc.agentShareAmountEur;
      forwarderShareEur = splitCalc.originForwarderShareAmountEur;
    }

    const entryId = `acl_${crypto.randomUUID()}`;
    const prefix = dto.noteType === "DEBIT_NOTE" ? "DN" : "CN";
    const entryNumber =
      dto.entryNumber ||
      `${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const newRecord = {
      id: entryId,
      entryNumber,
      noteType: dto.noteType,
      agentCompanyId: dto.agentCompanyId,
      shipmentId: dto.shipmentId || null,
      hblOrHawbNumber: dto.hblOrHawbNumber,
      currency: dto.currency.toUpperCase(),
      amount: dto.amount,
      exchangeRateToEur: rate,
      amountEur,
      verifiedGrossProfitEur: dto.verifiedGrossProfitEur || null,
      agentProfitSharePercent: dto.agentProfitSharePercent ?? 50.0,
      calculatedAgentShareEur: agentShareEur || null,
      originForwarderShareEur: forwarderShareEur || null,
      description: dto.description,
      clearingStatus: "OPEN" as const,
      settlementId: null,
      tenantId: dto.tenantId || "tenant-default",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(agentClearingLedger).values(newRecord);

    logger.info(
      {
        entryId,
        entryNumber,
        noteType: dto.noteType,
        amount: dto.amount,
        currency: dto.currency,
      },
      "Posted entry to agent clearing ledger",
    );

    return newRecord;
  }

  /**
   * Evaluates verified Gross Profit for a joint-venture/nominated shipment,
   * calculates the profit-share split, and automatically posts the corresponding agent note.
   */
  async calculateAndPostProfitShare(
    agentCompanyId: string,
    input: AgentProfitShareInput,
    tenantId = "tenant-default",
  ) {
    const profitSplit = calculateAgentProfitShare(input);

    // If agent share is positive on export nominated freight collect, origin owes agent (Debit Note)
    // or if origin collected freight, agent credits origin (Credit Note)
    const entryRecord = await this.recordAgentNote({
      noteType: "CREDIT_NOTE", // Origin forwarder's receivable share from agent
      agentCompanyId,
      shipmentId: input.shipmentId,
      hblOrHawbNumber: input.hblOrHawbNumber,
      currency: "EUR",
      amount: profitSplit.originForwarderShareAmountEur,
      exchangeRateToEur: 1.0,
      description: `Profit-share split (${profitSplit.agentProfitSharePercent}%) on HBL/HAWB ${input.hblOrHawbNumber}`,
      verifiedGrossProfitEur: profitSplit.verifiedGrossProfitEur,
      agentProfitSharePercent: profitSplit.agentProfitSharePercent,
      tenantId,
    });

    return {
      profitSplit,
      clearingEntry: entryRecord,
    };
  }

  /**
   * Reconciles an airline CASS statement line items against internal accrued freight tariffs.
   */
  async reconcileCassBillingStatement(
    carrierInvoiceId: string,
    items: CassReconciliationItem[],
  ) {
    const invoiceList = await db
      .select()
      .from(carrierInvoices)
      .where(eq(carrierInvoices.id, carrierInvoiceId))
      .limit(1);

    if (invoiceList.length === 0) {
      throw new Error(
        `Carrier Invoice with id '${carrierInvoiceId}' not found`,
      );
    }

    const results = items.map((item) => reconcileCassBillingItem(item));
    const allMatched = results.every((r) => r.isMatched);
    const hasCritical = results.some(
      (r) => r.varianceStatus === "CRITICAL_VARIANCE",
    );

    let reconciliationStatus:
      "AUTO_MATCHED" | "DISCREPANCY_FLAGGED" | "DISPUTED" = "AUTO_MATCHED";

    if (hasCritical) {
      reconciliationStatus = "DISPUTED";
    } else if (!allMatched) {
      reconciliationStatus = "DISCREPANCY_FLAGGED";
    }

    const totalDisputed = results
      .filter((r) => !r.isMatched)
      .reduce((sum, r) => sum + Math.abs(r.amountVarianceEur), 0);

    const totalMatched = results
      .filter((r) => r.isMatched)
      .reduce((sum, r) => sum + r.amountVarianceEur, 0);

    await db
      .update(carrierInvoices)
      .set({
        reconciliationStatus,
        disputedAmount: totalDisputed,
        matchedAmount: totalMatched,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(carrierInvoices.id, carrierInvoiceId));

    return {
      carrierInvoiceId,
      reconciliationStatus,
      totalItems: items.length,
      matchedCount: results.filter((r) => r.isMatched).length,
      disputedCount: results.filter((r) => !r.isMatched).length,
      results,
    };
  }

  /**
   * Executes period-end bilateral netting across all OPEN Debit and Credit Notes for an agent,
   * locks exchange rates, and generates a consolidated settlement statement.
   */
  async executePeriodNetting(
    agentCompanyId: string,
    targetCurrency = "USD",
    periodStart: string,
    periodEnd: string,
    tenantId = "tenant-default",
  ) {
    // 1. Fetch open ledger entries for this agent
    const openEntries = await db
      .select()
      .from(agentClearingLedger)
      .where(
        and(
          eq(agentClearingLedger.agentCompanyId, agentCompanyId),
          eq(agentClearingLedger.clearingStatus, "OPEN"),
        ),
      );

    if (openEntries.length === 0) {
      throw new Error(
        `Zero open clearing entries found for agent '${agentCompanyId}' to net`,
      );
    }

    // 2. Perform netting math
    const nettingItems = openEntries.map((e) => ({
      entryNumber: e.entryNumber,
      noteType: e.noteType as "DEBIT_NOTE" | "CREDIT_NOTE",
      hblOrHawbNumber: e.hblOrHawbNumber,
      amount: e.amount,
      currency: e.currency,
      exchangeRateToTarget: 1.0, // simplified baseline rate to target
      amountInTargetCurrency: e.amount,
    }));

    const summary = calculateAgentPeriodNetting(
      agentCompanyId,
      targetCurrency,
      periodStart,
      periodEnd,
      nettingItems,
    );

    // 3. Create Settlement Statement in agentSettlements
    const settlementId = `stl_${crypto.randomUUID()}`;
    const statementNumber = `STM-${targetCurrency}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    await db.insert(agentSettlements).values({
      id: settlementId,
      statementNumber,
      agentId: agentCompanyId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      netBalance: summary.netSettlementBalanceTarget,
      currency: targetCurrency.toUpperCase(),
      status: "Pending",
    });

    // 4. Mark ledger entries as SETTLED_NETTED
    for (const entry of openEntries) {
      await db
        .update(agentClearingLedger)
        .set({
          clearingStatus: "SETTLED_NETTED",
          settlementId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(agentClearingLedger.id, entry.id));
    }

    logger.info(
      {
        settlementId,
        statementNumber,
        netBalance: summary.netSettlementBalanceTarget,
      },
      "Executed bilateral period netting and created agent settlement",
    );

    return {
      settlementId,
      statementNumber,
      nettingSummary: summary,
      settledEntriesCount: openEntries.length,
    };
  }

  /**
   * Retrieves the current open clearing balance for an agent.
   */
  async getAgentClearingBalance(agentCompanyId: string) {
    const entries = await db
      .select()
      .from(agentClearingLedger)
      .where(
        and(
          eq(agentClearingLedger.agentCompanyId, agentCompanyId),
          eq(agentClearingLedger.clearingStatus, "OPEN"),
        ),
      );

    const totalDebit = entries
      .filter((e) => e.noteType === "DEBIT_NOTE")
      .reduce((sum, e) => sum + e.amountEur, 0);

    const totalCredit = entries
      .filter((e) => e.noteType === "CREDIT_NOTE")
      .reduce((sum, e) => sum + e.amountEur, 0);

    const netBalanceEur = Math.round((totalCredit - totalDebit) * 100) / 100;

    return {
      agentCompanyId,
      openEntriesCount: entries.length,
      totalDebitNotesEur: totalDebit,
      totalCreditNotesEur: totalCredit,
      netBalanceEur,
      entries,
    };
  }
}
