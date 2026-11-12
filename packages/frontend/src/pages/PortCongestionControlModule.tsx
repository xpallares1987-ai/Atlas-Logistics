/**
 * @file PortCongestionControlModule.tsx
 * @description Orchestrator for Predictive Port Congestion & AIS Berth Delay Early Warning Engine.
 * @module @atlas/frontend/pages
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Suspense, lazy } from "react";
import {
  Header,
  KpiStrip,
  Navigation,
  GeospatialMap,
  usePortCongestion,
} from "../components/PortCongestion";

const BerthRadar = lazy(
  () => import("../components/PortCongestion/Tab/BerthRadar"),
);
const LandsideDrayage = lazy(
  () => import("../components/PortCongestion/Tab/LandsideDrayage"),
);
const DdSuspension = lazy(
  () => import("../components/PortCongestion/Tab/DdSuspension"),
);

export default function PortCongestionControlModule() {
  const {
    activeTab,
    setActiveTab,
    selectedPortCode,
    handleSelectPort,
    searchTerm,
    setSearchTerm,
    selectedVessel,
    setSelectedVessel,
    copiedHash,
    berthCalls,
    certificates,
    certForm,
    setCertForm,
    activeHub,
    activeVessels,
    activeCollisions,
    activeDrayage,
    handleResolveCollision,
    handleRebalanceDrayage,
    handleGenerateCertificate,
    handleInitiateSuspensionFromVessel,
    handleCopyHash,
    handleDownloadPDF,
  } = usePortCongestion();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 space-y-6">
      <Header
        selectedPortCode={selectedPortCode}
        onSelectPort={handleSelectPort}
      />

      <KpiStrip activeHub={activeHub} />

      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeVesselsCount={activeVessels.length}
        activeCollisionsCount={activeCollisions.length}
        activeDrayageCount={activeDrayage.length}
        certificatesCount={certificates.length}
      />

      {activeTab === "GEOSPATIAL_MAP" && (
        <GeospatialMap
          activeHub={activeHub}
          activeVessels={activeVessels}
          selectedVessel={selectedVessel}
          onSelectVessel={setSelectedVessel}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onInitiateSuspensionFromVessel={handleInitiateSuspensionFromVessel}
        />
      )}

      {activeTab !== "GEOSPATIAL_MAP" && (
        <Suspense
          fallback={
            <div className="p-8 text-center text-slate-400 text-xs">
              Cargando telemetría portuaria...
            </div>
          }
        >
          {activeTab === "BERTH_RADAR" && (
            <BerthRadar
              activeHub={activeHub}
              activeCollisions={activeCollisions}
              berthCalls={berthCalls}
              selectedPortCode={selectedPortCode}
              onResolveCollision={handleResolveCollision}
            />
          )}

          {activeTab === "LANDSIDE_DRAYAGE" && (
            <LandsideDrayage
              activeDrayage={activeDrayage}
              onRebalanceDrayage={handleRebalanceDrayage}
            />
          )}

          {activeTab === "DD_SUSPENSION" && (
            <DdSuspension
              certForm={certForm}
              setCertForm={setCertForm}
              certificates={certificates}
              copiedHash={copiedHash}
              onGenerateCertificate={handleGenerateCertificate}
              onDownloadPDF={handleDownloadPDF}
              onCopyHash={handleCopyHash}
            />
          )}
        </Suspense>
      )}
    </div>
  );
}
