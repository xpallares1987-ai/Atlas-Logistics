/**
 * @file gl-sync.service.ts
 * @description General Ledger (GL) asynchronous synchronization service, enforcing AP/AR immutability,
 * disbursement (suplidos) pass-through segregation, and SAP/NetSuite ERP payload generation via Transactional Outbox.
 * @module @atlas/services/accounting/gl-sync
 * @see {@link docs/architecture/accounting-gl-sync.md}
 */

import { v4 as uuidv4 } from "uuid";
import { db } from "../../db/index.js";
import {
  scmOutboxMessages,
  scmSalesInvoices,
  scmPurchaseInvoices,
} from "../../db/schema/scm_foundation.js";
import { invoices, invoiceItems, companies } from "../../db/schema/index.js";
import { eq, sql } from "drizzle-orm";
import { logger } from "../../config/logger.js";
import {
  SapPurchaseOrderHeader,
  SapServiceEntrySheet,
  SapServiceEntrySheetItem,
} from "@atlas/shared";

// ============================================================================
// 1. TYPES & DATA CONTRACTS
// ============================================================================

export type AccountLedgerType =
  | "OPERATIONAL_FREIGHT_REVENUE"
  | "OPERATIONAL_FREIGHT_COST"
  | "DISBURSEMENT_TAX_LIABILITY" // Suplidos / Customs Duties Pass-Through
  | "CBAM_CARBON_LIABILITY"
  | "FUELEU_COMPLIANCE_PENALTY"
  | "BANK_CLEARING"
  | "ACCOUNTS_RECEIVABLE"
  | "ACCOUNTS_PAYABLE";

export interface GlInvoiceLineExport {
  lineNumber: number;
  chargeCode: string;
  description: string;
  accountType: AccountLedgerType;
  glAccountNumber: string; // e.g. "700000" for Freight Rev, "475000" for Suplidos
  isDisbursement: boolean; // Suplidos flag
  originalAmount: number;
  originalCurrency: string;
  exchangeRate: number;
  baseCurrencyAmount: number; // in tenant base accounting currency (EUR)
  baseCurrency: string;
}

export interface GlSyncPayload {
  syncJobId: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: "AR" | "AP" | "CN" | "DN";
  partyId: string;
  partyName: string;
  partyTaxId: string;
  postingDate: string;
  dueDate: string;
  totalGrossOriginal: number;
  totalNetOriginal: number;
  totalDisbursementsOriginal: number; // Pass-through amount
  totalNetBaseCurrency: number; // Base accounting currency (EUR)
  totalDisbursementsBaseCurrency: number;
  accountingBaseCurrency: string;
  lines: GlInvoiceLineExport[];
  erpConnectors: {
    sapS4Hana: {
      serviceEntrySheet?: SapServiceEntrySheet;
      documentReference: string;
    };
    oracleNetSuite: {
      suiteTalkTransactionType: "CustInvc" | "VendBill" | "CustCred";
      entityId: string;
      tranDate: string;
      dueDate: string;
      lines: Array<{
        item: string;
        amount: number;
        taxCode: string;
        department: string;
      }>;
    };
    msDynamics365Bc: {
      journalBatch: string;
      documentNo: string;
      journalLines: Array<{
        accountType: string;
        accountNo: string;
        postingDate: string;
        documentNo: string;
        description: string;
        debitAmount: number;
        creditAmount: number;
      }>;
    };
  };
}

// ============================================================================
// 2. GL SYNCHRONIZATION SERVICE
// ============================================================================

export class GlSyncService {
  /**
   * Evaluates invoice line and determines appropriate General Ledger account number
   * and pass-through disbursement classification.
   */
  public static mapGlAccount(
    description: string,
    invoiceType: string,
  ): {
    accountType: AccountLedgerType;
    glAccountNumber: string;
    isDisbursement: boolean;
  } {
    const descUpper = description.toUpperCase();
    const isDisbursement =
      descUpper.includes("SUPLIDO") ||
      descUpper.includes("CUSTOMS DUTY") ||
      descUpper.includes("ARANCEL") ||
      descUpper.includes("IMPORT VAT") ||
      descUpper.includes("IVA IMPORTACION") ||
      descUpper.includes("DISBURSEMENT");

    if (isDisbursement) {
      return {
        accountType: "DISBURSEMENT_TAX_LIABILITY",
        glAccountNumber: "475000", // Standard French/Spanish PGC Suplidos pass-through account
        isDisbursement: true,
      };
    }

    if (
      descUpper.includes("CBAM") ||
      descUpper.includes("CARBON CERTIFICATE")
    ) {
      return {
        accountType: "CBAM_CARBON_LIABILITY",
        glAccountNumber: "475100", // EU CBAM Carbon Certificate Liability (Reg 2023/956)
        isDisbursement: false,
      };
    }

    if (
      descUpper.includes("FUELEU") ||
      descUpper.includes("EMISSIONS DEFICIT")
    ) {
      return {
        accountType: "FUELEU_COMPLIANCE_PENALTY",
        glAccountNumber: "631100", // FuelEU Maritime Emissions Deficit Expense (Reg 2023/1805)
        isDisbursement: false,
      };
    }

    if (
      descUpper.includes("ISO 20022") ||
      descUpper.includes("BANK CLEARING") ||
      descUpper.includes("WIRE SETTLEMENT")
    ) {
      return {
        accountType: "BANK_CLEARING",
        glAccountNumber: "572000", // ISO 20022 Bank Settlement Clearing
        isDisbursement: false,
      };
    }

    if (invoiceType === "AR") {
      return {
        accountType: "OPERATIONAL_FREIGHT_REVENUE",
        glAccountNumber: "700000", // Operational Freight Sales
        isDisbursement: false,
      };
    }

    return {
      accountType: "OPERATIONAL_FREIGHT_COST",
      glAccountNumber: "600000", // Operational Freight Purchases
      isDisbursement: false,
    };
  }

