/**
 * @file TradeFinanceModule.tsx
 * @description Orchestrator for the International Trade Finance & Documentary Credits Workspace (UCP 600, URDG 758, ISBP 745, and SWIFT MT700/MT734).
 * @module @atlas/frontend/pages/TradeFinanceModule
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import {
  Header,
  InstrumentsDocs,
  UcpDiscrepancies,
  FeeSimulator,
  useTradeFinance,
} from "../components/TradeFinance";

export default function TradeFinanceModule() {
  const {
    activeTab,
    setActiveTab,
    activeTypeFilter,
    setActiveTypeFilter,
    searchQuery,
    setSearchQuery,
    selectedInstrument,
    setSelectedInstrument,
    currentInst,
    instruments,
    loadingInstruments,
    simAmount,
    setSimAmount,
    simCurrency,
    setSimCurrency,
    simTenorDays,
    setSimTenorDays,
    simOpeningRate,
    setSimOpeningRate,
    simConfirmRate,
    setSimConfirmRate,
    simDiscrepancyCount,
    setSimDiscrepancyCount,
    simAmendmentCount,
    setSimAmendmentCount,
    feeSimResult,
    auditDateInput,
    setAuditDateInput,
    auditResult,
    isAuditing,
    isAuditingGeminiUcp,
    geminiUcpAudit,
    setGeminiUcpAudit,
    stats,
    handleRunGeminiUcpAudit,
    handleRunFeeSim,
    handleRunUcpAudit,
  } = useTradeFinance();

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-emerald-600/10 blur-[140px] rounded-full pointer-events-none" />

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentInst={currentInst}
        isAuditingGeminiUcp={isAuditingGeminiUcp}
        onRunGeminiUcpAudit={handleRunGeminiUcpAudit}
        geminiUcpAudit={geminiUcpAudit}
        onCloseGeminiAudit={() => setGeminiUcpAudit(null)}
        stats={stats}
      />

      {activeTab === "INSTRUMENTS_DOCS" && (
        <InstrumentsDocs
          instruments={instruments}
          loadingInstruments={loadingInstruments}
          activeTypeFilter={activeTypeFilter}
          setActiveTypeFilter={setActiveTypeFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedInstrument={selectedInstrument}
          setSelectedInstrument={setSelectedInstrument}
          currentInst={currentInst}
        />
      )}

      {activeTab === "UCP_DISCREPANCIES" && (
        <UcpDiscrepancies
          currentInst={currentInst}
          auditDateInput={auditDateInput}
          setAuditDateInput={setAuditDateInput}
          auditResult={auditResult}
          isAuditing={isAuditing}
          onRunUcpAudit={handleRunUcpAudit}
        />
      )}

      {activeTab === "FEE_SIMULATOR" && (
        <FeeSimulator
          simAmount={simAmount}
          setSimAmount={setSimAmount}
          simCurrency={simCurrency}
          setSimCurrency={setSimCurrency}
          simTenorDays={simTenorDays}
          setSimTenorDays={setSimTenorDays}
          simOpeningRate={simOpeningRate}
          setSimOpeningRate={setSimOpeningRate}
          simConfirmRate={simConfirmRate}
          setSimConfirmRate={setSimConfirmRate}
          simDiscrepancyCount={simDiscrepancyCount}
          setSimDiscrepancyCount={setSimDiscrepancyCount}
          simAmendmentCount={simAmendmentCount}
          setSimAmendmentCount={setSimAmendmentCount}
          feeSimResult={feeSimResult}
          onRunFeeSim={handleRunFeeSim}
        />
      )}
    </div>
  );
}
