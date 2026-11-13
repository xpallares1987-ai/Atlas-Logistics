/**
 * @file ColdChainModule.tsx
 * @description Orchestrator for the Cold Chain & Pharma GDP / Reefer Workspace (EN 12830 dataloggers, Arrhenius MKT, UN 1845 Dry Ice, and QP/RP release).
 * @module @atlas/frontend/pages/ColdChainModule
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import {
  Header,
  Monitor,
  Calculator,
  AuditGdp,
  GdpRelease,
  useColdChain,
} from "../components/ColdChain";

export default function ColdChainModule() {
  const {
    activeTab,
    setActiveTab,
    activeProfileFilter,
    setActiveProfileFilter,
    searchQuery,
    setSearchQuery,
    selectedShipment,
    setSelectedShipment,
    currentShipment,
    shipments,
    profiles,
    loadingShipments,
    calcTempsInput,
    setCalcTempsInput,
    calcMinTemp,
    setCalcMinTemp,
    calcMaxTemp,
    setCalcMaxTemp,
    mktResult,
    simDryIceInitialKg,
    setSimDryIceInitialKg,
    simDryIceCurrentKg,
    setSimDryIceCurrentKg,
    simDryIceRate,
    setSimDryIceRate,
    simDryIceTransitHrs,
    setSimDryIceTransitHrs,
    dryIceResult,
    simAmbientTemp,
    setSimAmbientTemp,
    simSetpointTemp,
    setSimSetpointTemp,
    simTransitHours,
    setSimTransitHours,
    simTankCapacity,
    setSimTankCapacity,
    reeferResult,
    showReleaseModal,
    setShowReleaseModal,
    verdictInput,
    setVerdictInput,
    rpNameInput,
    setRpNameInput,
    auditNotesInput,
    setAuditNotesInput,
    stats,
    handleRunMktCalc,
    handleRunDryIceSim,
    handleRunReeferSim,
    handleSaveGdpRelease,
    openReleaseModal,
  } = useColdChain();

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-blue-500/10 blur-[140px] rounded-full pointer-events-none" />

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        onOpenCalculator={() => {
          setActiveTab("CALCULATOR");
          if (!mktResult) handleRunMktCalc();
          if (!dryIceResult) handleRunDryIceSim();
          if (!reeferResult) handleRunReeferSim();
        }}
      />

      {activeTab === "MONITOR" && (
        <Monitor
          shipments={shipments}
          profiles={profiles}
          loadingShipments={loadingShipments}
          activeProfileFilter={activeProfileFilter}
          setActiveProfileFilter={setActiveProfileFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedShipment={selectedShipment}
          setSelectedShipment={setSelectedShipment}
          currentShipment={currentShipment}
          onOpenReleaseModal={openReleaseModal}
        />
      )}

      {activeTab === "CALCULATOR" && (
        <Calculator
          calcTempsInput={calcTempsInput}
          setCalcTempsInput={setCalcTempsInput}
          calcMinTemp={calcMinTemp}
          setCalcMinTemp={setCalcMinTemp}
          calcMaxTemp={calcMaxTemp}
          setCalcMaxTemp={setCalcMaxTemp}
          mktResult={mktResult}
          onRunMktCalc={handleRunMktCalc}
          simDryIceInitialKg={simDryIceInitialKg}
          setSimDryIceInitialKg={setSimDryIceInitialKg}
          simDryIceCurrentKg={simDryIceCurrentKg}
          setSimDryIceCurrentKg={setSimDryIceCurrentKg}
          simDryIceRate={simDryIceRate}
          setSimDryIceRate={setSimDryIceRate}
          simDryIceTransitHrs={simDryIceTransitHrs}
          setSimDryIceTransitHrs={setSimDryIceTransitHrs}
          dryIceResult={dryIceResult}
          onRunDryIceSim={handleRunDryIceSim}
          simAmbientTemp={simAmbientTemp}
          setSimAmbientTemp={setSimAmbientTemp}
          simSetpointTemp={simSetpointTemp}
          setSimSetpointTemp={setSimSetpointTemp}
          simTransitHours={simTransitHours}
          setSimTransitHours={setSimTransitHours}
          simTankCapacity={simTankCapacity}
          setSimTankCapacity={setSimTankCapacity}
          reeferResult={reeferResult}
          onRunReeferSim={handleRunReeferSim}
        />
      )}

      {activeTab === "AUDIT_GDP" && <AuditGdp shipments={shipments} />}

      <GdpRelease
        show={showReleaseModal}
        onClose={() => setShowReleaseModal(false)}
        verdictInput={verdictInput}
        setVerdictInput={setVerdictInput}
        rpNameInput={rpNameInput}
        setRpNameInput={setRpNameInput}
        auditNotesInput={auditNotesInput}
        setAuditNotesInput={setAuditNotesInput}
        onSave={handleSaveGdpRelease}
      />
    </div>
  );
}
