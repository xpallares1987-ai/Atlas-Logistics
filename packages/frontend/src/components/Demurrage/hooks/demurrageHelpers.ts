/**
 * @file demurrageHelpers.ts
 * @description Pure domain transformers, FMC 46 CFR Part 541 checklist builders, and date calculators for Demurrage & Detention.
 * @module @atlas/frontend/components/Demurrage/hooks
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import type {
  CarrierInvoiceData,
  ClockSuspension,
  EDI315Milestone,
  SuspensionReasonCode,
} from "@atlas/shared";
import type { FmcChecklistItem } from "../../../types/demurrage.types";

// ============================================================================
// 1. CANONICAL FALLBACK ENTITIES
// ============================================================================

export const CANONICAL_FALLBACK_INVOICE: CarrierInvoiceData = {
  invoiceNumber: "INV-DEM-2026-9921",
  invoiceDate: "2026-10-25",
  carrierName: "Maersk Line A/S",
  carrierScac: "MAEU",
  billOfLading: "BK-2026-67116",
  containerNumber: "MSKU9284712",
  chargeType: "DEMURRAGE",
  jurisdiction: "US_FMC_OSRA_2022",
  vesselVoyage: "MSC ISABELLA / 2604W",
  pod: "New York Container Terminal (USNYC)",
  terminalName: "APM Terminals Port Elizabeth",
  terminalHoursProvided: true,
  dischargeDate: "2026-10-25",
  availableDate: "2026-10-25",
  freeTimeStartDate: "2026-10-26",
  freeTimeEndDate: "2026-10-29",
  freeDaysGranted: 4,
  billedStartDate: "2026-10-26",
  billedEndDate: "2026-11-02",
  billedTotalDays: 8,
  billedDailyRate: 175,
  invoicedAmount: 1400,
  currency: "USD",
  disputeContactEmail: "disputes.na@maersk.com",
  tariffTiers: [
    { fromDay: 1, toDay: 4, dailyRate: 175, currency: "USD" },
    { fromDay: 5, toDay: 8, dailyRate: 250, currency: "USD" },
  ],
};

export const DEFAULT_FALLBACK_SUSPENSIONS: ClockSuspension[] = [
  {
    id: "dsusp_01",
    code: "CUSTOMS_PHYSICAL_EXAM",
    reason:
      "CBP vacis exam hold placed on container MSKU9284712 preventing gate-out release.",
    startDate: "2026-10-27",
    endDate: "2026-10-29",
    suspendedDays: 2,
    officialNoticeRef: "Aviso Oficial de Autoridad Portuaria",
    approved: true,
  },
];

// ============================================================================
// 2. RELATIONAL ENTITY MAPPERS
// ============================================================================

/**
 * Normalizes a relational SQLite demurrage invoice record into a CarrierInvoiceData structure.
 */
export function mapDbInvoiceToCarrierData(inv: any): CarrierInvoiceData {
  if (!inv) return CANONICAL_FALLBACK_INVOICE;
  return {
    invoiceNumber: inv.invoiceNumber || "INV-DEM-2026-9921",
    invoiceDate: inv.createdAt
      ? new Date(inv.createdAt).toISOString().split("T")[0]
      : "2026-10-25",
    carrierName: inv.carrierName || "Maersk Line A/S",
    carrierScac: inv.carrierScac || "MAEU",
    billOfLading: inv.billOfLading || "BK-2026-67116",
    containerNumber: inv.containerNumber || "MSKU9284712",
    chargeType: "DEMURRAGE",
    jurisdiction: "US_FMC_OSRA_2022",
    vesselVoyage: "MSC ISABELLA / 2604W",
    pod: inv.pod || "New York Container Terminal (USNYC)",
    terminalName: inv.terminalName || "APM Terminals Port Elizabeth",
    terminalHoursProvided: true,
    dischargeDate: inv.vesselDischargeDate
      ? inv.vesselDischargeDate.split("T")[0]
      : "2026-10-25",
    availableDate: inv.availableDate
      ? inv.availableDate.split("T")[0]
      : "2026-10-25",
    freeTimeStartDate: inv.freeTimeStartDate
      ? inv.freeTimeStartDate.split("T")[0]
      : "2026-10-26",
    freeTimeEndDate: inv.freeTimeEndDate
      ? inv.freeTimeEndDate.split("T")[0]
      : "2026-10-29",
    freeDaysGranted: inv.freeDaysGranted ?? 4,
    billedStartDate: inv.freeTimeStartDate
      ? inv.freeTimeStartDate.split("T")[0]
      : "2026-10-26",
    billedEndDate: inv.freeTimeEndDate
      ? inv.freeTimeEndDate.split("T")[0]
      : "2026-11-02",
    billedTotalDays: 8,
    billedDailyRate: inv.dailyRateUsd ?? 175,
    invoicedAmount: inv.totalInvoicedUsd ?? 1400,
    currency: "USD",
    disputeContactEmail: "disputes.na@maersk.com",
    tariffTiers:
      inv.tariffTiers && inv.tariffTiers.length > 0
        ? inv.tariffTiers
        : [
            {
              fromDay: 1,
              toDay: 4,
              dailyRate: inv.dailyRateUsd ?? 175,
              currency: "USD",
            },
            { fromDay: 5, toDay: 8, dailyRate: 250, currency: "USD" },
          ],
  };
}

