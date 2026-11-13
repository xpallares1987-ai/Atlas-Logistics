/**
 * @file RailFreightModule.tsx
 * @description Orchestrator for the Rail Freight & Intermodal CIM Workspace (TEN-T corridors, UIC wagons, P400 Kangaroo, and EN 15528 axle load calculator).
 * @module @atlas/frontend/pages/RailFreightModule
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import {
  Header,
  Consignments,
  TrainConsist,
  AxleAudit,
  UpdateConsignmentStatus,
  useRailFreight,
} from "../components/RailFreight";

export default function RailFreightModule() {
  const {
    activeTab,
    setActiveTab,
    activeCorridorFilter,
    setActiveCorridorFilter,
    searchQuery,
    setSearchQuery,
    selectedConsignment,
    setSelectedConsignment,
    currentConsignment,
    consignments,
    loadingConsignments,
    corridors,
    terminals,
    wagons,
    trains,
    totalGrossMassSum,
    totalTeuSum,
    inTransitCount,
    simLocoWeight,
    setSimLocoWeight,
    simLocoBrake,
    setSimLocoBrake,
    simWagonCount,
    setSimWagonCount,
    simAvgWagonTare,
    setSimAvgWagonTare,
    simAvgWagonPayload,
    setSimAvgWagonPayload,
    simAvgWagonBrake,
    setSimAvgWagonBrake,
    trainPhysicsResult,
    calcWagonTare,
    setCalcWagonTare,
    calcPayload,
    setCalcPayload,
    calcAxles,
    setCalcAxles,
    calcLineCategory,
    setCalcLineCategory,
    axleResult,
    showStatusModal,
    setShowStatusModal,
    statusInput,
    setStatusInput,
    remarksInput,
    setRemarksInput,
    handleRunTrainPhysics,
    handleRunAxleCalc,
    handleSaveStatus,
  } = useRailFreight();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-100 flex flex-col relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      <Header
        consignmentsCount={consignments.length}
        inTransitCount={inTransitCount}
        totalGrossMassSum={totalGrossMassSum}
        totalTeuSum={totalTeuSum}
        trainsCount={trains.length}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenConsistCalculator={() => {
          setActiveTab("TRAIN_CONSIST");
          if (!trainPhysicsResult) handleRunTrainPhysics();
        }}
      />

      {activeTab === "CONSIGNMENTS" && (
        <Consignments
          searchQuery={searchQuery}
          onChangeSearchQuery={setSearchQuery}
          activeCorridorFilter={activeCorridorFilter}
          onSelectCorridorFilter={setActiveCorridorFilter}
          loadingConsignments={loadingConsignments}
          consignments={consignments}
          selectedConsignment={selectedConsignment}
          onSelectConsignment={setSelectedConsignment}
          currentConsignment={currentConsignment}
          trains={trains}
          onOpenStatusModal={(status, remarks) => {
            setStatusInput(status);
            setRemarksInput(remarks);
            setShowStatusModal(true);
          }}
        />
      )}

      {activeTab === "TRAIN_CONSIST" && (
        <TrainConsist
          trains={trains}
          simWagonCount={simWagonCount}
          setSimWagonCount={setSimWagonCount}
          simAvgWagonTare={simAvgWagonTare}
          setSimAvgWagonTare={setSimAvgWagonTare}
          simAvgWagonPayload={simAvgWagonPayload}
          setSimAvgWagonPayload={setSimAvgWagonPayload}
          simAvgWagonBrake={simAvgWagonBrake}
          setSimAvgWagonBrake={setSimAvgWagonBrake}
          simLocoWeight={simLocoWeight}
          setSimLocoWeight={setSimLocoWeight}
          simLocoBrake={simLocoBrake}
          setSimLocoBrake={setSimLocoBrake}
          trainPhysicsResult={trainPhysicsResult}
          onRunTrainPhysics={handleRunTrainPhysics}
        />
      )}

      {activeTab === "AXLE_AUDIT" && (
        <AxleAudit
          wagons={wagons}
          terminals={terminals}
          corridors={corridors}
          calcWagonTare={calcWagonTare}
          setCalcWagonTare={setCalcWagonTare}
          calcPayload={calcPayload}
          setCalcPayload={setCalcPayload}
          calcAxles={calcAxles}
          setCalcAxles={setCalcAxles}
          calcLineCategory={calcLineCategory}
          setCalcLineCategory={setCalcLineCategory}
          axleResult={axleResult}
          onRunAxleCalc={handleRunAxleCalc}
        />
      )}

      <UpdateConsignmentStatus
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
