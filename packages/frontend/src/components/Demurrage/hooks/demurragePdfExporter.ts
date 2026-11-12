/**
 * @file demurragePdfExporter.ts
 * @description Statutory PDF dossier generator for FMC 46 CFR Part 541 / EU Port Rules demurrage disputes.
 * @module @atlas/frontend/components/Demurrage/hooks
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  CarrierInvoiceData,
  DemurrageAuditResult,
  DisputePack,
} from "@atlas/shared";

/**
 * Generates and downloads an official A4 PDF dispute resolution dossier.
 */
export function downloadDisputeDossierPdf(params: {
  auditResult: DemurrageAuditResult;
  currentInvoice: CarrierInvoiceData;
  disputePack: DisputePack;
  activeLetterBody: string;
}): void {
  const { auditResult, currentInvoice, disputePack, activeLetterBody } = params;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Header styling
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 36, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ATLAS LOGISTICS ENTERPRISE - DISPUTE RESOLUTION DOSSIER", 14, 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Statutory Notice | FMC 46 CFR Part 541 / EU Port Rules / RD 2/2011 | Ref: ${disputePack.dossierId}`,
    14,
    24,
  );
  doc.text(`Generated: ${new Date().toISOString()}`, 14, 30);

  // Summary Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("1. SUMMARY OF DISPUTED CHARGES & LEGAL RECONCILIATION", 14, 46);

  const summaryData = [
    ["Container Number", auditResult.containerNumber],
    [
      "Carrier Name & SCAC",
      `${auditResult.carrierName} (${currentInvoice.carrierScac})`,
    ],
    ["Carrier Invoice Number", auditResult.invoiceNumber],
    ["Governing Jurisdiction", auditResult.jurisdiction],
    ["Gross Calendar Dwell Days", `${auditResult.grossCalendarDwellDays} days`],
    [
      "Legally Suspended Clock Days",
      `${auditResult.totalSuspendedDays} days (Deducted)`,
    ],
    ["Net Audited Dwell Days", `${auditResult.netActualDwellDays} days`],
    ["Contractual Free Days Granted", `${auditResult.freeDaysGranted} days`],
    ["Carrier Billed Billable Days", `${auditResult.carrierBilledDays} days`],
    [
      "Audited Legal Billable Days",
      `${auditResult.auditedLegalBillableDays} days`,
    ],
    [
      "Carrier Invoiced Amount",
      `${auditResult.carrierInvoicedAmount.toLocaleString()} ${auditResult.currency}`,
    ],
    [
      "Audited Legal Amount",
      `${auditResult.auditedLegalAmount.toLocaleString()} ${auditResult.currency}`,
    ],
    [
      "DISPUTED WAIVER CLAIMED",
      `${auditResult.disputedWaiverAmount.toLocaleString()} ${auditResult.currency} (${auditResult.savingsPercentage}% Waiver)`,
    ],
    ["Audit Final Determination", auditResult.auditStatus],
  ];

  autoTable(doc, {
    startY: 50,
    head: [["Audit Metric / Parameter", "Verified Value & Status"]],
    body: summaryData,
    theme: "striped",
    styles: { fontSize: 8.5, cellPadding: 2.2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
  });

  // Suspensions Table
  const nextY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(
    "2. ITEMIZED CLOCK PAUSE SUSPENSIONS & VERIFIED EVENT PROOFS",
    14,
    nextY,
  );

  const suspensionRows = auditResult.suspensionsApplied.map((s) => [
    s.code,
    s.reason,
    `${s.startDate} to ${s.endDate}`,
    `${s.suspendedDays} days`,
    s.officialNoticeRef || "Verified Terminal Gate Log",
  ]);

  autoTable(doc, {
    startY: nextY + 4,
    head: [
      [
        "Reason Code",
        "Event Description",
        "Period",
        "Deduction",
        "Official Authority Reference",
      ],
    ],
    body: suspensionRows,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255] },
  });

  // Formal Demand Text
  const letterY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(
    "3. STATUTORY DEMAND & NOTICE OF LEGAL INSUFFICIENT BILLING",
    14,
    letterY,
  );

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const splitText = doc.splitTextToSize(activeLetterBody, 182);
  doc.text(splitText.slice(0, 32), 14, letterY + 6);

  doc.save(`Demurrage_Dispute_Dossier_${auditResult.containerNumber}.pdf`);
}
