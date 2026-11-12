/**
 * @file DemurrageAlertsModule.tsx
 * @description Orchestrator for Demurrage & Detention Control Tower, FMC 46 CFR § 541 billing audits, and legal dispute dossiers.
 * @module @atlas/frontend/pages/DemurrageAlertsModule
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { useState, lazy, Suspense } from "react";
import {
  Header,
  Navigation,
  ShipmentContext,
  SummaryKpi,
  Radar,
  Suspensions,
  useDemurrageManager,
} from "../components/Demurrage";
import type { DemurrageTabKey } from "../types/demurrage.types";

// ============================================================================
// LAZY-LOADED EVIDENTIARY & AUDIT TABS
// ============================================================================
const AuditTab = lazy(() => import("../components/Demurrage/Tab/Audit"));
const DossierTab = lazy(() => import("../components/Demurrage/Tab/Dossier"));

function TabSkeleton() {
  return (
    <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-8 animate-pulse space-y-4">
      <div className="h-6 bg-slate-700 rounded-lg w-1/3" />
      <div className="h-4 bg-slate-700/60 rounded-lg w-1/2" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <div className="h-40 bg-slate-900/60 rounded-xl" />
        <div className="h-40 bg-slate-900/60 rounded-xl" />
      </div>
    </div>
  );
}

export default function DemurrageAlertsModule() {
  // ============================================================================
  // 1. STATE & DOMAIN HOOK
  // ============================================================================
  const [activeTab, setActiveTab] = useState<DemurrageTabKey>("RADAR");

  const {
    selectedShipmentId,
    setSelectedShipmentId,
    setSelectedInvoiceId,
    searchTerm,
    setSearchTerm,
    disputeSuccessMessage,
    shipments,
    activeShipment,
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
    isAddingSuspension,
    isSubmittingDispute,
    isGeneratingGeminiDraft,
    isDispatchingEmail,
    handleAddSuspension,
    handlePresentFmcDispute,
    handleGenerateGeminiDraft,
    handleDispatchEmail,
    handleDownloadPdf,
  } = useDemurrageManager();

  // ============================================================================
  // 2. HANDLERS
  // ============================================================================
  const handleSelectShipment = (shipmentId: string) => {
    setSelectedShipmentId(shipmentId);
    setSelectedInvoiceId(null);
  };

  const handleAuditInvoice = (inv: any) => {
    if (inv.id) setSelectedInvoiceId(inv.id);
    if (inv.shipmentId) setSelectedShipmentId(inv.shipmentId);
    setActiveTab("AUDIT");
  };

  // ============================================================================
  // 3. RENDER ORCHESTRATION
  // ============================================================================
  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header currentInvoice={currentInvoice} />

        <ShipmentContext
          shipments={shipments}
          activeShipment={activeShipment}
          selectedShipmentId={selectedShipmentId}
          onSelectShipment={handleSelectShipment}
          activeDbInvoice={activeDbInvoice}
          isLoadingInvoices={isLoadingInvoices}
          onRefreshInvoices={() => refetchInvoices()}
          disputeSuccessMessage={disputeSuccessMessage}
        />

        <SummaryKpi auditResult={auditResult} currentInvoice={currentInvoice} />

        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "RADAR" && (
          <Radar
            displayInvoices={displayInvoices}
            isLoadingInvoices={isLoadingInvoices}
            activeDbInvoice={activeDbInvoice}
            currentInvoice={currentInvoice}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onAuditInvoice={handleAuditInvoice}
          />
        )}

        {activeTab === "SUSPENSIONS" && (
          <Suspensions
            currentInvoice={currentInvoice}
            currentSuspensions={currentSuspensions}
            auditResult={auditResult}
            isAddingSuspension={isAddingSuspension}
            onAddSuspension={handleAddSuspension}
          />
        )}

        {activeTab === "AUDIT" && (
          <Suspense fallback={<TabSkeleton />}>
            <AuditTab
              currentInvoice={currentInvoice}
              auditResult={auditResult}
              currentMilestones={currentMilestones}
              activeDbInvoice={activeDbInvoice}
              isSubmittingDispute={isSubmittingDispute}
              onPresentFmcDispute={handlePresentFmcDispute}
              onNavigateToDossier={() => setActiveTab("DOSSIER")}
            />
          </Suspense>
        )}

        {activeTab === "DOSSIER" && (
          <Suspense fallback={<TabSkeleton />}>
            <DossierTab
              disputePack={disputePack}
              activeLetterBody={activeLetterBody}
              activeDbInvoice={activeDbInvoice}
              geminiDraftResult={geminiDraftResult}
              onClearGeminiDraft={() => setGeminiDraftResult(null)}
              isGeneratingGeminiDraft={isGeneratingGeminiDraft}
              onGenerateGeminiDraft={handleGenerateGeminiDraft}
              isSubmittingDispute={isSubmittingDispute}
              onPresentFmcDispute={handlePresentFmcDispute}
              onDownloadPdf={handleDownloadPdf}
              isDispatchingEmail={isDispatchingEmail}
              dispatchReceipt={dispatchReceipt}
              onDispatchEmail={handleDispatchEmail}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
