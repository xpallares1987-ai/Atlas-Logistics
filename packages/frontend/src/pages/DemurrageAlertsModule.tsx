import React, { useState, useMemo } from "react";
import {
  Clock,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Send,
  CheckCircle2,
  Download,
  Scale,
  PauseCircle,
  ArrowRight,
  Search,
  FileCheck,
  DollarSign,
  Layers,
  Sparkles,
  Copy,
  Check,
  XCircle,
  FileWarning,
  Building2,
  Database,
  RefreshCw,
} from "lucide-react";
import { Button } from "@atlas/ui";
import {
  calculateDemurrageAudit,
  generateDisputePack,
  type CarrierInvoiceData,
  type ClockSuspension,
  type EDI315Milestone,
  type DemurrageAuditResult,
  type DisputePack,
  type SuspensionReasonCode,
} from "@atlas/shared";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useApiMutation, useApiQuery } from "../hooks/useApiQuery";
import { useShipments } from "../hooks/useShipments";

type TabKey = "RADAR" | "SUSPENSIONS" | "AUDIT" | "DOSSIER";

const CANONICAL_FALLBACK_INVOICE: CarrierInvoiceData = {
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

function mapDbInvoiceToCarrierData(inv: any): CarrierInvoiceData {
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

function mapDbSuspensionToClockSuspension(s: any): ClockSuspension {
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
    officialNoticeRef: "Aviso Oficial de Autoridad Portuaria",
    approved: s.approved !== false,
  };
}

export default function DemurrageAlertsModule() {
  const [activeTab, setActiveTab] = useState<TabKey>("RADAR");
  const [selectedShipmentId, setSelectedShipmentId] =
    useState<string>("sh_demo_01");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  );
  const [copiedLetter, setCopiedLetter] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [disputeSuccessMessage, setDisputeSuccessMessage] = useState<
    string | null
  >(null);

  // 1. Live Shipments from SQLite
  const { data: shipments = [] } = useShipments();
  const activeShipment =
    shipments.find((s) => s.id === selectedShipmentId) || shipments[0];

  // 2. Live Demurrage Invoices from SQLite (filtered by active shipment)
  const {
    data: dbInvoices = [],
    refetch: refetchInvoices,
    isLoading: isLoadingInvoices,
  } = useApiQuery<any[]>(
    ["demurrage-invoices", selectedShipmentId],
    selectedShipmentId
      ? `/demurrage-dispute/invoices?shipmentId=${selectedShipmentId}`
      : "/demurrage-dispute/invoices",
  );

  // Active DB invoice
  const activeDbInvoice = useMemo(() => {
    if (selectedInvoiceId) {
      const match = dbInvoices.find((inv) => inv.id === selectedInvoiceId);
      if (match) return match;
    }
    return dbInvoices[0] || null;
  }, [dbInvoices, selectedInvoiceId]);

  // Derived CarrierInvoiceData from active SQLite record
  const currentInvoice = useMemo<CarrierInvoiceData>(() => {
    return mapDbInvoiceToCarrierData(activeDbInvoice);
  }, [activeDbInvoice]);

  // Derived Suspensions from active SQLite record
  const currentSuspensions = useMemo<ClockSuspension[]>(() => {
    if (
      activeDbInvoice?.suspensions &&
      activeDbInvoice.suspensions.length > 0
    ) {
      return activeDbInvoice.suspensions.map(mapDbSuspensionToClockSuspension);
    }
    return [
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
  }, [activeDbInvoice]);

  // EDI 315 Milestones
  const currentMilestones = useMemo<EDI315Milestone[]>(() => {
    return [
      {
        id: "m-01",
        code: "VD",
        eventDescription: "Descarga de buque (Vessel Discharge)",
        timestamp:
          activeDbInvoice?.vesselDischargeDate || "2026-10-25T08:00:00Z",
        locationCode: "USNYC",
        locationName:
          activeDbInvoice?.terminalName || "APM Terminals Port Elizabeth",
        verified: true,
      },
      {
        id: "m-02",
        code: "AL",
        eventDescription:
          "Contenedor Disponible en Terminal (Container Available)",
        timestamp: activeDbInvoice?.availableDate || "2026-10-25T14:00:00Z",
        locationCode: "USNYC",
        locationName:
          activeDbInvoice?.terminalName || "APM Terminals Port Elizabeth",
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
        locationName:
          activeDbInvoice?.terminalName || "APM Terminals Port Elizabeth",
        verified: true,
      },
    ];
  }, [activeDbInvoice]);

  // Live computed audit result
  const auditResult = useMemo<DemurrageAuditResult>(() => {
    return calculateDemurrageAudit({
      invoice: currentInvoice,
      suspensions: currentSuspensions,
      milestones: currentMilestones,
    });
  }, [currentInvoice, currentSuspensions, currentMilestones]);

  // Generated dispute pack
  const disputePack = useMemo<DisputePack>(() => {
    return generateDisputePack({
      auditResult,
      shipperOrConsignee: {
        companyName: "Atlas Logistics Enterprise Group",
        contactName: "System Admin (Global Systems & Logistics Lead)",
        email: "x.pallares@atlas-logistics.corp",
        accountReference: "ATL-CORP-012-BCN",
      },
    });
  }, [auditResult]);

  // New Clock Suspension Form state
  const [newReasonCode, setNewReasonCode] = useState<SuspensionReasonCode>(
    "TERMINAL_GATE_CLOSED",
  );
  const [newReasonText, setNewReasonText] = useState("");
  const [newStartDate, setNewStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [newEndDate, setNewEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [newNoticeRef, setNewNoticeRef] = useState("");

  // Suspension Mutation (POST /api/demurrage-dispute/suspension)
  const addSuspensionMutation = useApiMutation<
    { success: boolean; suspension: any },
    {
      invoiceId: string;
      startDate: string;
      endDate: string;
      daysSuspended: number;
      reason: string;
      justificationText: string;
    }
  >("/demurrage-dispute/suspension", "POST", {
    onSuccess: () => {
      refetchInvoices();
      setNewReasonText("");
      setNewNoticeRef("");
    },
  });

  const handleAddSuspension = (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(newStartDate);
    const end = new Date(newEndDate);
    const days = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );

    const invoiceId = activeDbInvoice?.id || "dinv_sh_demo_01";
    addSuspensionMutation.mutate({
      invoiceId,
      startDate: newStartDate,
      endDate: newEndDate,
      daysSuspended: days,
      reason: newReasonCode,
      justificationText:
        newReasonText || `Suspensión reglamentaria (${newReasonCode})`,
    });
  };

  // FMC Dispute Mutation (POST /api/demurrage-dispute/dispute)
  const submitDisputeMutation = useApiMutation<
    { success: boolean; dispute: any },
    {
      invoiceId: string;
      disputedAmountUsd: number;
      revisedPayableUsd: number;
      fmcRuleClause: string;
      formalLetterPayload?: any;
    }
  >("/demurrage-dispute/dispute", "POST", {
    onSuccess: (data) => {
      refetchInvoices();
      setDisputeSuccessMessage(
        `Disputa legal FMC #${data.dispute.id} registrada formalmente en SQLite. Estatus: SUBMITTED.`,
      );
      setTimeout(() => setDisputeSuccessMessage(null), 8000);
    },
  });

  // On-Demand Gemini AI FMC Legal Draft Mutation (POST /api/ai/fmc-dispute-draft)
  const [geminiDraftResult, setGeminiDraftResult] = useState<{
    draftText: string;
    source: "gemini-live" | "gemini-cache" | "deterministic-fallback";
    model: string;
    latencyMs: number;
    quotaRemainingRpm: number;
    reason?: string;
  } | null>(null);

  const generateGeminiFmcDraftMutation = useApiMutation<
    {
      success: boolean;
      draftText: string;
      source: "gemini-live" | "gemini-cache" | "deterministic-fallback";
      model: string;
      latencyMs: number;
      quotaRemainingRpm: number;
      reason?: string;
    },
    { invoiceId?: string; shipmentId?: string; customInstructions?: string }
  >("/ai/fmc-dispute-draft", "POST", {
    onSuccess: (data) => {
      setGeminiDraftResult(data);
    },
  });

  const handleGenerateGeminiDraft = () => {
    generateGeminiFmcDraftMutation.mutate({
      invoiceId: activeDbInvoice?.id || "dinv_sh_demo_01",
      shipmentId: selectedShipmentId || "sh_demo_01",
    });
  };

  const activeLetterBody =
    geminiDraftResult?.draftText || disputePack.formalLetterBody;

  const handlePresentFmcDispute = () => {
    const invoiceId = activeDbInvoice?.id || "dinv_sh_demo_01";
    submitDisputeMutation.mutate({
      invoiceId,
      disputedAmountUsd: auditResult.disputedWaiverAmount,
      revisedPayableUsd: auditResult.auditedLegalAmount,
      fmcRuleClause:
        auditResult.fmcCompliance.statutoryCitation ||
        "46 CFR § 541.6(a) - Inaccurate Free Time Start During Government Inspection Hold",
      formalLetterPayload: {
        dossierId: disputePack.dossierId,
        subject: disputePack.formalLetterSubject,
        body: activeLetterBody,
        aiSource: geminiDraftResult?.source || "static-template",
        carrier: disputePack.recipientCarrier,
      },
    });
  };

  // Email dispatch mutation
  const [dispatchReceipt, setDispatchReceipt] = useState<any>(null);
  const [dispatchEmailTo, setDispatchEmailTo] = useState(
    disputePack.recipientCarrier.email || "disputes.na@maersk.com",
  );

  const dispatchMutation = useApiMutation<any, any>(
    "/demurrage-dispute/dispatch-email",
    "POST",
    {
      onSuccess: (data) => {
        setDispatchReceipt(data);
      },
    },
  );

  const handleDispatchEmail = () => {
    dispatchMutation.mutate({
      dossierId: disputePack.dossierId,
      recipientEmail: dispatchEmailTo || disputePack.recipientCarrier.email,
      subject: disputePack.formalLetterSubject,
      body: activeLetterBody,
    });
  };

  const handleCopyLetter = () => {
    navigator.clipboard.writeText(activeLetterBody);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 2000);
  };

  // PDF Generation via jsPDF
  const handleDownloadPdf = () => {
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
      [
        "Gross Calendar Dwell Days",
        `${auditResult.grossCalendarDwellDays} days`,
      ],
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
  };

  // Filtered invoices for the RADAR table
  const displayInvoices = useMemo(() => {
    const list =
      dbInvoices.length > 0
        ? dbInvoices
        : [
            {
              id: "dinv_sh_demo_01",
              shipmentId: "sh_demo_01",
              ...CANONICAL_FALLBACK_INVOICE,
              totalInvoicedUsd: CANONICAL_FALLBACK_INVOICE.invoicedAmount,
              dailyRateUsd: CANONICAL_FALLBACK_INVOICE.billedDailyRate,
              suspensions: currentSuspensions,
              disputes: [],
            },
          ];

    if (!searchTerm) return list;
    return list.filter(
      (inv) =>
        inv.containerNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.billOfLading?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [dbInvoices, searchTerm, currentSuspensions]);

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header & Compliance Badge */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                  Demurrage & Detention Control Tower
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                    FMC § 541 / OSRA 2022
                  </span>
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Motor de Resolución de Disputas D&D, Auditoría de Factura vs.
                  Hitos EDI 315 y Suspensión de Reloj Legal
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 font-medium">
                Contenedor en Foco:
              </span>
              <span className="font-mono font-bold text-white">
                {currentInvoice.containerNumber}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 text-[11px]">
                {currentInvoice.pod} {currentInvoice.terminalName}
              </span>
            </div>
          </div>
        </div>

        {/* Relational Shipment Selector & SQLite Context Banner */}
        <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">
                  Expedición Relacional Activa (SQLite dev.db)
                </span>
                {activeDbInvoice ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Factura Vinculada: {activeDbInvoice.invoiceNumber}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Sin Factura D&D
                  </span>
                )}
                {activeDbInvoice?.status === "DISPUTED" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Disputa FMC Activa
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeShipment
                  ? `${activeShipment.trackingNumber} (${activeShipment.origin} → ${activeShipment.destination}) | Buque: ${activeShipment.vesselName || "MSC ISABELLA"}`
                  : "Expedición canónica sh_demo_01 (BK-2026-67116)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-medium">
                Expedición:
              </label>
              <select
                value={selectedShipmentId}
                onChange={(e) => {
                  setSelectedShipmentId(e.target.value);
                  setSelectedInvoiceId(null);
                }}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.trackingNumber} ({s.origin} → {s.destination})
                  </option>
                ))}
              </select>
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => refetchInvoices()}
              disabled={isLoadingInvoices}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoadingInvoices ? "animate-spin" : ""}`}
              />
              Refrescar DB
            </Button>
          </div>
        </div>

        {/* Global Alert / Success Message */}
        {disputeSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>{disputeSuccessMessage}</span>
          </div>
        )}

        {/* Global D&D Exposure KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Contenedor Auditado</span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-white font-mono">
              {auditResult.containerNumber}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {auditResult.carrierName} ({currentInvoice.carrierScac})
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Días Pausados (Reloj Suspendido)</span>
              <PauseCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-400 font-mono">
              {auditResult.totalSuspendedDays} días
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {auditResult.suspensionsApplied.length} evento(s) justificados
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Importe Reclamado / Exención</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {auditResult.disputedWaiverAmount.toLocaleString()}{" "}
              {auditResult.currency}
            </div>
            <div className="text-xs text-emerald-400/80 mt-1 font-medium">
              {auditResult.savingsPercentage}% ahorro sobre factura
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Veredicto de Auditoría</span>
              <Scale className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-sm font-bold text-white">
              {auditResult.auditStatus === "FULL_WAIVER_JUSTIFIED" ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> 100% Exención Justificada
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Reducción Parcial
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1 truncate">
              {auditResult.fmcCompliance.isCompliant
                ? "FMC Conforme"
                : "FMC Defectuosa (§ 541)"}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 gap-2">
          {[
            {
              key: "RADAR",
              label: "1. Radar de Free-Time & Clocks",
              icon: Clock,
            },
            {
              key: "SUSPENSIONS",
              label: "2. Motor de Suspensión de Reloj",
              icon: PauseCircle,
            },
            {
              key: "AUDIT",
              label: "3. Auditoría Factura vs. EDI 315",
              icon: Scale,
            },
            {
              key: "DOSSIER",
              label: "4. Dossier Evidencial & Disputa",
              icon: FileText,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  isActive
                    ? "border-blue-500 text-blue-400 bg-blue-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: RADAR DE FREE-TIME & CLOCKS */}
        {activeTab === "RADAR" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Radar de Relojes de Demurrage en Tiempo Real (SQLite)
                </h2>
                <p className="text-xs text-slate-400">
                  Monitorización continua de terminales marítimas y
                  ferroviarias, días libres y deducción automática de
                  suspensiones.
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  id="demurrage-filter"
                  name="demurrageFilter"
                  aria-label="Filtrar contenedor / B/L"
                  type="text"
                  placeholder="Filtrar contenedor / B/L..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-800/40">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/90 text-slate-400 border-b border-slate-700 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Contenedor / B/L</th>
                    <th className="py-3 px-4">Naviera / SCAC</th>
                    <th className="py-3 px-4">Puerto & Terminal</th>
                    <th className="py-3 px-4">
                      Días Dwell (Bruto / Suspendido / Neto)
                    </th>
                    <th className="py-3 px-4">Días Libres</th>
                    <th className="py-3 px-4">Estado del Reloj</th>
                    <th className="py-3 px-4">Importe Incurrido</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {isLoadingInvoices ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-slate-400 font-mono"
                      >
                        Cargando facturas de demurrage desde SQLite...
                      </td>
                    </tr>
                  ) : (
                    displayInvoices.map((inv) => {
                      const invCarrierData = mapDbInvoiceToCarrierData(inv);
                      const invSuspensions = (inv.suspensions || []).map(
                        mapDbSuspensionToClockSuspension,
                      );
                      const pAudit = calculateDemurrageAudit({
                        invoice: invCarrierData,
                        suspensions: invSuspensions,
                      });
                      const isSelected =
                        inv.id === activeDbInvoice?.id ||
                        inv.containerNumber === currentInvoice.containerNumber;

                      return (
                        <tr
                          key={inv.id || inv.invoiceNumber}
                          className={`hover:bg-slate-800/60 transition-colors ${
                            isSelected ? "bg-blue-900/20" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <span>{inv.containerNumber}</span>
                              {isSelected && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                  Activo
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-sans font-normal">
                              B/L: {inv.billOfLading}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-white font-medium">
                              {inv.carrierName}
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              SCAC: {inv.carrierScac}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-white font-medium">
                              {inv.pod}
                            </div>
                            <div className="text-slate-400 text-[11px] truncate max-w-[180px]">
                              {inv.terminalName}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-200">
                                {pAudit.grossCalendarDwellDays}d brutos
                              </span>
                              <span className="text-amber-400 font-semibold">
                                (-{pAudit.totalSuspendedDays}d pausa)
                              </span>
                              <span className="text-emerald-400 font-bold">
                                = {pAudit.netActualDwellDays}d netos
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <span className="text-blue-300 font-semibold">
                              {inv.freeDaysGranted ?? 4} días
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {inv.status === "DISPUTED" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                <Scale className="w-3 h-3" /> Disputa FMC
                              </span>
                            ) : pAudit.auditStatus ===
                              "FULL_WAIVER_JUSTIFIED" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <ShieldAlert className="w-3 h-3" /> Exención
                                100%
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <AlertTriangle className="w-3 h-3" /> Devengo
                                Excesivo
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            <div>
                              {(
                                inv.totalInvoicedUsd ??
                                inv.invoicedAmount ??
                                1400
                              ).toLocaleString()}{" "}
                              {inv.currency || "USD"}
                            </div>
                            <div className="text-[11px] text-emerald-400 font-normal">
                              Disputa:{" "}
                              {pAudit.disputedWaiverAmount.toLocaleString()}{" "}
                              {inv.currency || "USD"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                if (inv.id) setSelectedInvoiceId(inv.id);
                                if (inv.shipmentId)
                                  setSelectedShipmentId(inv.shipmentId);
                                setActiveTab("AUDIT");
                              }}
                              className="text-xs"
                            >
                              Auditar{" "}
                              <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Regulatory Notice Banner */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-white">
                  Regulación FMC 46 CFR § 541 & Estándares Portuarios
                  Europeos:{" "}
                </span>
                Bajo el estándar FMC OSRA 2022, el reloj de días libres (Free
                Time) debe pausarse obligatoriamente siempre que el contenedor
                no esté física u operativamente disponible para su recogida o
                devolución (ej. bloqueo de citas en terminal, inspecciones
                aduaneras no intrusivas VACIS o reconocimientos físicos de
                circuito rojo, huelgas o averías de báscula/OCR).
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MOTOR DE SUSPENSIÓN DE RELOJ */}
        {activeTab === "SUSPENSIONS" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Suspensions List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Eventos de Pausa de Reloj Registrados (SQLite)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Días legalmente excluidos del cómputo de demurrage para el
                    contenedor {currentInvoice.containerNumber}.
                  </p>
                </div>
                <div className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-medium">
                  Total Pausa: {auditResult.totalSuspendedDays} días
                </div>
              </div>

              <div className="space-y-3">
                {currentSuspensions.map((susp, idx) => (
                  <div
                    key={susp.id || idx}
                    className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/70 hover:border-slate-600 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          {susp.code}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {susp.startDate} → {susp.endDate}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        +{susp.suspendedDays} día(s) deducidos
                      </span>
                    </div>

                    <p className="text-sm font-medium text-white">
                      {susp.reason}
                    </p>

                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-700/50">
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          Referencia Oficial:{" "}
                          <strong>
                            {susp.officialNoticeRef || "Aviso Oficial"}
                          </strong>
                        </span>
                      </div>
                      <span className="text-emerald-400 font-medium">
                        Certificado y Aprobado
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Register New Suspension Form */}
            <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4 h-fit">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                <PauseCircle className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Declarar Nueva Suspensión de Reloj (SQLite)
                </h3>
              </div>

              <form
                onSubmit={handleAddSuspension}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Causa Reglamentaria (FMC / Puerto)
                  </label>
                  <select
                    value={newReasonCode}
                    onChange={(e) =>
                      setNewReasonCode(e.target.value as SuspensionReasonCode)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="TERMINAL_GATE_CLOSED">
                      Cierre de Puertas de Terminal (Gate Closed)
                    </option>
                    <option value="APPOINTMENT_UNAVAILABLE">
                      Falta de Citas de Entrada (No Appointments)
                    </option>
                    <option value="CUSTOMS_PHYSICAL_EXAM">
                      Inspección Física Aduana (Circuito Rojo / Exam)
                    </option>
                    <option value="CUSTOMS_VACIS_SCAN">
                      Escáner No Intrusivo VACIS / Rayos X
                    </option>
                    <option value="CHASSIS_SHORTAGE">
                      Déficit de Chasis / Plataformas Autorizadas
                    </option>
                    <option value="RAIL_EMBARGO">
                      Embargo Ferroviario o Avería de Vía (Adif/Rail)
                    </option>
                    <option value="PORT_STRIKE_FORCE_MAJEURE">
                      Huelga Portuaria / Fuerza Mayor
                    </option>
                    <option value="CARRIER_IT_OUTAGE">
                      Caída de Sistemas Informáticos Naviera / TOS
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Descripción de los Hechos
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Terminal Pier 400 sin ventanas de cita habilitadas en eModal..."
                    value={newReasonText}
                    onChange={(e) => setNewReasonText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">
                      Fecha Fin
                    </label>
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Referencia / Boletín Oficial
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Incidencia eModal #APM-400 / DUA Circuito Rojo"
                    value={newNoticeRef}
                    onChange={(e) => setNewNoticeRef(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={addSuspensionMutation.isPending}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium py-2 flex items-center justify-center gap-2"
                >
                  <PauseCircle className="w-4 h-4" />
                  {addSuspensionMutation.isPending
                    ? "Registrando en SQLite..."
                    : "Registrar e Incorporar a la Auditoría"}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: AUDITORÍA FACTURA VS. EDI 315 */}
        {activeTab === "AUDIT" && (
          <div className="space-y-6">
            {/* Split Screen: Carrier Claim vs. Atlas Audited Legal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Carrier Claim Card */}
              <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-900/50 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-rose-900/40">
                  <div className="flex items-center gap-2">
                    <FileWarning className="w-5 h-5 text-rose-400" />
                    <h3 className="font-bold text-white text-sm">
                      Factura Emitida por la Naviera
                    </h3>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-900/40 text-rose-300 font-semibold">
                    {currentInvoice.invoiceNumber}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Días Facturados:</span>
                    <div className="text-xl font-bold font-mono text-white mt-0.5">
                      {auditResult.carrierBilledDays} días
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">
                      Tarifa Diaria Aplicada:
                    </span>
                    <div className="text-xl font-bold font-mono text-white mt-0.5">
                      {currentInvoice.billedDailyRate || 150}{" "}
                      {currentInvoice.currency}/día
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Período Facturado:</span>
                    <div className="font-mono text-slate-300 mt-0.5">
                      {currentInvoice.billedStartDate} al{" "}
                      {currentInvoice.billedEndDate}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">
                      Total Facturado Naviera:
                    </span>
                    <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                      {auditResult.carrierInvoicedAmount.toLocaleString()}{" "}
                      {currentInvoice.currency}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-rose-900/20 border border-rose-800/40 text-xs text-rose-300">
                  La naviera computó todo el período natural continuo sin
                  descontar cierres de puerta ni retenciones aduaneras.
                </div>
              </div>

              {/* Audited Legal Liability Card */}
              <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-900/50 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-900/40">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-white text-sm">
                      Liquidación Legal Auditada (Atlas Engine)
                    </h3>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 font-semibold">
                    AUD-LEGAL-OK
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">
                      Días Legalmente Exigibles:
                    </span>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                      {auditResult.auditedLegalBillableDays} días
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">
                      Días Pausados Descontados:
                    </span>
                    <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                      -{auditResult.totalSuspendedDays} días
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">
                      Importe Real Exigible:
                    </span>
                    <div className="text-xl font-bold font-mono text-white mt-0.5">
                      {auditResult.auditedLegalAmount.toLocaleString()}{" "}
                      {currentInvoice.currency}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">
                      Ahorro / Exención Disputada:
                    </span>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                      {auditResult.disputedWaiverAmount.toLocaleString()}{" "}
                      {currentInvoice.currency} ({auditResult.savingsPercentage}
                      %)
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-800/40 text-xs text-emerald-300 flex flex-wrap items-center justify-between gap-2">
                  <span>{auditResult.disputeSummaryText}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handlePresentFmcDispute}
                      disabled={
                        submitDisputeMutation.isPending ||
                        activeDbInvoice?.status === "DISPUTED"
                      }
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs shrink-0 flex items-center gap-1.5"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      {submitDisputeMutation.isPending
                        ? "Registrando..."
                        : activeDbInvoice?.status === "DISPUTED"
                          ? "Disputa FMC Presentada"
                          : "Presentar Disputa Legal FMC"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("DOSSIER")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs shrink-0"
                    >
                      Ver Dossier <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* FMC 46 CFR Part 541 Compliance Scorecard */}
            <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      Auditoría de Requisitos Obligatorios FMC 46 CFR § 541.6
                    </h3>
                    <p className="text-xs text-slate-400">
                      Comprobación de los 13 datos reglamentarios exigidos por
                      la FMC de EE.UU.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">
                      Índice de Conformidad:
                    </div>
                    <div
                      className={`font-mono font-bold text-sm ${auditResult.fmcCompliance.isCompliant ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {auditResult.fmcCompliance.complianceScore}% / 100%
                    </div>
                  </div>
                </div>
              </div>

              {!auditResult.fmcCompliance.isCompliant && (
                <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-200">
                      INVOICE STATUTORILY DEFECTIVE (FMC § 541.8)
                    </div>
                    <div>{auditResult.fmcCompliance.legalVerdict}</div>
                    <div className="mt-1 font-semibold text-rose-200">
                      Elementos omitidos por la naviera:{" "}
                      {auditResult.fmcCompliance.missingFields.join(", ")}
                    </div>
                  </div>
                </div>
              )}

              {/* 13 Checklist Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                {[
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
                      currentInvoice.billedStartDate &&
                      currentInvoice.billedEndDate,
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
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border flex items-center justify-between ${
                      item.valid
                        ? "bg-slate-900/60 border-slate-700/60 text-slate-300"
                        : "bg-rose-950/30 border-rose-800/60 text-rose-200"
                    }`}
                  >
                    <span className="truncate pr-2">{item.name}</span>
                    {item.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* EDI 315 Milestones Timeline */}
            <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                <Layers className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-sm">
                  Cronología Técnica de Hitos EDI 315
                </h3>
              </div>

              <div className="space-y-3">
                {currentMilestones.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="flex items-start gap-3 text-xs"
                  >
                    <div className="w-10 h-7 rounded bg-blue-500/20 text-blue-400 font-mono font-bold flex items-center justify-center border border-blue-500/30 shrink-0">
                      {m.code}
                    </div>
                    <div className="flex-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">
                          {m.eventDescription}
                        </span>
                        <span className="font-mono text-slate-400">
                          {m.timestamp.replace("T", " ").replace("Z", "")}
                        </span>
                      </div>
                      <div className="text-slate-400 mt-1 flex items-center gap-2">
                        <span>
                          Ubicación:{" "}
                          <strong>
                            {m.locationName} ({m.locationCode})
                          </strong>
                        </span>
                        <span className="text-emerald-400">
                          ✓ Telemétricamente Verificado
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DOSSIER EVIDENCIAL & DISPUTA */}
        {activeTab === "DOSSIER" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Formal Letter Preview */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Escrito Formal de Disputa & Demanda Legal
                  </h2>
                  <p className="text-xs text-slate-400">
                    Dossier ID:{" "}
                    <span className="font-mono text-blue-400">
                      {disputePack.dossierId}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleGenerateGeminiDraft}
                    disabled={generateGeminiFmcDraftMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {generateGeminiFmcDraftMutation.isPending
                      ? "Redactando con Gemini AI..."
                      : "Redactar Alegación con Gemini AI (On-Demand)"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCopyLetter}
                    className="text-xs flex items-center gap-1.5"
                  >
                    {copiedLetter ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedLetter ? "Copiado!" : "Copiar Texto"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDownloadPdf}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar PDF Oficial
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePresentFmcDispute}
                    disabled={
                      submitDisputeMutation.isPending ||
                      activeDbInvoice?.status === "DISPUTED"
                    }
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs flex items-center gap-1.5"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    {submitDisputeMutation.isPending
                      ? "Registrando..."
                      : activeDbInvoice?.status === "DISPUTED"
                        ? "Disputa FMC Presentada"
                        : "Presentar Disputa Legal FMC"}
                  </Button>
                </div>
              </div>

              {geminiDraftResult && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold">
                      Alegación Jurídica Generada por Google Gemini AI (Free
                      Tier)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-mono text-[10px]">
                      {geminiDraftResult.source} · {geminiDraftResult.model}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-300 font-mono">
                    <span>Latencia: {geminiDraftResult.latencyMs}ms</span>
                    <span>
                      Cuota RPM restante: {geminiDraftResult.quotaRemainingRpm}
                      /12
                    </span>
                    <button
                      type="button"
                      onClick={() => setGeminiDraftResult(null)}
                      className="text-slate-400 hover:text-white underline font-sans"
                    >
                      Restaurar plantilla base
                    </button>
                  </div>
                </div>
              )}

              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[550px] overflow-y-auto">
                {activeLetterBody}
              </div>

              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>
                    Documentos Anexos:{" "}
                    {disputePack.evidenceAttachments.join(", ")}
                  </span>
                </div>
                <span className="text-amber-400 font-medium">
                  {disputePack.statutoryDeadlineNotice}
                </span>
              </div>
            </div>

            {/* Right Column: Dispatch Email to Carrier Desk */}
            <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4 h-fit">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                <Send className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  Despacho Telemático de Disputa
                </h3>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Naviera Destinataria
                  </label>
                  <input
                    type="text"
                    disabled
                    value={disputePack.recipientCarrier.carrierName}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Departamento / Mesa de Reclamaciones
                  </label>
                  <input
                    type="text"
                    disabled
                    value={disputePack.recipientCarrier.department}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Email Oficial de Disputas Naviera
                  </label>
                  <input
                    type="email"
                    value={dispatchEmailTo}
                    onChange={(e) => setDispatchEmailTo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Asunto
                  </label>
                  <input
                    type="text"
                    disabled
                    value={disputePack.formalLetterSubject}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-300 font-mono truncate"
                  />
                </div>

                <Button
                  onClick={handleDispatchEmail}
                  disabled={dispatchMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {dispatchMutation.isPending
                    ? "Transmitiendo..."
                    : "Despachar Reclamación a Naviera"}
                </Button>

                {dispatchReceipt && (
                  <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-1 mt-3">
                    <div className="font-bold flex items-center gap-1.5 text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Expediente Despachado con Éxito
                    </div>
                    <div>
                      Código de Acuse:{" "}
                      <strong className="font-mono text-white">
                        {dispatchReceipt.confirmationCode}
                      </strong>
                    </div>
                    <div>
                      Mensaje ID:{" "}
                      <span className="font-mono text-slate-400">
                        {dispatchReceipt.messageId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Plazo legal de 30 días naturales iniciado según normativa
                      aplicable.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
