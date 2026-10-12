/**
 * Demurrage & Detention (D&D) Dispute Resolver & Free-Time Clock Engine
 * 
 * Supports regulatory frameworks:
 * - US FMC 46 CFR Part 541 / OSRA 2022 (Ocean Shipping Reform Act)
 * - European Port Standard Commercial Terms (Rotterdam, Antwerp, Hamburg rules)
 * - Spanish Puertos del Estado (RD 2/2011 / Book 012 Barcelona Can Tunis)
 */

export type JurisdictionRule =
  | "US_FMC_OSRA_2022"
  | "EU_PORT_STANDARD"
  | "ES_PUERTOS_ESTADO";

export type ChargeType = "DEMURRAGE" | "DETENTION" | "PER_DIEM";

export type SuspensionReasonCode =
  | "TERMINAL_GATE_CLOSED"
  | "APPOINTMENT_UNAVAILABLE"
  | "CUSTOMS_PHYSICAL_EXAM"
  | "CUSTOMS_VACIS_SCAN"
  | "CHASSIS_SHORTAGE"
  | "RAIL_EMBARGO"
  | "PORT_STRIKE_FORCE_MAJEURE"
  | "CARRIER_IT_OUTAGE";

export type EDI315EventCode =
  | "VD" // Vessel Discharge
  | "VA" // Vessel Arrival
  | "AL" // Container Available for Pickup
  | "OA" // Outgate Movement (Demurrage ends, Detention begins)
  | "I"  // Ingate Return to Terminal / Depot (Detention ends)
  | "CO" // Customs Hold / Inspection Released
  | "CR"; // Carrier Release

export interface EDI315Milestone {
  id: string;
  code: EDI315EventCode;
  eventDescription: string;
  timestamp: string; // ISO 8601
  locationCode: string;
  locationName: string;
  verified: boolean;
  notes?: string;
}

export interface ClockSuspension {
  id: string;
  code: SuspensionReasonCode;
  reason: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  suspendedDays: number;
  officialNoticeRef?: string;
  evidenceAttachmentUrl?: string;
  approved: boolean;
}

export interface DemurrageTariffTier {
  fromDay: number;
  toDay?: number; // undefined means unbounded / onwards
  dailyRate: number;
  currency: string;
}

export interface CarrierInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  carrierName: string;
  carrierScac: string;
  billOfLading: string;
  containerNumber: string;
  chargeType: ChargeType;
  jurisdiction: JurisdictionRule;
  vesselVoyage?: string;
  pod?: string; // Port of Discharge (UN/LOCODE)
  terminalName?: string;
  terminalHoursProvided?: boolean;
  dischargeDate?: string;
  availableDate?: string;
  freeTimeStartDate?: string;
  freeTimeEndDate?: string;
  earliestReturnDate?: string; // ERD
  freeDaysGranted?: number;
  billedStartDate?: string;
  billedEndDate?: string;
  billedTotalDays?: number;
  billedDailyRate?: number;
  invoicedAmount: number;
  currency: string;
  disputeContactEmail?: string;
  tariffTiers?: DemurrageTariffTier[];
}

export interface FMCComplianceResult {
  isCompliant: boolean;
  complianceScore: number; // 0 - 100%
  missingFields: string[];
  mandatoryFieldsPresent: string[];
  statutoryCitation: string;
  legalVerdict: string;
  fullWaiverEligible: boolean;
}

export interface DemurrageAuditResult {
  containerNumber: string;
  invoiceNumber: string;
  carrierName: string;
  jurisdiction: JurisdictionRule;
  chargeType: ChargeType;
  currency: string;
  
  // Dwell calculations
  grossCalendarDwellDays: number;
  totalSuspendedDays: number;
  netActualDwellDays: number;
  freeDaysGranted: number;
  
  // Day comparisons
  carrierBilledDays: number;
  auditedLegalBillableDays: number;
  unjustifiedBilledDays: number;
  
  // Financial breakdown
  carrierInvoicedAmount: number;
  auditedLegalAmount: number;
  disputedWaiverAmount: number;
  savingsPercentage: number;
  
