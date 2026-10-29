import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  scmShipmentFinances,
  scmSalesInvoices,
  scmPurchaseInvoices,
  scmShipments,
} from "../../../db/schema/scm_foundation.js";
import {
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
  assertInvariant,
} from "../../kernel/primitives.js";
import {
  ensureScmFoundationTables,
  outboxBus,
} from "../../kernel/outbox-bus.js";
import { raiseOrDeduplicateException } from "../control-engines/control-engines.context.js";

// ============================================================================
// 16. OPERATIONAL FINANCE BOUNDED CONTEXT (Aggregate ShipmentFinance — 20B)
// ============================================================================

export type FinancialLineType = "COST" | "REVENUE";
export type FinancialConfirmationState =
  "ESTIMATED" | "QUOTED" | "CONFIRMED" | "ACCRUED" | "FINALIZED";
export type InvoiceLinkState =
  "UNINVOICED" | "PARTIALLY_INVOICED" | "FULLY_INVOICED";

export interface FinancialLineItem {
  lineId: string;
  lineType: FinancialLineType;
  chargeCode: string;
  description: string;
  partnerPartyId: string;
  partnerName: string;
  calculationBasis:
    "PER_CONTAINER" | "PER_KG" | "PER_CBM" | "PER_SHIPMENT" | "PERCENTAGE";
  quantity: number;
  unitPrice: number;
  transactionCurrency: string;
  exchangeRate: number;
  transactionAmount: number;
  functionalAmountEur: number;
  confirmationState: FinancialConfirmationState;
  invoiceLinkState: InvoiceLinkState;
  linkedInvoiceIds: string[];
  updatedAt: string;
}

export interface SalesInvoiceReadModel {
  invoiceId: string;
  invoiceNumber: string;
  shipmentId: string;
  billToCustomerPartyId: string;
  customerName: string;
  customerTaxId: string;
  currency: string;
  netAmountEur: number;
  taxRatePercent: number;
  taxAmountEur: number;
  grossAmountEur: number;
  status: string;
  lines: any[];
  creditNoteNumber?: string | null;
  creditReason?: string | null;
  issuedAt?: string | null;
  updatedAt: string;
}

export interface PurchaseInvoiceReadModel {
  purchaseInvoiceId: string;
  supplierPartyId: string;
  supplierName: string;
  supplierInvoiceNumber: string;
  fiscalYear: number;
  shipmentId: string;
  matchedFinancialLineId: string;
  claimedAmountEur: number;
  expectedCostAmountEur: number;
  varianceAmountEur: number;
  variancePercent: number;
  tolerancePercent: number;
  matchOutcome:
    | "EXACT_MATCH"
    | "WITHIN_TOLERANCE"
    | "OVERCHARGE_DISCREPANCY"
    | "UNPLANNED_CHARGE";
  threeWayMatchStatus:
    | "AUTO_MATCHED"
    | "BLOCKED_FOR_VARIANCE"
    | "VARIANCE_APPROVED"
    | "REJECTED_TO_VENDOR";
  status: "REGISTERED" | "APPROVED_FOR_PAYMENT" | "DISPUTED" | "PAID";
  approvalNotes?: string | null;
  updatedAt: string;
}

export interface ShipmentFinanceReadModel {
  shipmentFinanceId: string;
  shipmentId: string;
  functionalCurrency: string;
  financialState:
    | "OPEN"
    | "ACCRUALS_POSTED"
    | "FINANCIALLY_READY"
    | "SOFT_CLOSED"
    | "HARD_LOCKED";
  expectedCostTotalEur: number;
  confirmedCostTotalEur: number;
  expectedRevenueTotalEur: number;
  confirmedRevenueTotalEur: number;
  expectedGrossMarginEur: number;
  actualGrossMarginEur: number;
  marginPercent: number;
  openAccrualAmountEur: number;
  financiallyReady: boolean;
  lines: FinancialLineItem[];
  salesInvoices: SalesInvoiceReadModel[];
  purchaseInvoices: PurchaseInvoiceReadModel[];
  updatedAt: string;
}

