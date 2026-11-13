/**
 * @file CbamModule.tsx
 * @description Orchestrator for the Carbon Border Adjustment Mechanism (CBAM - Regulation EU 2023/956 & EU ETS Article 9) Workspace.
 * @module @atlas/frontend/pages/CbamModule
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import {
  Header,
  Declarations,
  Calculator,
  FinanceEts,
  ValidateStatus,
  useCbam,
} from "../components/Cbam";

export default function CbamModule() {
  const {
    activeTab,
    setActiveTab,
    activePeriodFilter,
    setActivePeriodFilter,
    searchQuery,
    setSearchQuery,
    selectedDeclaration,
    setSelectedDeclaration,
    currentDeclaration,
    declarations,
    loadingDeclarations,
    catalog,
    installations,
    calcNetWeight,
    setCalcNetWeight,
    calcDirectFactor,
    setCalcDirectFactor,
    calcIndirectFactor,
    setCalcIndirectFactor,
    calcEuDefaultDirect,
    setCalcEuDefaultDirect,
    calcEuDefaultIndirect,
    setCalcEuDefaultIndirect,
    emissionsResult,
    simEmissionsTotal,
    setSimEmissionsTotal,
    simEtsPrice,
    setSimEtsPrice,
    simForeignPricePaid,
    setSimForeignPricePaid,
    liabilityResult,
    showStatusModal,
    setShowStatusModal,
    statusInput,
    setStatusInput,
    remarksInput,
    setRemarksInput,
    stats,
    handleRunEmissionsCalc,
    handleRunLiabilityCalc,
    handleSaveStatus,
    openStatusModal,
  } = useCbam();

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-teal-500/10 blur-[140px] rounded-full pointer-events-none" />

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onOpenCalculator={() => {
          setActiveTab("CALCULATOR");
          if (!emissionsResult) handleRunEmissionsCalc();
          if (!liabilityResult) handleRunLiabilityCalc();
        }}
      />

      {activeTab === "DECLARATIONS" && (
        <Declarations
          declarations={declarations}
          loadingDeclarations={loadingDeclarations}
          activePeriodFilter={activePeriodFilter}
          setActivePeriodFilter={setActivePeriodFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedDeclaration={selectedDeclaration}
          setSelectedDeclaration={setSelectedDeclaration}
          currentDeclaration={currentDeclaration}
          onOpenStatusModal={openStatusModal}
        />
      )}

      {activeTab === "CALCULATOR" && (
        <Calculator
          calcNetWeight={calcNetWeight}
          setCalcNetWeight={setCalcNetWeight}
          calcDirectFactor={calcDirectFactor}
          setCalcDirectFactor={setCalcDirectFactor}
          calcIndirectFactor={calcIndirectFactor}
          setCalcIndirectFactor={setCalcIndirectFactor}
          calcEuDefaultDirect={calcEuDefaultDirect}
          setCalcEuDefaultDirect={setCalcEuDefaultDirect}
          calcEuDefaultIndirect={calcEuDefaultIndirect}
          setCalcEuDefaultIndirect={setCalcEuDefaultIndirect}
          emissionsResult={emissionsResult}
          onRunEmissionsCalc={handleRunEmissionsCalc}
          catalog={catalog}
          installations={installations}
        />
      )}

      {activeTab === "FINANCE_ETS" && (
        <FinanceEts
          simEmissionsTotal={simEmissionsTotal}
          setSimEmissionsTotal={setSimEmissionsTotal}
          simEtsPrice={simEtsPrice}
          setSimEtsPrice={setSimEtsPrice}
          simForeignPricePaid={simForeignPricePaid}
          setSimForeignPricePaid={setSimForeignPricePaid}
          liabilityResult={liabilityResult}
          onRunLiabilityCalc={handleRunLiabilityCalc}
        />
      )}

      <ValidateStatus
        show={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        statusInput={statusInput}
        setStatusInput={setStatusInput}
        remarksInput={remarksInput}
        setRemarksInput={setRemarksInput}
        onSave={handleSaveStatus}
      />
    </div>
  );
}