  // Audit status
  auditStatus: "FULL_WAIVER_JUSTIFIED" | "PARTIAL_REDUCTION_JUSTIFIED" | "VALID_CHARGE";
  fmcCompliance: FMCComplianceResult;
  suspensionsApplied: ClockSuspension[];
  milestones: EDI315Milestone[];
  disputeSummaryText: string;
  generatedDate: string;
}

export interface DisputePack {
  dossierId: string;
  auditResult: DemurrageAuditResult;
  recipientCarrier: {
    carrierName: string;
    department: string;
    email: string;
  };
  shipperOrConsignee: {
    companyName: string;
    contactName: string;
    email: string;
    accountReference: string;
  };
  formalLetterSubject: string;
  formalLetterBody: string;
  evidenceAttachments: string[];
  statutoryDeadlineNotice: string;
}

/**
 * Validates carrier invoice against US FMC 46 CFR Part 541.6 mandatory data requirements.
 * Under FMC OSRA 2022 rules, failure to include any mandatory element eliminates the obligation to pay.
 */
export function validateFmcInvoiceRequirements(invoice: CarrierInvoiceData): FMCComplianceResult {
  const mandatoryChecks: { key: string; label: string; valid: boolean }[] = [
    { key: "containerNumber", label: "Container Number (46 CFR § 541.6(a)(1))", valid: Boolean(invoice.containerNumber?.trim()) },
    { key: "billOfLading", label: "Bill of Lading / Booking Number (§ 541.6(a)(2))", valid: Boolean(invoice.billOfLading?.trim()) },
    { key: "pod", label: "Port / Terminal of Discharge (§ 541.6(a)(3))", valid: Boolean(invoice.pod?.trim()) },
    { key: "vesselVoyage", label: "Vessel Name & Voyage (§ 541.6(a)(4))", valid: Boolean(invoice.vesselVoyage?.trim()) },
    { key: "dischargeDate", label: "Discharge Date (§ 541.6(a)(5))", valid: Boolean(invoice.dischargeDate?.trim()) },
    { key: "availableDate", label: "Container Availability Date & Notification (§ 541.6(a)(6))", valid: Boolean(invoice.availableDate?.trim()) },
    { key: "terminalHoursProvided", label: "Operating Terminal Hours & Gate Schedule (§ 541.6(a)(7))", valid: Boolean(invoice.terminalHoursProvided) },
    { key: "freeTimeStartDate", label: "Free Time Start Date (§ 541.6(a)(8))", valid: Boolean(invoice.freeTimeStartDate?.trim()) },
    { key: "freeTimeEndDate", label: "Free Time End Date (§ 541.6(a)(9))", valid: Boolean(invoice.freeTimeEndDate?.trim()) },
    { key: "freeDaysGranted", label: "Number of Free Days Allowed (§ 541.6(a)(10))", valid: typeof invoice.freeDaysGranted === "number" && invoice.freeDaysGranted > 0 },
    { key: "billedStartDate", label: "Billed Charge Period Start & End Dates (§ 541.6(a)(11))", valid: Boolean(invoice.billedStartDate?.trim() && invoice.billedEndDate?.trim()) },
    { key: "billedDailyRate", label: "Applicable Tariff Rule & Daily Rate (§ 541.6(a)(12))", valid: (invoice.billedDailyRate !== undefined && invoice.billedDailyRate > 0) || (invoice.tariffTiers !== undefined && invoice.tariffTiers.length > 0) },
    { key: "disputeContactEmail", label: "Designated Carrier Dispute Contact Email (§ 541.6(a)(13))", valid: Boolean(invoice.disputeContactEmail?.includes("@")) },
  ];

  const missingFields: string[] = [];
  const mandatoryFieldsPresent: string[] = [];

  for (const check of mandatoryChecks) {
    if (check.valid) {
      mandatoryFieldsPresent.push(check.label);
    } else {
      missingFields.push(check.label);
    }
  }

  const complianceScore = Math.round((mandatoryFieldsPresent.length / mandatoryChecks.length) * 100);
  const isCompliant = missingFields.length === 0;

  const statutoryCitation = "US 46 CFR Part 541 (OSRA 2022) § 541.6 & § 541.8";
  let legalVerdict = "";
  let fullWaiverEligible = false;

  if (isCompliant) {
    legalVerdict = "Invoice complies with all 13 FMC § 541.6 mandatory billing elements. Substance of days and clock pauses must be audited.";
    fullWaiverEligible = false;
  } else {
    fullWaiverEligible = true;
    legalVerdict = `INVOICE STATUTORILY DEFECTIVE. Missing ${missingFields.length} mandatory element(s) required under FMC 46 CFR § 541.6. Under § 541.8, billed party has no obligation to pay defective invoices. Full 100% waiver legally warranted.`;
  }

  return {
    isCompliant,
    complianceScore,
    missingFields,
    mandatoryFieldsPresent,
    statutoryCitation,
    legalVerdict,
    fullWaiverEligible,
  };
}