function recalculateFinanceMetrics(lines: FinancialLineItem[]) {
  const costLines = lines.filter((l) => l.lineType === "COST");
  const revLines = lines.filter((l) => l.lineType === "REVENUE");

  const expectedCostTotalEur =
    Math.round(
      costLines.reduce((acc, l) => acc + l.functionalAmountEur, 0) * 100,
    ) / 100;
  const confirmedCostTotalEur =
    Math.round(
      costLines
        .filter((l) =>
          ["CONFIRMED", "ACCRUED", "FINALIZED"].includes(l.confirmationState),
        )
        .reduce((acc, l) => acc + l.functionalAmountEur, 0) * 100,
    ) / 100;

  const expectedRevenueTotalEur =
    Math.round(
      revLines.reduce((acc, l) => acc + l.functionalAmountEur, 0) * 100,
    ) / 100;
  const confirmedRevenueTotalEur =
    Math.round(
      revLines
        .filter((l) =>
          ["CONFIRMED", "ACCRUED", "FINALIZED"].includes(l.confirmationState),
        )
        .reduce((acc, l) => acc + l.functionalAmountEur, 0) * 100,
    ) / 100;

  const expectedGrossMarginEur =
    Math.round((expectedRevenueTotalEur - expectedCostTotalEur) * 100) / 100;
  const actualGrossMarginEur =
    Math.round((confirmedRevenueTotalEur - confirmedCostTotalEur) * 100) / 100;

  const marginBase =
    confirmedRevenueTotalEur > 0
      ? confirmedRevenueTotalEur
      : expectedRevenueTotalEur;
  const marginValue =
    confirmedRevenueTotalEur > 0
      ? actualGrossMarginEur
      : expectedGrossMarginEur;

  const marginPercent =
    marginBase > 0 ? Math.round((marginValue / marginBase) * 10000) / 100 : 0;

  const openAccrualAmountEur =
    Math.round(
      lines
        .filter(
          (l) =>
            l.confirmationState === "ACCRUED" &&
            l.invoiceLinkState === "UNINVOICED",
        )
        .reduce((acc, l) => acc + l.functionalAmountEur, 0) * 100,
    ) / 100;

  const hasConfirmedCost = costLines.some((l) =>
    ["CONFIRMED", "ACCRUED", "FINALIZED"].includes(l.confirmationState),
  );
  const hasConfirmedRev = revLines.some((l) =>
    ["CONFIRMED", "ACCRUED", "FINALIZED"].includes(l.confirmationState),
  );
  const hasUnaccruedEstimate = lines.some(
    (l) => l.confirmationState === "ESTIMATED",
  );

  const financiallyReady =
    hasConfirmedCost && hasConfirmedRev && !hasUnaccruedEstimate;

  return {
    expectedCostTotalEur,
    confirmedCostTotalEur,
    expectedRevenueTotalEur,
    confirmedRevenueTotalEur,
    expectedGrossMarginEur,
    actualGrossMarginEur,
    marginPercent,
    openAccrualAmountEur,
    financiallyReady,
  };
}

