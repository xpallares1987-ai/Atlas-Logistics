/**
 * @file useDemurrageManager.ts
 * @description Custom React hook orchestrating SQLite demurrage invoices, clock-stop suspensions, FMC § 541 audits, and Gemini AI legal drafts.
 * @module @atlas/frontend/components/Demurrage/hooks
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { useState, useMemo, useCallback } from "react";
import {
  calculateDemurrageAudit,
  generateDisputePack,
  type CarrierInvoiceData,
  type ClockSuspension,
  type EDI315Milestone,
  type DemurrageAuditResult,
  type DisputePack,
} from "@atlas/shared";
import { useApiMutation, useApiQuery } from "../../../hooks/useApiQuery";
import { useShipments } from "../../../hooks/useShipments";
import {
  CANONICAL_FALLBACK_INVOICE,
  DEFAULT_FALLBACK_SUSPENSIONS,
  mapDbInvoiceToCarrierData,
  mapDbSuspensionToClockSuspension,
  buildEdi315Milestones,
  calculateSuspensionDays,
  filterDemurrageInvoices,
} from "./demurrageHelpers";
import { downloadDisputeDossierPdf } from "./demurragePdfExporter";
import type {
  GeminiFmcDraftResult,
  DispatchReceipt,
  NewSuspensionInput,
} from "../../../types/demurrage.types";

export function useDemurrageManager() {
  // ============================================================================
  // 1. STATE & RELATIONAL QUERIES
  // ============================================================================
  const [selectedShipmentId, setSelectedShipmentId] =
    useState<string>("sh_demo_01");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [disputeSuccessMessage, setDisputeSuccessMessage] = useState<
    string | null
  >(null);
  const [geminiDraftResult, setGeminiDraftResult] =
    useState<GeminiFmcDraftResult | null>(null);
  const [dispatchReceipt, setDispatchReceipt] =
    useState<DispatchReceipt | null>(null);

  const { data: shipments = [] } = useShipments();
  const activeShipment =
    shipments.find((s) => s.id === selectedShipmentId) || shipments[0];

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

  // ============================================================================
  // 2. DERIVED DOMAIN AGGREGATES
  // ============================================================================
  const activeDbInvoice = useMemo(() => {
    if (selectedInvoiceId) {
      const match = dbInvoices.find((inv) => inv.id === selectedInvoiceId);
      if (match) return match;
    }
    return dbInvoices[0] || null;
  }, [dbInvoices, selectedInvoiceId]);

  const currentInvoice = useMemo<CarrierInvoiceData>(() => {
    return mapDbInvoiceToCarrierData(activeDbInvoice);
  }, [activeDbInvoice]);

  const currentSuspensions = useMemo<ClockSuspension[]>(() => {
    if (
      activeDbInvoice?.suspensions &&
      activeDbInvoice.suspensions.length > 0
    ) {
      return activeDbInvoice.suspensions.map(mapDbSuspensionToClockSuspension);
    }
    return DEFAULT_FALLBACK_SUSPENSIONS;
  }, [activeDbInvoice]);

  const currentMilestones = useMemo<EDI315Milestone[]>(() => {
    return buildEdi315Milestones(activeDbInvoice);
  }, [activeDbInvoice]);

  const auditResult = useMemo<DemurrageAuditResult>(() => {
    return calculateDemurrageAudit({
      invoice: currentInvoice,
      suspensions: currentSuspensions,
      milestones: currentMilestones,
    });
  }, [currentInvoice, currentSuspensions, currentMilestones]);

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

  const activeLetterBody =
    geminiDraftResult?.draftText || disputePack.formalLetterBody;

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

    return filterDemurrageInvoices(list, searchTerm);
  }, [dbInvoices, searchTerm, currentSuspensions]);

  // ============================================================================
  // 3. MUTATIONS & HANDLERS
  // ============================================================================
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
    },
  });

  const handleAddSuspension = useCallback(
    (input: NewSuspensionInput) => {
      const days = calculateSuspensionDays(input.startDate, input.endDate);
      const invoiceId = activeDbInvoice?.id || "dinv_sh_demo_01";
      addSuspensionMutation.mutate({
        invoiceId,
        startDate: input.startDate,
        endDate: input.endDate,
        daysSuspended: days,
        reason: input.reasonCode,
        justificationText:
          input.reasonText || `Suspensión reglamentaria (${input.reasonCode})`,
      });
    },
    [activeDbInvoice, addSuspensionMutation],
  );

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

  const handlePresentFmcDispute = useCallback(() => {
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
  }, [
    activeDbInvoice,
    auditResult,
    disputePack,
    activeLetterBody,
    geminiDraftResult,
    submitDisputeMutation,
  ]);

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

  const handleGenerateGeminiDraft = useCallback(() => {
    generateGeminiFmcDraftMutation.mutate({
      invoiceId: activeDbInvoice?.id || "dinv_sh_demo_01",
      shipmentId: selectedShipmentId || "sh_demo_01",
    });
  }, [activeDbInvoice, selectedShipmentId, generateGeminiFmcDraftMutation]);

  const dispatchMutation = useApiMutation<any, any>(
    "/demurrage-dispute/dispatch-email",
    "POST",
    {
      onSuccess: (data) => {
        setDispatchReceipt(data);
      },
    },
  );

  const handleDispatchEmail = useCallback(
    (recipientEmail: string) => {
      dispatchMutation.mutate({
        dossierId: disputePack.dossierId,
        recipientEmail: recipientEmail || disputePack.recipientCarrier.email,
        subject: disputePack.formalLetterSubject,
        body: activeLetterBody,
      });
    },
    [dispatchMutation, disputePack, activeLetterBody],
  );

  const handleDownloadPdf = useCallback(() => {
    downloadDisputeDossierPdf({
      auditResult,
      currentInvoice,
      disputePack,
      activeLetterBody,
    });
  }, [auditResult, currentInvoice, disputePack, activeLetterBody]);

  return {
    selectedShipmentId,
    setSelectedShipmentId,
    selectedInvoiceId,
    setSelectedInvoiceId,
    searchTerm,
    setSearchTerm,
    disputeSuccessMessage,
    shipments,
    activeShipment,
    dbInvoices,
    isLoadingInvoices,
    refetchInvoices,
    activeDbInvoice,
    currentInvoice,
    currentSuspensions,
    currentMilestones,
    auditResult,
    disputePack,
    displayInvoices,
    activeLetterBody,
    geminiDraftResult,
    setGeminiDraftResult,
    dispatchReceipt,
    isAddingSuspension: addSuspensionMutation.isPending,
    isSubmittingDispute: submitDisputeMutation.isPending,
    isGeneratingGeminiDraft: generateGeminiFmcDraftMutation.isPending,
    isDispatchingEmail: dispatchMutation.isPending,
    handleAddSuspension,
    handlePresentFmcDispute,
    handleGenerateGeminiDraft,
    handleDispatchEmail,
    handleDownloadPdf,
  };
}
