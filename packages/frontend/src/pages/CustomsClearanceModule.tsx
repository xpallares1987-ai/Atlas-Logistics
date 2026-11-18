/**
 * @file CustomsClearanceModule.tsx
 * @description Master orchestrator page for customs clearance, TARIC calculations, and DUA inspections.
 * @module @atlas/frontend/pages/CustomsClearanceModule
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import {
  useCustomsClearance,
  getStatusVisuals,
  CustomsClearanceHeader,
  CustomsClearanceHoldAlert,
  CustomsClearanceDeclarationList,
  CustomsClearanceDeclarationDetail,
  CustomsClearanceCalculatorModal,
} from "../components/CustomsClearance";

export default function CustomsClearanceModule() {
  const {
    declarations,
    isLoading,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    selectedDecl,
    setSelectedDecl,
    filteredDeclarations,
    holds,
    greens,
    oranges,
    isAuditing,
    showCalculatorModal,
    setShowCalculatorModal,
    calcParams,
    setCalcParams,
    calcResult,
    isCalculating,
    runComplianceAudit,
    handleCalculateTariff,
    handleCreateNewDeclaration,
    urlShipmentId,
    clearUrlFilter,
  } = useCustomsClearance();

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      {/* Top Header & Alert Banner */}
      <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
        <CustomsClearanceHeader
          onOpenCalculator={() => {
            setShowCalculatorModal(true);
            if (!calcResult) handleCalculateTariff();
          }}
        />

        <CustomsClearanceHoldAlert
          totalCount={declarations.length}
          greens={greens}
          oranges={oranges}
          holds={holds}
          onFilterHolds={() => setActiveFilter("Hold")}
        />

        {urlShipmentId && (
          <div className="mt-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-300">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">
                Filtrando por Expedición:
              </span>
              <span className="font-mono bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30 text-indigo-200">
                {urlShipmentId}
              </span>
              {selectedDecl?.duaNumber && (
                <span className="text-slate-300">
                  (DUA:{" "}
                  <strong className="text-amber-300">
                    {selectedDecl.duaNumber}
                  </strong>
                  )
                </span>
              )}
            </div>
            <button
              onClick={clearUrlFilter}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Ver todas las declaraciones
            </button>
          </div>
        )}
      </div>

      {/* Main Split Pane */}
      <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
        {/* Left Column: Declarations List */}
        <CustomsClearanceDeclarationList
          declarations={declarations}
          filteredDeclarations={filteredDeclarations}
          selectedDecl={selectedDecl}
          onSelectDecl={setSelectedDecl}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          isLoading={isLoading}
          getStatusVisuals={getStatusVisuals}
        />

        {/* Right Column: 54-Box DUA Inspector & Rule Diagnostics */}
        <CustomsClearanceDeclarationDetail
          selectedDecl={selectedDecl}
          getStatusVisuals={getStatusVisuals}
          isAuditing={isAuditing}
          onAudit={runComplianceAudit}
        />
      </div>

      {/* Tariff Calculator & New Declaration Modal */}
      <CustomsClearanceCalculatorModal
        isOpen={showCalculatorModal}
        onClose={() => setShowCalculatorModal(false)}
        calcParams={calcParams}
        setCalcParams={setCalcParams}
        calcResult={calcResult}
        isCalculating={isCalculating}
        onCalculate={handleCalculateTariff}
        onCreateDeclaration={handleCreateNewDeclaration}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