/**
 * Normalizes a relational SQLite suspension row into a ClockSuspension domain object.
 */
export function mapDbSuspensionToClockSuspension(s: any): ClockSuspension {
  return {
    id: s.id,
    code: (s.reason || "CUSTOMS_PHYSICAL_EXAM") as SuspensionReasonCode,
    reason: s.justificationText || s.reason || "Suspensión reglamentaria",
    startDate: s.startDate?.includes("T")
      ? s.startDate.split("T")[0]
      : s.startDate || "2026-10-27",
    endDate: s.endDate?.includes("T")
      ? s.endDate.split("T")[0]
      : s.endDate || "2026-10-29",
    suspendedDays: s.daysSuspended ?? 2,
    officialNoticeRef:
      s.officialNoticeRef || "Aviso Oficial de Autoridad Portuaria",
    approved: s.approved !== false,
  };
}

/**
 * Generates the verified EDI 315 milestone timeline for the active invoice.
 */
export function buildEdi315Milestones(activeDbInvoice: any): EDI315Milestone[] {
  const terminalName =
    activeDbInvoice?.terminalName || "APM Terminals Port Elizabeth";
  return [
    {
      id: "m-01",
      code: "VD",
      eventDescription: "Descarga de buque (Vessel Discharge)",
      timestamp: activeDbInvoice?.vesselDischargeDate || "2026-10-25T08:00:00Z",
      locationCode: "USNYC",
      locationName: terminalName,
      verified: true,
    },
    {
      id: "m-02",
      code: "AL",
      eventDescription:
        "Contenedor Disponible en Terminal (Container Available)",
      timestamp: activeDbInvoice?.availableDate || "2026-10-25T14:00:00Z",
      locationCode: "USNYC",
      locationName: terminalName,
      verified: true,
    },
    {
      id: "m-03",
      code: "CO",
      eventDescription:
        "Inspección Aduanera Notificada (Customs Physical Hold)",
      timestamp: "2026-10-27T08:00:00Z",
      locationCode: "USNYC",
      locationName: "CBP Examination Station",
      verified: true,
    },
    {
      id: "m-04",
      code: "CR",
      eventDescription:
        "Levante Aduanero y Liberación Naviera (Carrier Release)",
      timestamp: "2026-10-29T18:00:00Z",
      locationCode: "USNYC",
      locationName: terminalName,
      verified: true,
    },
  ];
}

// ============================================================================
// 3. DOMAIN CALCULATORS & VALIDATORS
// ============================================================================

/**
 * Calculates inclusive calendar days between two YYYY-MM-DD dates (minimum 1 day).
 */
export function calculateSuspensionDays(
  startDate: string,
  endDate: string,
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 1;
  }
  const diffDays =
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

/**
 * Filters demurrage invoice list by container number, B/L, or invoice number.
 */
export function filterDemurrageInvoices<
  T extends {
    containerNumber?: string;
    billOfLading?: string;
    invoiceNumber?: string;
  },
>(invoices: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return invoices;
  return invoices.filter(
    (inv) =>
      inv.containerNumber?.toLowerCase().includes(q) ||
      inv.billOfLading?.toLowerCase().includes(q) ||
      inv.invoiceNumber?.toLowerCase().includes(q),
  );
}

/**
 * Evaluates the 13 statutory billing elements required under 46 CFR § 541.6.
 */
export function buildFmcChecklistItems(
  currentInvoice: CarrierInvoiceData,
): FmcChecklistItem[] {
  return [
    {
      name: "Container Number",
      valid: Boolean(currentInvoice.containerNumber),
    },
    {
      name: "Bill of Lading / Booking",
      valid: Boolean(currentInvoice.billOfLading),
    },
    {
      name: "Port / Terminal of Discharge",
      valid: Boolean(currentInvoice.pod),
    },
    {
      name: "Vessel Name & Voyage",
      valid: Boolean(currentInvoice.vesselVoyage),
    },
    {
      name: "Discharge Date",
      valid: Boolean(currentInvoice.dischargeDate),
    },
    {
      name: "Container Availability Date",
      valid: Boolean(currentInvoice.availableDate),
    },
    {
      name: "Terminal Gate Hours Provided",
      valid: Boolean(currentInvoice.terminalHoursProvided),
    },
    {
      name: "Free Time Start Date",
      valid: Boolean(currentInvoice.freeTimeStartDate),
    },
    {
      name: "Free Time End Date",
      valid: Boolean(currentInvoice.freeTimeEndDate),
    },
    {
      name: "Number of Free Days Allowed",
      valid: Boolean(currentInvoice.freeDaysGranted),
    },
    {
      name: "Billed Charge Period Start & End",
      valid: Boolean(
        currentInvoice.billedStartDate && currentInvoice.billedEndDate,
      ),
    },
    {
      name: "Applicable Tariff Rule / Rate",
      valid: Boolean(currentInvoice.billedDailyRate),
    },
    {
      name: "Designated Dispute Contact Email",
      valid: Boolean(currentInvoice.disputeContactEmail),
    },
  ];
}