export async function getShipmentFinanceReadModel(
  shipmentId: string,
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<ShipmentFinanceReadModel> {
  await ensureScmFoundationTables();

  let finRows = await db
    .select()
    .from(scmShipmentFinances)
    .where(eq(scmShipmentFinances.shipmentId, shipmentId))
    .limit(1);

  if (finRows.length === 0) {
    const shpRows = await db
      .select()
      .from(scmShipments)
      .where(eq(scmShipments.id, shipmentId))
      .limit(1);

    const orgId = shpRows[0]?.organizationId || actor.organizationId;
    const branchId = shpRows[0]?.branchId || actor.branchId;
    const customerId = shpRows[0]?.customerAccountId || "pty_customer_default";
    const customerName = shpRows[0]?.customerName || "Customer Account";
    const now = new Date();

    // Seed default operational COST and REVENUE lines for immediate 360° visibility
    const defaultLines: FinancialLineItem[] = [
      {
        lineId: `flin_cost_ocean_${shipmentId}`,
        lineType: "COST",
        chargeCode: "OCEAN_FREIGHT",
        description: "Flete Principal Carrier (All-In Container Rate)",
        partnerPartyId: "pty_carrier_maersk",
        partnerName: "Maersk Line A/S",
        calculationBasis: "PER_CONTAINER",
        quantity: 1,
        unitPrice: 2800,
        transactionCurrency: "EUR",
        exchangeRate: 1.0,
        transactionAmount: 2800,
        functionalAmountEur: 2800,
        confirmationState: "CONFIRMED",
        invoiceLinkState: "UNINVOICED",
        linkedInvoiceIds: [],
        updatedAt: now.toISOString(),
      },
      {
        lineId: `flin_cost_thc_${shipmentId}`,
        lineType: "COST",
        chargeCode: "THC_DEST",
        description: "Terminal Handling Charges & Port Dues en Destino",
        partnerPartyId: "pty_term_bcn",
        partnerName: "APM Terminals Barcelona",
        calculationBasis: "PER_CONTAINER",
        quantity: 1,
        unitPrice: 450,
        transactionCurrency: "EUR",
        exchangeRate: 1.0,
        transactionAmount: 450,
        functionalAmountEur: 450,
        confirmationState: "ACCRUED",
        invoiceLinkState: "UNINVOICED",
        linkedInvoiceIds: [],
        updatedAt: now.toISOString(),
      },
      {
        lineId: `flin_rev_freight_${shipmentId}`,
        lineType: "REVENUE",
        chargeCode: "OCEAN_FREIGHT",
        description: "Venta Flete Internacional Puerta-Puerto + Gestión SCM",
        partnerPartyId: customerId,
        partnerName: customerName,
        calculationBasis: "PER_CONTAINER",
        quantity: 1,
        unitPrice: 4250,
        transactionCurrency: "EUR",
        exchangeRate: 1.0,
        transactionAmount: 4250,
        functionalAmountEur: 4250,
        confirmationState: "CONFIRMED",
        invoiceLinkState: "UNINVOICED",
        linkedInvoiceIds: [],
        updatedAt: now.toISOString(),
      },
    ];

    const metrics = recalculateFinanceMetrics(defaultLines);

    await db
      .insert(scmShipmentFinances)
      .values({
        id: `sfin_${uuidv4()}`,
        shipmentId,
        functionalCurrency: "EUR",
        financialState: metrics.financiallyReady ? "FINANCIALLY_READY" : "OPEN",
        ...metrics,
        linesJson: JSON.stringify(defaultLines),
        organizationId: orgId,
        branchId,
        version: 1,
        updatedAt: now,
      })
      .onConflictDoNothing();

    finRows = await db
      .select()
      .from(scmShipmentFinances)
      .where(eq(scmShipmentFinances.shipmentId, shipmentId))
      .limit(1);
  }

  const row = finRows[0];
  const lines: FinancialLineItem[] = JSON.parse(row.linesJson || "[]");

  const [salesRows, purchaseRows] = await Promise.all([
    db
      .select()
      .from(scmSalesInvoices)
      .where(eq(scmSalesInvoices.shipmentId, shipmentId))
      .orderBy(desc(scmSalesInvoices.updatedAt)),
    db
      .select()
      .from(scmPurchaseInvoices)
      .where(eq(scmPurchaseInvoices.shipmentId, shipmentId))
      .orderBy(desc(scmPurchaseInvoices.updatedAt)),
  ]);

  return {
    shipmentFinanceId: row.id,
    shipmentId: row.shipmentId,
    functionalCurrency: row.functionalCurrency,
    financialState: row.financialState as any,
    expectedCostTotalEur: row.expectedCostTotalEur,
    confirmedCostTotalEur: row.confirmedCostTotalEur,
    expectedRevenueTotalEur: row.expectedRevenueTotalEur,
    confirmedRevenueTotalEur: row.confirmedRevenueTotalEur,
    expectedGrossMarginEur: row.expectedGrossMarginEur,
    actualGrossMarginEur: row.actualGrossMarginEur,
    marginPercent: row.marginPercent,
    openAccrualAmountEur: row.openAccrualAmountEur,
    financiallyReady: Boolean(row.financiallyReady),
    lines,
    salesInvoices: salesRows.map((s) => ({
      invoiceId: s.id,
      invoiceNumber: s.invoiceNumber,
      shipmentId: s.shipmentId,
      billToCustomerPartyId: s.billToCustomerPartyId,
      customerName: s.customerName,
      customerTaxId: s.customerTaxId,
      currency: s.currency,
      netAmountEur: s.netAmountEur,
      taxRatePercent: s.taxRatePercent,
      taxAmountEur: s.taxAmountEur,
      grossAmountEur: s.grossAmountEur,
      status: s.status,
      lines: JSON.parse(s.linesJson || "[]"),
      creditNoteNumber: s.creditNoteNumber,
      creditReason: s.creditReason,
      issuedAt: s.issuedAt,
      updatedAt: s.updatedAt.toISOString(),
    })),
    purchaseInvoices: purchaseRows.map((p) => ({
      purchaseInvoiceId: p.id,
      supplierPartyId: p.supplierPartyId,
      supplierName: p.supplierName,
      supplierInvoiceNumber: p.supplierInvoiceNumber,
      fiscalYear: p.fiscalYear,
      shipmentId: p.shipmentId,
      matchedFinancialLineId: p.matchedFinancialLineId,
      claimedAmountEur: p.claimedAmountEur,
      expectedCostAmountEur: p.expectedCostAmountEur,
      varianceAmountEur: p.varianceAmountEur,
      variancePercent: p.variancePercent,
      tolerancePercent: p.tolerancePercent,
      matchOutcome: p.matchOutcome as any,
      threeWayMatchStatus: p.threeWayMatchStatus as any,
      status: p.status as any,
      approvalNotes: p.approvalNotes,
      updatedAt: p.updatedAt.toISOString(),
    })),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function addOrUpdateFinancialLine(
  input: {
    shipmentId: string;
    lineId?: string;
    lineType: FinancialLineType;
    chargeCode: string;
    description: string;
    partnerPartyId: string;
    partnerName: string;
    calculationBasis?:
      "PER_CONTAINER" | "PER_KG" | "PER_CBM" | "PER_SHIPMENT" | "PERCENTAGE";
    quantity: number;
    unitPrice: number;
    transactionCurrency?: string;
    exchangeRate?: number;
    confirmationState?: FinancialConfirmationState;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<ShipmentFinanceReadModel> {
  await getShipmentFinanceReadModel(input.shipmentId, actor);

  const exchangeRate = input.exchangeRate ?? 1.0;

  assertInvariant(
    input.quantity > 0 && input.unitPrice > 0 && exchangeRate > 0,
    "op_finance",
    "FINANCE_INVALID_LINE_AMOUNTS",
    "FinancialLine requires quantity > 0, unitPrice > 0, and exchangeRate > 0",
  );

  const finRows = await db
    .select()
    .from(scmShipmentFinances)
    .where(eq(scmShipmentFinances.shipmentId, input.shipmentId))
    .limit(1);

  const fin = finRows[0];
  const lines: FinancialLineItem[] = JSON.parse(fin.linesJson || "[]");

  const transactionAmount =
    Math.round(input.quantity * input.unitPrice * 100) / 100;
  const functionalAmountEur =
    Math.round(transactionAmount * exchangeRate * 100) / 100;
  const now = new Date();

  if (input.lineId) {
    const existingIdx = lines.findIndex((l) => l.lineId === input.lineId);
    assertInvariant(
      existingIdx >= 0,
      "op_finance",
      "FINANCE_LINE_NOT_FOUND",
      `FinancialLine '${input.lineId}' not found`,
    );

    const existingLine = lines[existingIdx];

    // Invariant: A FinancialLine with invoiceLinkState == FULLY_INVOICED is locked and cannot be mutated
    assertInvariant(
      existingLine.invoiceLinkState !== "FULLY_INVOICED",
      "op_finance",
      "FINANCE_INVOICED_LINE_IMMUTABLE",
      `FinancialLine '${existingLine.lineId}' is FULLY_INVOICED and cannot be modified in-place; add a separate adjustment/credit line`,
    );

    lines[existingIdx] = {
      ...existingLine,
      chargeCode: input.chargeCode,
      description: input.description,
      partnerPartyId: input.partnerPartyId,
      partnerName: input.partnerName,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      transactionCurrency:
        input.transactionCurrency || existingLine.transactionCurrency,
      exchangeRate,
      transactionAmount,
      functionalAmountEur,
      confirmationState:
        input.confirmationState || existingLine.confirmationState,
      updatedAt: now.toISOString(),
    };
  } else {
    lines.push({
      lineId: `flin_${uuidv4()}`,
      lineType: input.lineType,
      chargeCode: input.chargeCode,
      description: input.description,
      partnerPartyId: input.partnerPartyId,
      partnerName: input.partnerName,
      calculationBasis: input.calculationBasis || "PER_SHIPMENT",
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      transactionCurrency: input.transactionCurrency || "EUR",
      exchangeRate,
      transactionAmount,
      functionalAmountEur,
      confirmationState: input.confirmationState || "CONFIRMED",
      invoiceLinkState: "UNINVOICED",
      linkedInvoiceIds: [],
      updatedAt: now.toISOString(),
    });
  }

  const metrics = recalculateFinanceMetrics(lines);
  const nextFinancialState = metrics.financiallyReady
    ? "FINANCIALLY_READY"
    : metrics.openAccrualAmountEur > 0
      ? "ACCRUALS_POSTED"
      : "OPEN";

  await db
    .update(scmShipmentFinances)
    .set({
      financialState: nextFinancialState,
      ...metrics,
      linesJson: JSON.stringify(lines),
      version: fin.version + 1,
      updatedAt: now,
    })
    .where(eq(scmShipmentFinances.id, fin.id));

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "op_finance.FinancialLineAdded.v1",
      schemaVersion: 1,
      producerContext: "op_finance",
      aggregateType: "ShipmentFinance",
      aggregateId: fin.id,
      aggregateVersion: fin.version + 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_add_financial_line`,
      actor,
      occurredAt: now.toISOString(),
      payload: {
        shipmentFinanceId: fin.id,
        shipmentId: input.shipmentId,
        ...metrics,
      },
    },
  ]);

  await outboxBus.relayPendingEvents();
  return getShipmentFinanceReadModel(input.shipmentId, actor);
}

// ============================================================================
// 17. BILLING BOUNDED CONTEXT (SalesInvoice & PurchaseInvoice 3-Way Match)
// ============================================================================

export async function issueSalesInvoice(
  input: {
    shipmentId: string;
    billToCustomerPartyId?: string;
    customerName?: string;
    customerTaxId?: string;
    financialLineIds?: string[];
    taxRatePercent?: number;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<SalesInvoiceReadModel> {
  const finModel = await getShipmentFinanceReadModel(input.shipmentId, actor);

  const finRows = await db
    .select()
    .from(scmShipmentFinances)
    .where(eq(scmShipmentFinances.shipmentId, input.shipmentId))
    .limit(1);
  const fin = finRows[0];
  const allLines: FinancialLineItem[] = JSON.parse(fin.linesJson || "[]");

  const targetRevLines = allLines.filter(
    (l) =>
      l.lineType === "REVENUE" &&
      l.invoiceLinkState !== "FULLY_INVOICED" &&
      (!input.financialLineIds || input.financialLineIds.includes(l.lineId)),
  );

  assertInvariant(
    targetRevLines.length > 0,
    "billing",
    "BILLING_NO_UNINVOICED_REVENUE_LINES",
    "Cannot issue SalesInvoice: no uninvoiced REVENUE lines available on ShipmentFinance",
  );

  const taxRatePercent = input.taxRatePercent ?? 21.0;
  const netAmountEur =
    Math.round(
      targetRevLines.reduce((acc, l) => acc + l.functionalAmountEur, 0) * 100,
    ) / 100;
  const taxAmountEur =
    Math.round(netAmountEur * (taxRatePercent / 100) * 100) / 100;
  const grossAmountEur = Math.round((netAmountEur + taxAmountEur) * 100) / 100;

  const invoiceId = `sinv_${uuidv4()}`;
  const randomSeq = Math.floor(100000 + Math.random() * 900000);
  const invoiceNumber = `INV-2026-${randomSeq}`;
  const now = new Date();

  const invoiceLines = targetRevLines.map((l) => ({
    invoiceLineId: `sil_${uuidv4()}`,
    sourceFinancialLineId: l.lineId,
    chargeCode: l.chargeCode,
    description: l.description,
    netAmountEur: l.functionalAmountEur,
    taxRatePercent,
    taxAmountEur:
      Math.round(l.functionalAmountEur * (taxRatePercent / 100) * 100) / 100,
  }));

  await db.insert(scmSalesInvoices).values({
    id: invoiceId,
    invoiceNumber,
    shipmentId: input.shipmentId,
    billToCustomerPartyId:
      input.billToCustomerPartyId || targetRevLines[0].partnerPartyId,
    customerName: input.customerName || targetRevLines[0].partnerName,
    customerTaxId: input.customerTaxId || "ESA08192837",
    currency: "EUR",
    netAmountEur,
    taxRatePercent,
    taxAmountEur,
    grossAmountEur,
    status: "ISSUED",
    linesJson: JSON.stringify(invoiceLines),
    creditNoteNumber: null,
    creditReason: null,
    issuedAt: now.toISOString(),
    organizationId: fin.organizationId,
    branchId: fin.branchId,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  // Lock the invoiced REVENUE FinancialLines (FULLY_INVOICED)
  for (const line of allLines) {
    if (targetRevLines.some((tl) => tl.lineId === line.lineId)) {
      line.invoiceLinkState = "FULLY_INVOICED";
      line.confirmationState = "FINALIZED";
      line.linkedInvoiceIds.push(invoiceId);
    }
  }

  const metrics = recalculateFinanceMetrics(allLines);
  await db
    .update(scmShipmentFinances)
    .set({
      ...metrics,
      linesJson: JSON.stringify(allLines),
      version: fin.version + 1,
      updatedAt: now,
    })
    .where(eq(scmShipmentFinances.id, fin.id));

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "billing.InvoiceIssued.v1",
      schemaVersion: 1,
      producerContext: "billing",
      aggregateType: "SalesInvoice",
      aggregateId: invoiceId,
      aggregateVersion: 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_issue_sales_invoice`,
      actor,
      occurredAt: now.toISOString(),
      payload: {
        invoiceId,
        invoiceNumber,
        shipmentId: input.shipmentId,
        netAmountEur,
        grossAmountEur,
        status: "ISSUED",
      },
    },
  ]);

  await outboxBus.relayPendingEvents();

  const updatedFin = await getShipmentFinanceReadModel(
    finModel.shipmentId,
    actor,
  );
  return updatedFin.salesInvoices.find((i) => i.invoiceId === invoiceId)!;
}

/**
 * Enforces Fiscal Immutability Invariant: once a SalesInvoice is ISSUED,
 * any attempt to mutate its amounts or lines in-place fails with 422.
 */
export async function attemptModifyIssuedSalesInvoice(input: {
  invoiceId: string;
  newNetAmountEur: number;
}): Promise<never> {
  await ensureScmFoundationTables();
  const rows = await db
    .select()
    .from(scmSalesInvoices)
    .where(eq(scmSalesInvoices.id, input.invoiceId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "billing",
    "SALES_INVOICE_NOT_FOUND",
    `SalesInvoice '${input.invoiceId}' not found`,
  );

  const inv = rows[0];
  assertInvariant(
    inv.status !== "ISSUED",
    "billing",
    "BILLING_ISSUED_INVOICE_IMMUTABLE",
    `SalesInvoice '${inv.invoiceNumber}' is already ISSUED (${inv.netAmountEur} EUR) and is strictly immutable; issue a CreditNote to rectify`,
  );

  throw new Error("Unreachable");
}

export async function issueSalesCreditNote(
  input: {
    invoiceId: string;
    creditReason: string;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<SalesInvoiceReadModel> {
  await ensureScmFoundationTables();

  assertInvariant(
    Boolean(input.creditReason) && input.creditReason.trim().length >= 5,
    "billing",
    "BILLING_CREDIT_REASON_REQUIRED",
    "Issuing a CreditNote requires an audit creditReason (>= 5 chars)",
  );

  const rows = await db
    .select()
    .from(scmSalesInvoices)
    .where(eq(scmSalesInvoices.id, input.invoiceId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "billing",
    "SALES_INVOICE_NOT_FOUND",
    `SalesInvoice '${input.invoiceId}' not found`,
  );

  const inv = rows[0];
  const randomSeq = Math.floor(100000 + Math.random() * 900000);
  const creditNoteNumber = `CN-2026-${randomSeq}`;
  const now = new Date();

  await db
    .update(scmSalesInvoices)
    .set({
      status: "CREDITED",
      creditNoteNumber,
      creditReason: input.creditReason,
      version: inv.version + 1,
      updatedAt: now,
    })
    .where(eq(scmSalesInvoices.id, inv.id));

  // Unlock linked REVENUE FinancialLines in ShipmentFinance
  const finRows = await db
    .select()
    .from(scmShipmentFinances)
    .where(eq(scmShipmentFinances.shipmentId, inv.shipmentId))
    .limit(1);

  if (finRows.length > 0) {
    const fin = finRows[0];
    const lines: FinancialLineItem[] = JSON.parse(fin.linesJson || "[]");
    for (const l of lines) {
      if (l.linkedInvoiceIds.includes(inv.id)) {
        l.invoiceLinkState = "UNINVOICED";
        l.confirmationState = "CONFIRMED";
      }
    }
    const metrics = recalculateFinanceMetrics(lines);
    await db
      .update(scmShipmentFinances)
      .set({
        ...metrics,
        linesJson: JSON.stringify(lines),
        version: fin.version + 1,
        updatedAt: now,
      })
      .where(eq(scmShipmentFinances.id, fin.id));
  }

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "billing.CreditNoteIssued.v1",
      schemaVersion: 1,
      producerContext: "billing",
      aggregateType: "SalesInvoice",
      aggregateId: inv.id,
      aggregateVersion: inv.version + 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_issue_credit_note`,
      actor,
      occurredAt: now.toISOString(),
      payload: {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        creditNoteNumber,
        shipmentId: inv.shipmentId,
        creditReason: input.creditReason,
      },
    },
  ]);

  await outboxBus.relayPendingEvents();
  const updatedFin = await getShipmentFinanceReadModel(inv.shipmentId, actor);
  return updatedFin.salesInvoices.find((i) => i.invoiceId === inv.id)!;
}

/**
 * Registers a Vendor PurchaseInvoice and executes automated 3-Way Matching
 * against the target COST FinancialLine in ShipmentFinance.
 */
export async function registerAndMatchPurchaseInvoice(
  input: {
    shipmentId: string;
    supplierPartyId: string;
    supplierName: string;
    supplierInvoiceNumber: string;
    fiscalYear?: number;
    matchedFinancialLineId?: string;
    claimedAmountEur: number;
    tolerancePercent?: number;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<PurchaseInvoiceReadModel> {
  const finModel = await getShipmentFinanceReadModel(input.shipmentId, actor);
  const fiscalYear = input.fiscalYear || 2026;
  const dedupVendorKey = `${input.supplierPartyId}:${input.supplierInvoiceNumber}:${fiscalYear}`;

  // Invariant 1: Anti-Double-Payment Uniqueness Guard
  const duplicateRows = await db
    .select()
    .from(scmPurchaseInvoices)
    .where(eq(scmPurchaseInvoices.dedupVendorKey, dedupVendorKey))
    .limit(1);

  assertInvariant(
    duplicateRows.length === 0,
    "billing",
    "BILLING_DUPLICATE_VENDOR_INVOICE",
    `Vendor invoice '${input.supplierInvoiceNumber}' for supplier '${input.supplierPartyId}' in fiscal year ${fiscalYear} is already registered (Anti-Double-Payment guard)`,
  );

  const costLines = finModel.lines.filter((l) => l.lineType === "COST");
  const matchedLine = input.matchedFinancialLineId
    ? costLines.find((l) => l.lineId === input.matchedFinancialLineId)
    : costLines[0];

  assertInvariant(
    Boolean(matchedLine),
    "billing",
    "BILLING_MATCHED_COST_LINE_NOT_FOUND",
    "No matching COST FinancialLine found on ShipmentFinance for 3-Way Match",
  );

  const expectedCostAmountEur = matchedLine!.functionalAmountEur;
  const varianceAmountEur =
    Math.round((input.claimedAmountEur - expectedCostAmountEur) * 100) / 100;
  const variancePercent =
    expectedCostAmountEur > 0
      ? Math.round(
          (Math.abs(varianceAmountEur) / expectedCostAmountEur) * 10000,
        ) / 100
      : 100;
  const tolerancePercent = input.tolerancePercent ?? 2.0;

  let matchOutcome:
    | "EXACT_MATCH"
    | "WITHIN_TOLERANCE"
    | "OVERCHARGE_DISCREPANCY"
    | "UNPLANNED_CHARGE" = "EXACT_MATCH";
  let threeWayMatchStatus:
    | "AUTO_MATCHED"
    | "BLOCKED_FOR_VARIANCE"
    | "VARIANCE_APPROVED"
    | "REJECTED_TO_VENDOR" = "AUTO_MATCHED";
  let status: "REGISTERED" | "APPROVED_FOR_PAYMENT" | "DISPUTED" | "PAID" =
    "APPROVED_FOR_PAYMENT";

  if (varianceAmountEur === 0) {
    matchOutcome = "EXACT_MATCH";
    threeWayMatchStatus = "AUTO_MATCHED";
    status = "APPROVED_FOR_PAYMENT";
  } else if (varianceAmountEur <= 0 || variancePercent <= tolerancePercent) {
    matchOutcome = "WITHIN_TOLERANCE";
    threeWayMatchStatus = "AUTO_MATCHED";
    status = "APPROVED_FOR_PAYMENT";
  } else {
    matchOutcome = "OVERCHARGE_DISCREPANCY";
    threeWayMatchStatus = "BLOCKED_FOR_VARIANCE";
    status = "DISPUTED";
  }

  const purchaseInvoiceId = `pinv_${uuidv4()}`;
  const now = new Date();

  await db.insert(scmPurchaseInvoices).values({
    id: purchaseInvoiceId,
    dedupVendorKey,
    supplierPartyId: input.supplierPartyId,
    supplierName: input.supplierName,
    supplierInvoiceNumber: input.supplierInvoiceNumber,
    fiscalYear,
    shipmentId: input.shipmentId,
    matchedFinancialLineId: matchedLine!.lineId,
    claimedAmountEur: input.claimedAmountEur,
    expectedCostAmountEur,
    varianceAmountEur,
    variancePercent,
    tolerancePercent,
    matchOutcome,
    threeWayMatchStatus,
    status,
    approvalNotes: null,
    organizationId: actor.organizationId,
    branchId: actor.branchId,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  if (threeWayMatchStatus === "BLOCKED_FOR_VARIANCE") {
    const shpRows = await db
      .select()
      .from(scmShipments)
      .where(eq(scmShipments.id, input.shipmentId))
      .limit(1);
    const shp = shpRows[0];

    // Raise deduplicated operational/financial exception & Smart Work Queue task
    await raiseOrDeduplicateException(
      {
        shipmentId: input.shipmentId,
        referenceNumber: shp?.shipmentReference || input.shipmentId,
        customerName: shp?.customerName || "Customer Account",
        routeSummary: "Corredor Multimodal 360",
        transportMode: shp?.serviceMode || "SEA",
        category: "DATA_QUALITY_BLOCK",
        severity: "HIGH",
        title: `Discrepancia 3-Way Match Factura Proveedor ${input.supplierInvoiceNumber} (+€${varianceAmountEur})`,
        summary: `Proveedor ${input.supplierName} reclama €${input.claimedAmountEur} frente a €${expectedCostAmountEur} esperados (+${variancePercent}% > tolerancia ${tolerancePercent}%). Pago bloqueado.`,
        milestoneCode: "POD_DELIVERY",
        locationLocode: "ESBCN",
      },
      actor,
    );
  }

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType:
        threeWayMatchStatus === "BLOCKED_FOR_VARIANCE"
          ? "billing.PurchaseInvoiceDisputed.v1"
          : "billing.PurchaseInvoiceMatched.v1",
      schemaVersion: 1,
      producerContext: "billing",
      aggregateType: "PurchaseInvoice",
      aggregateId: purchaseInvoiceId,
      aggregateVersion: 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_register_purchase_invoice`,
      actor,
      occurredAt: now.toISOString(),
      payload: {
        purchaseInvoiceId,
        supplierInvoiceNumber: input.supplierInvoiceNumber,
        shipmentId: input.shipmentId,
        claimedAmountEur: input.claimedAmountEur,
        expectedCostAmountEur,
        varianceAmountEur,
        variancePercent,
        matchOutcome,
        threeWayMatchStatus,
        status,
      },
    },
  ]);

  await outboxBus.relayPendingEvents();

  const updatedFin = await getShipmentFinanceReadModel(input.shipmentId, actor);
  return updatedFin.purchaseInvoices.find(
    (p) => p.purchaseInvoiceId === purchaseInvoiceId,
  )!;
}

/**
 * Approves a PurchaseInvoice for payment.
 * Invariant: If threeWayMatchStatus === "BLOCKED_FOR_VARIANCE", approving without
 * explicit `approveVarianceOverride: true` and `approvalNotes` fails with 422!
 */
export async function approvePurchaseInvoicePayment(
  input: {
    purchaseInvoiceId: string;
    approveVarianceOverride?: boolean;
    approvalNotes?: string;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<PurchaseInvoiceReadModel> {
  await ensureScmFoundationTables();

  const rows = await db
    .select()
    .from(scmPurchaseInvoices)
    .where(eq(scmPurchaseInvoices.id, input.purchaseInvoiceId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "billing",
    "PURCHASE_INVOICE_NOT_FOUND",
    `PurchaseInvoice '${input.purchaseInvoiceId}' not found`,
  );

  const pinv = rows[0];

  if (pinv.threeWayMatchStatus === "BLOCKED_FOR_VARIANCE") {
    assertInvariant(
      Boolean(input.approveVarianceOverride) &&
        Boolean(input.approvalNotes) &&
        input.approvalNotes!.trim().length >= 5,
      "billing",
      "BILLING_PURCHASE_INVOICE_VARIANCE_BLOCKED",
      `PurchaseInvoice '${pinv.supplierInvoiceNumber}' has a +${pinv.variancePercent}% overcharge discrepancy (€${pinv.varianceAmountEur}) and cannot be approved for payment without explicit variance override and audit approvalNotes`,
    );
  }

  const now = new Date();
  await db
    .update(scmPurchaseInvoices)
    .set({
      threeWayMatchStatus: "VARIANCE_APPROVED",
      status: "APPROVED_FOR_PAYMENT",
      approvalNotes:
        input.approvalNotes || "Variación aprobada por Controlling Operativo",
      version: pinv.version + 1,
      updatedAt: now,
    })
    .where(eq(scmPurchaseInvoices.id, pinv.id));

  // Sync the approved cost into ShipmentFinance so actualGrossMarginEur reflects reality!
  const finRows = await db
    .select()
    .from(scmShipmentFinances)
    .where(eq(scmShipmentFinances.shipmentId, pinv.shipmentId))
    .limit(1);

  if (finRows.length > 0) {
    const fin = finRows[0];
    const lines: FinancialLineItem[] = JSON.parse(fin.linesJson || "[]");
    const targetLine = lines.find(
      (l) => l.lineId === pinv.matchedFinancialLineId,
    );
    if (targetLine) {
      targetLine.unitPrice = pinv.claimedAmountEur;
      targetLine.quantity = 1;
      targetLine.transactionAmount = pinv.claimedAmountEur;
      targetLine.functionalAmountEur = pinv.claimedAmountEur;
      targetLine.confirmationState = "FINALIZED";
      targetLine.invoiceLinkState = "FULLY_INVOICED";
      if (!targetLine.linkedInvoiceIds.includes(pinv.id)) {
        targetLine.linkedInvoiceIds.push(pinv.id);
      }
    }
    const metrics = recalculateFinanceMetrics(lines);
    await db
      .update(scmShipmentFinances)
      .set({
        ...metrics,
        linesJson: JSON.stringify(lines),
        version: fin.version + 1,
        updatedAt: now,
      })
      .where(eq(scmShipmentFinances.id, fin.id));
  }

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "billing.PurchaseInvoiceVarianceApproved.v1",
      schemaVersion: 1,
      producerContext: "billing",
      aggregateType: "PurchaseInvoice",
      aggregateId: pinv.id,
      aggregateVersion: pinv.version + 1,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_approve_purchase_invoice_variance`,
      actor,
      occurredAt: now.toISOString(),
      payload: {
        purchaseInvoiceId: pinv.id,
        supplierInvoiceNumber: pinv.supplierInvoiceNumber,
        shipmentId: pinv.shipmentId,
        approvedAmountEur: pinv.claimedAmountEur,
        approvalNotes: input.approvalNotes,
      },
    },
  ]);

  await outboxBus.relayPendingEvents();

  const updatedFin = await getShipmentFinanceReadModel(pinv.shipmentId, actor);
  return updatedFin.purchaseInvoices.find(
    (p) => p.purchaseInvoiceId === pinv.id,
  )!;
}
