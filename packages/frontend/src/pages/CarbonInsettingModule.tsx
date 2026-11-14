/**
 * @file CarbonInsettingModule.tsx
 * @description Supply Chain Digital Twin & Scope 3 Carbon Insetting module.
 * @module @atlas/frontend/pages
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import {
  useCarbonInsetting,
  Header,
  TokensLedger,
  AllocationStudio,
  FuelEuPooling,
  SustainabilityAudit,
} from "../components/CarbonInsetting";

export default function CarbonInsettingModule() {
  const {
    activeTab,
    setActiveTab,
    tokens,
    searchTerm,
    setSearchTerm,
    filteredTokens,
    allocForm,
    setAllocForm,
    availableShipments,
    poolResult,
    liveAbatement,
    totalAvoidedCO2e,
    totalFuelVolumeMT,
    handleIssueToken,
    handleExecutePool,
    handleDownloadPDF,
  } = useCarbonInsetting();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 space-y-6">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tokensCount={tokens.length}
        totalAvoidedCO2e={totalAvoidedCO2e}
        totalFuelVolumeMT={totalFuelVolumeMT}
        poolResult={poolResult}
      />

      {activeTab === "TOKENS_LEDGER" && (
        <TokensLedger
          tokens={filteredTokens}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onDownloadPDF={handleDownloadPDF}
        />
      )}

      {activeTab === "ALLOCATION_STUDIO" && (
        <AllocationStudio
          allocForm={allocForm}
          setAllocForm={setAllocForm}
          availableShipments={availableShipments}
          liveAbatement={liveAbatement}
          onIssueToken={handleIssueToken}
        />
      )}

      {activeTab === "FUELEU_POOLING" && (
        <FuelEuPooling
          poolResult={poolResult}
          onExecutePool={handleExecutePool}
        />
      )}

      {activeTab === "SUSTAINABILITY_AUDIT" && <SustainabilityAudit />}
    </div>
  );
}
