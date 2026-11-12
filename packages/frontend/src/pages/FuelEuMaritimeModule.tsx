/**
 * @file FuelEuMaritimeModule.tsx
 * @description Orchestrator page for FuelEU Maritime (Reg. EU 2023/1805), EU ETS Maritime (Dir. 2023/959) & Fleet Decarbonization.
 * @module @atlas/frontend/pages
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import React, { Suspense } from "react";
import { Header, VoyagesGhg, useFuelEuMaritime } from "../components/FuelEu";

// ============================================================================
// 1. LAZY-LOADED SECONDARY TABS & MODALS
// ============================================================================

const EtsGreenBaf = React.lazy(() =>
  import("../components/FuelEu/Tab/EtsGreenBaf").then((m) => ({
    default: m.EtsGreenBaf,
  })),
);
const PoolingFuels = React.lazy(() =>
  import("../components/FuelEu/Tab/PoolingFuels").then((m) => ({
    default: m.PoolingFuels,
  })),
);
const StatusVerification = React.lazy(() =>
  import("../components/FuelEu/Modal/StatusVerification").then((m) => ({
    default: m.StatusVerification,
  })),
);

// ============================================================================
// 2. MODULE ORCHESTRATOR
// ============================================================================

export default function FuelEuMaritimeModule() {
  const vm = useFuelEuMaritime();

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-cyan-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-emerald-600/10 blur-[140px] rounded-full pointer-events-none" />

      <Header
        currentAccount={vm.currentAccount}
        voyagesCount={vm.voyages.length}
        vesselsCount={vm.vessels.length}
        totalFuelEnergySum={vm.totalFuelEnergySum}
        avgGhgIntensity={vm.avgGhgIntensity}
        totalEtsEmissionsSum={vm.totalEtsEmissionsSum}
        poolsCount={vm.pools.length}
        activeTab={vm.activeTab}
        onSelectTab={vm.setActiveTab}
      />

      {vm.activeTab === "VOYAGES_GHG" && (
        <VoyagesGhg
          voyages={vm.voyages}
          loadingVoyages={vm.loadingVoyages}
          searchQuery={vm.searchQuery}
          setSearchQuery={vm.setSearchQuery}
          activeScopeFilter={vm.activeScopeFilter}
          setActiveScopeFilter={vm.setActiveScopeFilter}
          selectedVoyage={vm.selectedVoyage}
          onSelectVoyage={vm.setSelectedVoyage}
          currentVoyage={vm.currentVoyage}
          onOpenVerifyModal={vm.handleOpenVerifyModal}
        />
      )}

      <Suspense
        fallback={
          <div className="p-8 text-center text-xs text-slate-400">
            Cargando módulo FuelEU / EU ETS...
          </div>
        }
      >
        {vm.activeTab === "ETS_GREEN_BAF" && (
          <EtsGreenBaf
            simScope={vm.simScope}
            setSimScope={vm.setSimScope}
            simCo2Tonnes={vm.simCo2Tonnes}
            setSimCo2Tonnes={vm.setSimCo2Tonnes}
            simCh4Tonnes={vm.simCh4Tonnes}
            setSimCh4Tonnes={vm.setSimCh4Tonnes}
            simN2oTonnes={vm.simN2oTonnes}
            setSimN2oTonnes={vm.setSimN2oTonnes}
            simEuaPrice={vm.simEuaPrice}
            setSimEuaPrice={vm.setSimEuaPrice}
            simCarriedTeus={vm.simCarriedTeus}
            setSimCarriedTeus={vm.setSimCarriedTeus}
            simFueleuImpact={vm.simFueleuImpact}
            setSimFueleuImpact={vm.setSimFueleuImpact}
            etsSimResult={vm.etsSimResult}
            onRunEtsCalc={vm.handleRunEtsCalc}
          />
        )}

        {vm.activeTab === "POOLING_FUELS" && (
          <PoolingFuels
            fuels={vm.fuels}
            simFuelCode={vm.simFuelCode}
            setSimFuelCode={vm.setSimFuelCode}
            simFuelTonnes={vm.simFuelTonnes}
            setSimFuelTonnes={vm.setSimFuelTonnes}
            simOpsKwh={vm.simOpsKwh}
            setSimOpsKwh={vm.setSimOpsKwh}
            fuelSimResult={vm.fuelSimResult}
            onRunFuelSim={vm.handleRunFuelSim}
            pools={vm.pools}
          />
        )}

        {vm.showStatusModal && (
          <StatusVerification
            isOpen={vm.showStatusModal}
            onClose={() => vm.setShowStatusModal(false)}
            statusInput={vm.statusInput}
            setStatusInput={vm.setStatusInput}
            verifierInput={vm.verifierInput}
            setVerifierInput={vm.setVerifierInput}
            onConfirm={vm.handleSaveStatus}
          />
        )}
      </Suspense>
    </div>
  );
}
