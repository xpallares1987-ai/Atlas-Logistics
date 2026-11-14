/**
 * @file IncotermsContractsModule.tsx
 * @description Incoterms® 2020 & commercial contracts module with ICC rules matrix and DUA normalizer.
 * @module @atlas/frontend/pages
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { Variants } from "framer-motion";
import {
  useIncotermsContracts,
  Header,
  Contracts,
  Matrix,
  SimulatorModal,
} from "../components/IncotermsContracts";

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

export default function IncotermsContractsModule() {
  const {
    activeTab,
    setActiveTab,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    selectedContract,
    setSelectedContract,
    contracts,
    isLoading,
    incotermRules,
    totalContracts,
    totalContractValue,
    multimodalCount,
    activeCount,
    showSimulatorModal,
    setShowSimulatorModal,
    simIncoterm,
    setSimIncoterm,
    simMode,
    setSimMode,
    simContainerized,
    setSimContainerized,
    simGoodsValue,
    setSimGoodsValue,
    simFreight,
    setSimFreight,
    simInsurance,
    setSimInsurance,
    simPreCarriage,
    setSimPreCarriage,
    simExportCosts,
    setSimExportCosts,
    simImportDuty,
    setSimImportDuty,
    simImportVat,
    setSimImportVat,
    simDestTransport,
    setSimDestTransport,
    simModeResult,
    simInsResult,
    simCustomsResult,
    isCalculating,
    calculateSimulator,
  } = useIncotermsContracts();

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-sky-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[300px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header & KPI Summary */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSimulator={() => {
          setShowSimulatorModal(true);
          if (!simCustomsResult) calculateSimulator();
        }}
        totalContracts={totalContracts}
        activeCount={activeCount}
        totalContractValue={totalContractValue}
        multimodalCount={multimodalCount}
      />

      {/* Main Content Area */}
      {activeTab === "CONTRACTS" ? (
        <Contracts
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          contracts={contracts}
          isLoading={isLoading}
          selectedContract={selectedContract}
          onSelectContract={setSelectedContract}
          containerVariants={containerVariants}
          itemVariants={itemVariants}
        />
      ) : (
        <Matrix incotermRules={incotermRules} />
      )}

      {/* Simulator Modal */}
      <SimulatorModal
        isOpen={showSimulatorModal}
        onClose={() => setShowSimulatorModal(false)}
        simIncoterm={simIncoterm}
        setSimIncoterm={setSimIncoterm}
        simMode={simMode}
        setSimMode={setSimMode}
        simContainerized={simContainerized}
        setSimContainerized={setSimContainerized}
        simGoodsValue={simGoodsValue}
        setSimGoodsValue={setSimGoodsValue}
        simFreight={simFreight}
        setSimFreight={setSimFreight}
        simInsurance={simInsurance}
        setSimInsurance={setSimInsurance}
        simPreCarriage={simPreCarriage}
        setSimPreCarriage={setSimPreCarriage}
        simExportCosts={simExportCosts}
        setSimExportCosts={setSimExportCosts}
        simImportDuty={simImportDuty}
        setSimImportDuty={setSimImportDuty}
        simImportVat={simImportVat}
        setSimImportVat={setSimImportVat}
        simDestTransport={simDestTransport}
        setSimDestTransport={setSimDestTransport}
        onCalculate={calculateSimulator}
        isCalculating={isCalculating}
        simModeResult={simModeResult}
        simCustomsResult={simCustomsResult}
        simInsResult={simInsResult}
      />
    </div>
  );
}
