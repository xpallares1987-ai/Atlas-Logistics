/**
 * @file CustomsWarehouseModule.tsx
 * @description Orchestrator page module for Customs Warehouse (DA 7100, DDA 7600, ADT), AEAT Stock Ledger, and Bank Guarantees.
 * @module @atlas/frontend/pages/CustomsWarehouseModule
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import {
  Header,
  LotsLedger,
  GuaranteesTax,
  FacilitiesHandling,
  UpdateLotStatus,
  useCustomsWarehouse,
} from "../components/CustomsWarehouse";

export default function CustomsWarehouseModule() {
  const {
    activeTab,
    setActiveTab,
    activeRegimeFilter,
    setActiveRegimeFilter,
    searchQuery,
    setSearchQuery,
    selectedLot,
    setSelectedLot,
    currentLot,
    lots,
    loadingLots,
    facilities,
    guarantees,
    simDischargeRegime,
    setSimDischargeRegime,
    simDischargedPkgs,
    setSimDischargedPkgs,
    dischargeResult,
    handleRunDischargeCalc,
    selectedHandlingType,
    setSelectedHandlingType,
    showStatusModal,
    setShowStatusModal,
    statusInput,
    setStatusInput,
    remarksInput,
    setRemarksInput,
    openStatusModal,
    handleSaveStatus,
    totalSuspendedDebtSum,
    totalPackagesSum,
    totalAvailableCreditSum,
  } = useCustomsWarehouse();

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-amber-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-blue-600/10 blur-[140px] rounded-full pointer-events-none" />

      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        lotsCount={lots.length}
        totalPackagesSum={totalPackagesSum}
        totalSuspendedDebtSum={totalSuspendedDebtSum}
        totalAvailableCreditSum={totalAvailableCreditSum}
        guaranteesCount={guarantees.length}
        facilitiesCount={facilities.length}
      />

      {activeTab === "LOTS_LEDGER" && (
        <LotsLedger
          lots={lots}
          loadingLots={loadingLots}
          selectedLot={selectedLot}
          currentLot={currentLot}
          onSelectLot={setSelectedLot}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeRegimeFilter={activeRegimeFilter}
          onRegimeFilterChange={setActiveRegimeFilter}
          onOpenStatusModal={openStatusModal}
        />
      )}

      {activeTab === "GUARANTEES_TAX" && (
        <GuaranteesTax
          guarantees={guarantees}
          simDischargeRegime={simDischargeRegime}
          onDischargeRegimeChange={setSimDischargeRegime}
          simDischargedPkgs={simDischargedPkgs}
          onDischargedPkgsChange={setSimDischargedPkgs}
          dischargeResult={dischargeResult}
          onRunDischargeCalc={handleRunDischargeCalc}
        />
      )}

      {activeTab === "FACILITIES_HANDLING" && (
        <FacilitiesHandling
          facilities={facilities}
          selectedHandlingType={selectedHandlingType}
          onHandlingTypeChange={setSelectedHandlingType}
        />
      )}

      <UpdateLotStatus
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        statusInput={statusInput}
        onStatusChange={setStatusInput}
        remarksInput={remarksInput}
        onRemarksChange={setRemarksInput}
        onSave={handleSaveStatus}
      />
    </div>
  );
}