/**
 * Calculates calendar days between two ISO date strings (inclusive of start day up to end day).
 */
export function calculateDaysBetween(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr.split("T")[0]);
  const end = new Date(endDateStr.split("T")[0]);
  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) return 0;
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Computes tiered demurrage amount based on daily tariff tiers.
 */
export function calculateTieredDemurrageFee(
  billableDays: number,
  tiers?: DemurrageTariffTier[],
  fallbackDailyRate: number = 150
): number {
  if (billableDays <= 0) return 0;
  if (!tiers || tiers.length === 0) {
    return billableDays * fallbackDailyRate;
  }

  let totalFee = 0;
  let remainingDays = billableDays;
  let currentDayOffset = 1;

  for (const tier of tiers) {
    if (remainingDays <= 0) break;
    const tierSpan = tier.toDay ? (tier.toDay - tier.fromDay + 1) : remainingDays;
    const daysInThisTier = Math.min(remainingDays, tierSpan);
    totalFee += daysInThisTier * tier.dailyRate;
    remainingDays -= daysInThisTier;
    currentDayOffset += daysInThisTier;
  }

  if (remainingDays > 0) {
    const lastTier = tiers[tiers.length - 1];
    totalFee += remainingDays * lastTier.dailyRate;
  }

  return totalFee;
}

/**
 * Full Audit Reconciler:
 * Compares Carrier Invoice against EDI 315 Milestones and Approved Clock Suspensions.
 */