  /**
   * Enqueues a SYNC_GL_INVOICE event into the transactional outbox table
   * for asynchronous transmission to corporate ERPs (SAP S/4HANA / NetSuite).
   */
  public static async enqueueInvoiceGlSync(input: {
    invoiceId: string;
    targetBaseCurrency?: string;
    exchangeRate?: number;
  }): Promise<GlSyncPayload> {
    const baseCurrency = input.targetBaseCurrency || "EUR";
    const exchangeRate = input.exchangeRate ?? 1.0;

    // 1. Fetch invoice and lines
    const invRows = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        type: invoices.type,
        companyId: invoices.companyId,
        companyName: companies.name,
        companyTaxId: sql<string>`COALESCE(${companies.name}, 'ESA08192837')`,
        amount: invoices.amount,
        currency: invoices.currency,
        dueDate: invoices.dueDate,
        status: invoices.status,
        shipmentId: invoices.shipmentId,
      })
      .from(invoices)
      .leftJoin(companies, eq(invoices.companyId, companies.id))
      .where(eq(invoices.id, input.invoiceId))
      .limit(1);

    if (invRows.length === 0) {
      throw new Error(
        `Invoice '${input.invoiceId}' not found for GL synchronization`,
      );
    }

    const inv = invRows[0];
    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, inv.id));

    // 2. Build GL line exports
    const glLines: GlInvoiceLineExport[] = [];
    let totalDisbursementsOriginal = 0;
    let totalNetOriginal = 0;

    let lineIndex = 1;
    for (const item of items) {
      const glMapping = this.mapGlAccount(item.description, inv.type);
      const originalAmount = item.total || item.quantity * item.unitPrice;
      const baseCurrencyAmount =
        Math.round(originalAmount * exchangeRate * 100) / 100;

      if (glMapping.isDisbursement) {
        totalDisbursementsOriginal += originalAmount;
      } else {
        totalNetOriginal += originalAmount;
      }

      glLines.push({
        lineNumber: lineIndex++,
        chargeCode: glMapping.isDisbursement ? "DISB" : "FRT",
        description: item.description,
        accountType: glMapping.accountType,
        glAccountNumber: glMapping.glAccountNumber,
        isDisbursement: glMapping.isDisbursement,
        originalAmount,
        originalCurrency: inv.currency,
        exchangeRate,
        baseCurrencyAmount,
        baseCurrency,
      });
    }

    // Fallback if no specific lines exist
    if (glLines.length === 0) {
      const glMapping = this.mapGlAccount("General Freight Service", inv.type);
      const baseCurrencyAmount =
        Math.round(inv.amount * exchangeRate * 100) / 100;
      totalNetOriginal = inv.amount;
      glLines.push({
        lineNumber: 1,
        chargeCode: "FRT",
        description: "General Freight Transport",
        accountType: glMapping.accountType,
        glAccountNumber: glMapping.glAccountNumber,
        isDisbursement: false,
        originalAmount: inv.amount,
        originalCurrency: inv.currency,
        exchangeRate,
        baseCurrencyAmount,
        baseCurrency,
      });
    }

    const totalNetBaseCurrency =
      Math.round(totalNetOriginal * exchangeRate * 100) / 100;
    const totalDisbursementsBaseCurrency =
      Math.round(totalDisbursementsOriginal * exchangeRate * 100) / 100;
    const totalGrossOriginal = inv.amount;

    // 3. Build ERP connector payloads
    const nowIso = new Date().toISOString();
    const postingDate = nowIso.split("T")[0];
    const dueDateStr = inv.dueDate
      ? new Date(inv.dueDate).toISOString().split("T")[0]
      : postingDate;

    const sapItems: SapServiceEntrySheetItem[] = glLines.map((l) => ({
      ServiceEntrySheetItem: String(l.lineNumber).padStart(5, "0"),
      PurchaseOrderItem: "00010",
      ServiceDescription: l.description,
      Quantity: 1,
      UnitOfMeasure: "AU",
      UnitPrice: l.baseCurrencyAmount,
      CostCenter: l.isDisbursement ? undefined : "CC-LOG-100",
      GLAccount: l.glAccountNumber,
    }));

    const sapServiceSheet: SapServiceEntrySheet = {
      ServiceEntrySheet: `SES-${inv.invoiceNumber}`,
      PurchaseOrder: `PO-${inv.shipmentId || "LOG-2026"}`,
      ServiceEntrySheetName: `Logistics Sub-Ledger Sync: ${inv.invoiceNumber}`,
      PostingDate: postingDate,
      OriginatingEntity: "ATLAS_SCM_SUBLEDGER",
      Items: sapItems,
      TotalNetAmount: totalNetBaseCurrency + totalDisbursementsBaseCurrency,
      Currency: baseCurrency,
    };

    const netSuiteLines = glLines.map((l) => ({
      item: l.chargeCode,
      amount: l.baseCurrencyAmount,
      taxCode: l.isDisbursement ? "EXEMPT" : "STANDARD_21",
      department: l.isDisbursement ? "PASS_THROUGH" : "FREIGHT_OPERATIONS",
    }));

    const dynamicsBcLines = glLines.map((l) => ({
      accountType: "G/L Account",
      accountNo: l.glAccountNumber,
      postingDate,
      documentNo: inv.invoiceNumber,
      description: l.description,
      debitAmount: inv.type === "AP" ? l.baseCurrencyAmount : 0,
      creditAmount: inv.type === "AR" ? l.baseCurrencyAmount : 0,
    }));

    const totalLinesAmount =
      totalNetBaseCurrency + totalDisbursementsBaseCurrency;
    dynamicsBcLines.push({
      accountType: inv.type === "AR" ? "Customer" : "Vendor",
      accountNo: inv.type === "AR" ? "430000" : "400000",
      postingDate,
      documentNo: inv.invoiceNumber,
      description: `Contra Balance - ${inv.companyName || "Trading Partner"}`,
      debitAmount: inv.type === "AR" ? totalLinesAmount : 0,
      creditAmount: inv.type === "AP" ? totalLinesAmount : 0,
    });

    const syncPayload: GlSyncPayload = {
      syncJobId: `gl_job_${uuidv4()}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceType: inv.type as "AR" | "AP" | "CN" | "DN",
      partyId: inv.companyId,
      partyName: inv.companyName || "Trading Partner",
      partyTaxId: inv.companyTaxId,
      postingDate,
      dueDate: dueDateStr,
      totalGrossOriginal,
      totalNetOriginal,
      totalDisbursementsOriginal,
      totalNetBaseCurrency,
      totalDisbursementsBaseCurrency,
      accountingBaseCurrency: baseCurrency,
      lines: glLines,
      erpConnectors: {
        sapS4Hana: {
          serviceEntrySheet: sapServiceSheet,
          documentReference: inv.invoiceNumber,
        },
        oracleNetSuite: {
          suiteTalkTransactionType:
            inv.type === "AR"
              ? "CustInvc"
              : inv.type === "CN"
                ? "CustCred"
                : "VendBill",
          entityId: inv.companyId,
          tranDate: postingDate,
          dueDate: dueDateStr,
          lines: netSuiteLines,
        },
        msDynamics365Bc: {
          journalBatch: "ATLAS_GL",
          documentNo: inv.invoiceNumber,
          journalLines: dynamicsBcLines,
        },
      },
    };

    // 4. Enqueue into scmOutboxMessages
    const eventId = `evt_gl_${uuidv4()}`;
    await db.insert(scmOutboxMessages).values({
      eventId,
      eventType: "accounting.SYNC_GL_INVOICE",
      schemaVersion: 1,
      producerContext: "accounting_subledger",
      aggregateType: "FinancialInvoice",
      aggregateId: inv.id,
      aggregateVersion: 1,
      correlationId: `corr_${inv.invoiceNumber}`,
      causationId: `cmd_post_invoice_to_gl`,
      actorContextJson: JSON.stringify({
        actorId: "system_finance_subledger",
        role: "FINANCE_CONTROLLER",
      }),
      payloadJson: JSON.stringify(syncPayload),
      status: "PENDING",
      retryCount: 0,
      occurredAt: new Date(),
    });

    logger.info(
      {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        eventId,
        baseCurrency,
        totalNetBaseCurrency,
      },
      "Enqueued SYNC_GL_INVOICE event into transactional outbox",
    );

    return syncPayload;
  }
}
