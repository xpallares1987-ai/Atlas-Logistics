/**
 * @file AirCargoModule.tsx
 * @description IATA e-Freight & Air Cargo (e-AWB) module with volumetric pricing and DGR/TCR compliance.
 * @module @atlas/frontend/pages
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { Variants } from "framer-motion";
import {
  useAirCargo,
  Header,
  AwbList,
  AwbDetail,
  SimulatorModal,
} from "../components/AirCargo";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function AirCargoModule() {
  const {
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    selectedAwb,
    setSelectedAwb,
    expandedMawbs,
    toggleMawbExpand,
    airwayBills,
    isLoading,
    totalAwbs,
    totalMawbs,
    totalChargeableKg,
    dgrSpecialCount,
    showSimulatorModal,
    setShowSimulatorModal,
    simOrigin,
    setSimOrigin,
    simDestination,
    setSimDestination,
    simPieces,
    setSimPieces,
    simActualWeight,
    setSimActualWeight,
    simGoods,
    setSimGoods,
    simUnNumber,
    setSimUnNumber,
    simTempControlled,
    setSimTempControlled,
    simTempRange,
    setSimTempRange,
    simRatingResult,
    simDgrResult,
    isCalculating,
    calculateSimulator,
  } = useAirCargo();

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-sky-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-indigo-500/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header & KPI Summary */}
      <Header
        onOpenSimulator={() => {
          setShowSimulatorModal(true);
          if (!simRatingResult) calculateSimulator();
        }}
        totalAwbs={totalAwbs}
        totalMawbs={totalMawbs}
        totalChargeableKg={totalChargeableKg}
        dgrSpecialCount={dgrSpecialCount}
      />

      {/* Main Split Pane */}
      <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
        <AwbList
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          airwayBills={airwayBills}
          isLoading={isLoading}
          selectedAwb={selectedAwb}
          onSelectAwb={setSelectedAwb}
          expandedMawbs={expandedMawbs}
          onToggleMawbExpand={toggleMawbExpand}
          containerVariants={containerVariants}
          itemVariants={itemVariants}
        />

        <AwbDetail selectedAwb={selectedAwb} />
      </div>

      {/* Simulator Modal */}
      <SimulatorModal
        isOpen={showSimulatorModal}
        onClose={() => setShowSimulatorModal(false)}
        simOrigin={simOrigin}
        setSimOrigin={setSimOrigin}
        simDestination={simDestination}
        setSimDestination={setSimDestination}
        simGoods={simGoods}
        setSimGoods={setSimGoods}
        simTempRange={simTempRange}
        setSimTempRange={setSimTempRange}
        simPieces={simPieces}
        setSimPieces={setSimPieces}
        simActualWeight={simActualWeight}
        setSimActualWeight={setSimActualWeight}
        simUnNumber={simUnNumber}
        setSimUnNumber={setSimUnNumber}
        simTempControlled={simTempControlled}
        setSimTempControlled={setSimTempControlled}
        onCalculate={calculateSimulator}
        isCalculating={isCalculating}
        simRatingResult={simRatingResult}
        simDgrResult={simDgrResult}
      />
    </div>
  );
}