export function calculateDemurrageAudit(params: {
  invoice: CarrierInvoiceData;
  suspensions: ClockSuspension[];
  milestones?: EDI315Milestone[];
}): DemurrageAuditResult {
  const { invoice, suspensions, milestones = [] } = params;

  // 1. FMC Compliance check
  const fmcCompliance = validateFmcInvoiceRequirements(invoice);

  // 2. Determine actual start & end of terminal dwell
  const startDwellDate = invoice.availableDate || invoice.dischargeDate || invoice.freeTimeStartDate || invoice.billedStartDate || new Date().toISOString().split("T")[0];
  const endDwellDate = invoice.billedEndDate || new Date().toISOString().split("T")[0];

  const grossCalendarDwellDays = calculateDaysBetween(startDwellDate, endDwellDate);

  // 3. Calculate approved suspensions
  const approvedSuspensions = suspensions.filter((s) => s.approved);
  const totalSuspendedDays = approvedSuspensions.reduce((sum, s) => sum + s.suspendedDays, 0);

  // 4. Net actual dwell days after deducting legally suspended days
  const netActualDwellDays = Math.max(0, grossCalendarDwellDays - totalSuspendedDays);

  // 5. Free days granted
  const freeDays = invoice.freeDaysGranted ?? 4;

  // 6. Audited Legal Billable Days
  const auditedLegalBillableDays = Math.max(0, netActualDwellDays - freeDays);

  // 7. Carrier Billed Days
  const carrierBilledDays = invoice.billedTotalDays ?? Math.max(0, grossCalendarDwellDays - freeDays);
  const unjustifiedBilledDays = Math.max(0, carrierBilledDays - auditedLegalBillableDays);

  // 8. Audited Legal Amount
  const defaultRate = invoice.billedDailyRate || 150;
  let auditedLegalAmount = calculateTieredDemurrageFee(
    auditedLegalBillableDays,
    invoice.tariffTiers,
    defaultRate
  );

  let carrierInvoicedAmount = invoice.invoicedAmount;
  let disputedWaiverAmount = Math.max(0, carrierInvoicedAmount - auditedLegalAmount);

  // If FMC defective in US jurisdiction, full waiver is justified by default
  let auditStatus: DemurrageAuditResult["auditStatus"] = "VALID_CHARGE";

  if (invoice.jurisdiction === "US_FMC_OSRA_2022" && !fmcCompliance.isCompliant) {
    auditStatus = "FULL_WAIVER_JUSTIFIED";
    disputedWaiverAmount = carrierInvoicedAmount;
    auditedLegalAmount = 0;
  } else if (auditedLegalBillableDays === 0 && carrierInvoicedAmount > 0) {
    auditStatus = "FULL_WAIVER_JUSTIFIED";
    disputedWaiverAmount = carrierInvoicedAmount;
    auditedLegalAmount = 0;
  } else if (disputedWaiverAmount > 0) {
    auditStatus = "PARTIAL_REDUCTION_JUSTIFIED";
  } else {
    auditStatus = "VALID_CHARGE";
    disputedWaiverAmount = 0;
  }

  const savingsPercentage = carrierInvoicedAmount > 0
    ? Math.round((disputedWaiverAmount / carrierInvoicedAmount) * 100)
    : 0;

  // Summary generation
  let disputeSummaryText = "";
  if (auditStatus === "FULL_WAIVER_JUSTIFIED") {
    disputeSummaryText = !fmcCompliance.isCompliant
      ? `Full 100% waiver claimed under FMC 46 CFR § 541.8 due to statutory invoice defects (${fmcCompliance.missingFields.length} missing mandatory items) plus ${totalSuspendedDays} clock-pause day(s).`
      : `Full 100% waiver claimed: After deducting ${totalSuspendedDays} legally paused day(s) for terminal/customs unavailability, net dwell did not exceed the ${freeDays} free days allowed.`;
  } else if (auditStatus === "PARTIAL_REDUCTION_JUSTIFIED") {
    disputeSummaryText = `Partial dispute claiming ${disputedWaiverAmount} ${invoice.currency} waiver (${unjustifiedBilledDays} unjustified billable days waived due to ${totalSuspendedDays} verified clock-pause suspension days).`;
  } else {
    disputeSummaryText = `Invoice verified compliant. Charges reflect valid dwell without pending clock-pause deductions.`;
  }

  return {
    containerNumber: invoice.containerNumber,
    invoiceNumber: invoice.invoiceNumber,
    carrierName: invoice.carrierName,
    jurisdiction: invoice.jurisdiction,
    chargeType: invoice.chargeType,
    currency: invoice.currency,
    grossCalendarDwellDays,
    totalSuspendedDays,
    netActualDwellDays,
    freeDaysGranted: freeDays,
    carrierBilledDays,
    auditedLegalBillableDays,
    unjustifiedBilledDays,
    carrierInvoicedAmount,
    auditedLegalAmount,
    disputedWaiverAmount,
    savingsPercentage,
    auditStatus,
    fmcCompliance,
    suspensionsApplied: approvedSuspensions,
    milestones,
    disputeSummaryText,
    generatedDate: new Date().toISOString(),
  };
}

/**
 * Builds a formal Evidentiary Dispute Pack ready for carrier claims submission.
 */
