/**
 * @file CarbonEmissionsModule.tsx
 * @description Orchestrator for Scope 3 Carbon Footprint Calculator (ISO 14083 & GLEC Framework v3).
 * @module @atlas/frontend/pages
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Suspense, lazy } from "react";
import {
  Header,
  Navigation,
  Journeys,
  useCarbonEmissions,
} from "../components/CarbonEmissions";

const Calculator = lazy(
  () => import("../components/CarbonEmissions/Tab/Calculator"),
);
const Marketplace = lazy(
  () => import("../components/CarbonEmissions/Tab/Marketplace"),
);
const Certificates = lazy(
  () => import("../components/CarbonEmissions/Tab/Certificates"),
);
const OffsetPurchase = lazy(
  () => import("../components/CarbonEmissions/Modal/OffsetPurchase"),
);

export default function CarbonEmissionsModule() {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedCalculation,
    setSelectedCalculation,
    showOffsetModal,
    setShowOffsetModal,
    offsetSelectedProjectId,
    setOffsetSelectedProjectId,
    beneficiaryInput,
    setBeneficiaryInput,
    calcRefCode,
    setCalcRefCode,
    calcOriginCity,
    setCalcOriginCity,
    calcDestinationCity,
    setCalcDestinationCity,
    calcLegs,
    calcResult,
    greenAlternatives,
    summary,
    calculations,
    projects,
    certificates,
    calcDetails,
    handleRunCalculation,
    handleAddLeg,
    handleRemoveLeg,
    handleLegChange,
    handleConfirmOffset,
    handleOpenOffsetForCalc,
    handleSelectProjectForOffset,
  } = useCarbonEmissions();

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2">
      <Header
        summary={summary}
        onOpenCalculator={() => setActiveTab("CALCULATOR")}
      />

      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        calculationsCount={calculations.length}
        projectsCount={projects.length}
        certificatesCount={certificates.length}
      />

      {activeTab === "JOURNEYS" && (
        <Journeys
          calculations={calculations}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCalculation={selectedCalculation}
          onSelectCalculation={setSelectedCalculation}
          calcDetails={calcDetails}
          onNavigateCertificates={() => setActiveTab("CERTIFICATES")}
          onOpenOffsetForCalc={handleOpenOffsetForCalc}
        />
      )}

      {activeTab !== "JOURNEYS" && (
        <Suspense
          fallback={
            <div className="p-8 text-center text-slate-400 text-xs">
              Cargando módulo Scope 3...
            </div>
          }
        >
          {activeTab === "CALCULATOR" && (
            <Calculator
              calcRefCode={calcRefCode}
              setCalcRefCode={setCalcRefCode}
              calcOriginCity={calcOriginCity}
              setCalcOriginCity={setCalcOriginCity}
              calcDestinationCity={calcDestinationCity}
              setCalcDestinationCity={setCalcDestinationCity}
              calcLegs={calcLegs}
              onAddLeg={handleAddLeg}
              onRemoveLeg={handleRemoveLeg}
              onLegChange={handleLegChange}
              onRunCalculation={handleRunCalculation}
              calcResult={calcResult}
              greenAlternatives={greenAlternatives}
            />
          )}

          {activeTab === "MARKETPLACE" && (
            <Marketplace
              projects={projects}
              onSelectProjectForOffset={handleSelectProjectForOffset}
            />
          )}

          {activeTab === "CERTIFICATES" && (
            <Certificates certificates={certificates} />
          )}
        </Suspense>
      )}

      {showOffsetModal && (
        <Suspense fallback={null}>
          <OffsetPurchase
            isOpen={showOffsetModal}
            onClose={() => setShowOffsetModal(false)}
            calculations={calculations}
            selectedCalculation={selectedCalculation}
            setSelectedCalculation={setSelectedCalculation}
            projects={projects}
            offsetSelectedProjectId={offsetSelectedProjectId}
            setOffsetSelectedProjectId={setOffsetSelectedProjectId}
            beneficiaryInput={beneficiaryInput}
            setBeneficiaryInput={setBeneficiaryInput}
            onConfirmOffset={handleConfirmOffset}
          />
        </Suspense>
      )}
    </div>
  );
}