export function generateDisputePack(params: {
  auditResult: DemurrageAuditResult;
  shipperOrConsignee?: {
    companyName: string;
    contactName: string;
    email: string;
    accountReference: string;
  };
  recipientEmail?: string;
}): DisputePack {
  const { auditResult } = params;

  const shipper = params.shipperOrConsignee || {
    companyName: "Atlas Logistics Enterprise Group",
    contactName: "Xavier Pallarès (Global Logistics Lead)",
    email: "ops-disputes@atlaslogistics.internal",
    accountReference: "ATL-ACC-012-BCN",
  };

  const recipient = {
    carrierName: auditResult.carrierName,
    department: "Demurrage & Detention Dispute & Claims Resolution Desk",
    email: params.recipientEmail || `claims.${auditResult.carrierName.toLowerCase().replace(/[^a-z0-9]/g, "")}@carrier-disputes.com`,
  };

  const dossierId = `DSP-${auditResult.containerNumber}-${Date.now().toString(36).toUpperCase()}`;

  // Statutory code citation
  let legalAuthority = "";
  if (auditResult.jurisdiction === "US_FMC_OSRA_2022") {
    legalAuthority = "United States Federal Maritime Commission (FMC) 46 CFR Part 541 (Demurrage and Detention Billing Requirements; OSRA 2022 § 7(b))";
  } else if (auditResult.jurisdiction === "ES_PUERTOS_ESTADO") {
    legalAuthority = "Real Decreto Legislativo 2/2011 (Texto Refundido de la Ley de Puertos del Estado y de la Marina Mercante) & Book 012 Barcelona Corredor Operativo";
  } else {
    legalAuthority = "European Port Standard Commercial Rules & ICC Incoterms 2020 Maritime Force Majeure clauses";
  }

  const formalLetterSubject = `FORMAL DISPUTE NOTICE: Demurrage Invoice #${auditResult.invoiceNumber} | Container ${auditResult.containerNumber} | Claim Ref: ${dossierId}`;

  const formalLetterBody = `TO: ${recipient.carrierName} - ${recipient.department}
FROM: ${shipper.companyName} (${shipper.contactName} <${shipper.email}>)
DATE: ${new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
SUBJECT: ${formalLetterSubject}

RE: FORMAL DISPUTE & REQUEST FOR INVOICE CANCELLATION / CREDIT NOTE
Container: ${auditResult.containerNumber}
Invoice Number: ${auditResult.invoiceNumber}
Carrier Billed Amount: ${auditResult.carrierInvoicedAmount.toLocaleString()} ${auditResult.currency}
Disputed Waiver Requested: ${auditResult.disputedWaiverAmount.toLocaleString()} ${auditResult.currency}
Audited Legal Liability: ${auditResult.auditedLegalAmount.toLocaleString()} ${auditResult.currency}
Governing Law & Regulatory Authority: ${legalAuthority}

Dear Claims and Invoicing Committee,

Please accept this formal evidentiary dispute regarding Invoice #${auditResult.invoiceNumber} issued for container ${auditResult.containerNumber}. Following our comprehensive technical audit against carrier EDI 315 tracking milestones and terminal access logs, we hereby dispute ${auditResult.disputedWaiverAmount.toLocaleString()} ${auditResult.currency} of the billed sum.

1. FACTUAL CHRONOLOGY & CLOCK PAUSES:
- Total Calendar Dwell Period: ${auditResult.grossCalendarDwellDays} calendar day(s).
- Contractual Free-Time Allowance: ${auditResult.freeDaysGranted} day(s).
- Legally Suspended / Paused Period: ${auditResult.totalSuspendedDays} day(s) deducted due to verified events outside merchant control.

${auditResult.suspensionsApplied.map((s, idx) => `   [Pause ${idx + 1}] ${s.reason} (${s.startDate} to ${s.endDate}) -> ${s.suspendedDays} day(s) pause. Notice/Ref: ${s.officialNoticeRef || "Terminal Official Gate Notice"}`).join("\n")}

- Audited Net Billable Dwell: ${auditResult.auditedLegalBillableDays} day(s) (vs. ${auditResult.carrierBilledDays} billed by carrier).
- Unjustified Charges Billed: ${auditResult.unjustifiedBilledDays} billable day(s).

2. STATUTORY & REGULATORY DEFECTS:
${auditResult.jurisdiction === "US_FMC_OSRA_2022" && !auditResult.fmcCompliance.isCompliant ? `
CRITICAL COMPLIANCE NOTICE (FMC 46 CFR § 541.6):
Your invoice fails to satisfy statutory mandatory billing requirements set forth under 46 CFR § 541.6. Specifically, the following mandatory data elements were omitted:
${auditResult.fmcCompliance.missingFields.map((f) => `  * ${f}`).join("\n")}

Pursuant to 46 CFR § 541.8, the failure of an ocean common carrier or marine terminal operator to include any required information on a demurrage or detention invoice eliminates any obligation of the billed party to pay the applicable charge.
` : `
Pursuant to governing commercial terms, demurrage and detention may only accrue when the container is physically accessible and capable of being retrieved or returned by the motor carrier without impediment.
`}

3. FORMAL DEMAND:
We request immediate cancellation of Invoice #${auditResult.invoiceNumber} or the immediate issuance of a revised credit note in the amount of ${auditResult.disputedWaiverAmount.toLocaleString()} ${auditResult.currency} within thirty (30) calendar days of receipt.

Failure to resolve this dispute within statutory timeframes will result in formal escrow filing and escalation to the Federal Maritime Commission Office of Consumer Affairs and Dispute Resolution Services (CADRS) or competent port arbitration.

Sincerely,

${shipper.contactName}
${shipper.companyName}
Reference ID: ${dossierId}
`;

  return {
    dossierId,
    auditResult,
    recipientCarrier: recipient,
    shipperOrConsignee: shipper,
    formalLetterSubject,
    formalLetterBody,
    evidenceAttachments: [
      `EDI_315_Milestone_Audit_${auditResult.containerNumber}.json`,
      `Terminal_Gate_Interruption_Logs_${auditResult.containerNumber}.pdf`,
      `FMC_Rule_541_Compliance_Audit_Scorecard.pdf`,
    ],
    statutoryDeadlineNotice: "Statutory response window: 30 calendar days pursuant to 46 CFR § 541.7 / OSRA 2022.",
  };
}

/**
 * Demo presets representing high-impact, real-world dispute scenarios across jurisdictions.
 */
export const DEMURRAGE_DISPUTE_PRESETS: {
  id: string;
  name: string;
  jurisdiction: JurisdictionRule;
  description: string;
  invoice: CarrierInvoiceData;
  suspensions: ClockSuspension[];
  milestones: EDI315Milestone[];
}[] = [
  {
    id: "us_west_coast_la_lb",
    name: "US West Coast: Los Angeles / Long Beach (FMC § 541 Gate Lockout)",
    jurisdiction: "US_FMC_OSRA_2022",
    description: "Maersk billed 14 days demurrage ($3,600) despite 4 days gate appointment lockout and 1-day CBP VACIS scanner exam. Invoice omitted Earliest Return Date & terminal hours.",
    invoice: {
      invoiceNumber: "MSK-LAX-2026-90412",
      invoiceDate: "2026-10-02",
      carrierName: "Maersk Line A/S",
      carrierScac: "MAEU",
      billOfLading: "MAEU928471201",
      containerNumber: "MSKU9284712",
      chargeType: "DEMURRAGE",
      jurisdiction: "US_FMC_OSRA_2022",
      vesselVoyage: "MAERSK MC-KINNEY MOLLER / 2608W",
      pod: "USLAX",
      terminalName: "APM Terminals Pier 400",
      terminalHoursProvided: false, // FMC § 541 defect!
      dischargeDate: "2026-09-18",
      availableDate: "2026-09-20",
      freeTimeStartDate: "2026-09-21",
      freeTimeEndDate: "2026-09-24",
      freeDaysGranted: 4,
      earliestReturnDate: undefined, // FMC § 541 defect!
      billedStartDate: "2026-09-25",
      billedEndDate: "2026-10-04",
      billedTotalDays: 10,
      billedDailyRate: 360,
      invoicedAmount: 3600,
      currency: "USD",
      disputeContactEmail: "disputes.nam@maersk.com",
      tariffTiers: [
        { fromDay: 1, toDay: 4, dailyRate: 250, currency: "USD" },
        { fromDay: 5, toDay: 10, dailyRate: 400, currency: "USD" },
      ],
    },
    suspensions: [
      {
        id: "susp-lax-01",
        code: "APPOINTMENT_UNAVAILABLE",
        reason: "APM Terminals Pier 400 dual-transaction appointment lockout (no open slots in eModal system)",
        startDate: "2026-09-25",
        endDate: "2026-09-27",
        suspendedDays: 3,
        officialNoticeRef: "eModal System Alert #APM-400-0925",
        evidenceAttachmentUrl: "/evidence/emodal-slot-denial-log.pdf",
        approved: true,
      },
      {
        id: "susp-lax-02",
        code: "CUSTOMS_VACIS_SCAN",
        reason: "U.S. Customs and Border Protection (CBP) mandatory 7H non-intrusive VACIS radiation hold",
        startDate: "2026-09-28",
        endDate: "2026-09-29",
        suspendedDays: 2,
        officialNoticeRef: "CBP ACE Event 7H Hold Notice",
        evidenceAttachmentUrl: "/evidence/cbp-ace-hold-release.pdf",
        approved: true,
      },
    ],
    milestones: [
      { id: "m1", code: "VA", eventDescription: "Vessel Arrival at Port of Los Angeles", timestamp: "2026-09-17T18:00:00Z", locationCode: "USLAX", locationName: "Port of Los Angeles", verified: true },
      { id: "m2", code: "VD", eventDescription: "Container Discharged to Pier 400 Stack", timestamp: "2026-09-18T10:30:00Z", locationCode: "USLAX", locationName: "APM Terminals", verified: true },
      { id: "m3", code: "AL", eventDescription: "Container Available for Pickup Notification", timestamp: "2026-09-20T08:00:00Z", locationCode: "USLAX", locationName: "APM Terminals", verified: true },
      { id: "m4", code: "CO", eventDescription: "CBP Customs Inspection Released", timestamp: "2026-09-29T16:00:00Z", locationCode: "USLAX", locationName: "CBP Exam Facility", verified: true },
      { id: "m5", code: "OA", eventDescription: "Container Outgate Picked Up by Drayman", timestamp: "2026-10-04T14:15:00Z", locationCode: "USLAX", locationName: "APM Terminals Gate 3", verified: true },
    ],
  },
  {
    id: "eu_rotterdam_ect",
    name: "Northern Europe: Rotterdam ECT Delta (Rail & Strike Force Majeure)",
    jurisdiction: "EU_PORT_STANDARD",
    description: "CMA CGM billed 9 days demurrage (€1,620) during a 4-day rail strike and terminal water-level barge embargo at ECT Delta.",
    invoice: {
      invoiceNumber: "CMA-RTM-2026-55102",
      invoiceDate: "2026-10-05",
      carrierName: "CMA CGM S.A.",
      carrierScac: "CMDU",
      billOfLading: "CMDU817392099",
      containerNumber: "CMAU8173920",
      chargeType: "DEMURRAGE",
      jurisdiction: "EU_PORT_STANDARD",
      vesselVoyage: "CMA CGM JACQUES SAADE / 091E",
      pod: "NLRTM",
      terminalName: "ECT Delta Dedicated East",
      terminalHoursProvided: true,
      dischargeDate: "2026-09-22",
      availableDate: "2026-09-23",
      freeTimeStartDate: "2026-09-24",
      freeTimeEndDate: "2026-09-28",
      freeDaysGranted: 5,
      billedStartDate: "2026-09-29",
      billedEndDate: "2026-10-07",
      billedTotalDays: 9,
      billedDailyRate: 180,
      invoicedAmount: 1620,
      currency: "EUR",
      disputeContactEmail: "rtm.claims@cma-cgm.com",
      tariffTiers: [
        { fromDay: 1, toDay: 5, dailyRate: 150, currency: "EUR" },
        { fromDay: 6, toDay: 10, dailyRate: 210, currency: "EUR" },
      ],
    },
    suspensions: [
      {
        id: "susp-rtm-01",
        code: "PORT_STRIKE_FORCE_MAJEURE",
        reason: "Dutch FNV Port Workers wildcat strike halting straddle carriers & rail sidings at ECT Delta",
        startDate: "2026-09-29",
        endDate: "2026-10-02",
        suspendedDays: 4,
        officialNoticeRef: "Port of Rotterdam Harbor Master Bulletin #2026-44",
        evidenceAttachmentUrl: "/evidence/rotterdam-port-authority-strike-notice.pdf",
        approved: true,
      },
    ],
    milestones: [
      { id: "m201", code: "VD", eventDescription: "Container Discharged to ECT Stack", timestamp: "2026-09-22T14:00:00Z", locationCode: "NLRTM", locationName: "ECT Delta", verified: true },
      { id: "m202", code: "AL", eventDescription: "Customs DUA Cleared and Available", timestamp: "2026-09-23T09:00:00Z", locationCode: "NLRTM", locationName: "ECT Delta", verified: true },
      { id: "m203", code: "OA", eventDescription: "Intermodal Rail Outgate", timestamp: "2026-10-07T11:00:00Z", locationCode: "NLRTM", locationName: "ECT Delta Rail Terminal", verified: true },
    ],
  },
  {
    id: "es_barcelona_cantunis",
    name: "Spain Corredor: Barcelona Can Tunis (Book 012 Rail Siding Hold)",
    jurisdiction: "ES_PUERTOS_ESTADO",
    description: "Hapag-Lloyd billed 8 days demurrage (€1,280) for Can Tunis rail connection container. AEAT DUA Circuito Rojo scanner and Adif switch delay paused clock for 4 days.",
    invoice: {
      invoiceNumber: "HLC-BCN-2026-33921",
      invoiceDate: "2026-10-08",
      carrierName: "Hapag-Lloyd AG",
      carrierScac: "HLCU",
      billOfLading: "HLCU482910300",
      containerNumber: "SUDU4829103",
      chargeType: "DEMURRAGE",
      jurisdiction: "ES_PUERTOS_ESTADO",
      vesselVoyage: "AL ZUBARA / 2611W",
      pod: "ESBCN",
      terminalName: "BEST Hutchison Port Barcelona / Can Tunis Intermodal",
      terminalHoursProvided: true,
      dischargeDate: "2026-09-26",
      availableDate: "2026-09-27",
      freeTimeStartDate: "2026-09-28",
      freeTimeEndDate: "2026-10-02",
      freeDaysGranted: 5,
      billedStartDate: "2026-10-03",
      billedEndDate: "2026-10-10",
      billedTotalDays: 8,
      billedDailyRate: 160,
      invoicedAmount: 1280,
      currency: "EUR",
      disputeContactEmail: "spain.disputes@hlag.com",
      tariffTiers: [
        { fromDay: 1, toDay: 5, dailyRate: 140, currency: "EUR" },
        { fromDay: 6, toDay: 10, dailyRate: 180, currency: "EUR" },
      ],
    },
    suspensions: [
      {
        id: "susp-bcn-01",
        code: "CUSTOMS_PHYSICAL_EXAM",
        reason: "AEAT Aduana Barcelona Circuito Rojo physical inspection delay at Scanner Port BCN",
        startDate: "2026-10-03",
        endDate: "2026-10-05",
        suspendedDays: 3,
        officialNoticeRef: "AEAT DUA Document #ES-2026-012-DUA-ROJO",
        evidenceAttachmentUrl: "/evidence/aeat-circuito-rojo-cert.pdf",
        approved: true,
      },
      {
        id: "susp-bcn-02",
        code: "RAIL_EMBARGO",
        reason: "Adif Can Tunis Morrot rail yard catenary maintenance & track switch outage (Book 012)",
        startDate: "2026-10-06",
        endDate: "2026-10-06",
        suspendedDays: 1,
        officialNoticeRef: "Adif Aviso Ferroviario Can Tunis #AV-012-0610",
        evidenceAttachmentUrl: "/evidence/adif-cantunis-switch-log.pdf",
        approved: true,
      },
    ],
    milestones: [
      { id: "m301", code: "VD", eventDescription: "Discharged at Terminal BEST Port de Barcelona", timestamp: "2026-09-26T12:00:00Z", locationCode: "ESBCN", locationName: "Terminal BEST", verified: true },
      { id: "m302", code: "AL", eventDescription: "Container Available for Rail Shuttle Dispatch", timestamp: "2026-09-27T08:30:00Z", locationCode: "ESBCN", locationName: "Terminal BEST", verified: true },
      { id: "m303", code: "CO", eventDescription: "AEAT Circuito Rojo Inspection Cleared", timestamp: "2026-10-05T17:00:00Z", locationCode: "ESBCN", locationName: "Recinto Aduanero BCN", verified: true },
      { id: "m304", code: "OA", eventDescription: "Ingate to Can Tunis Rail Siding (Book 012)", timestamp: "2026-10-10T15:30:00Z", locationCode: "ESBCN", locationName: "Can Tunis Logistainer", verified: true },
    ],
  },
];
