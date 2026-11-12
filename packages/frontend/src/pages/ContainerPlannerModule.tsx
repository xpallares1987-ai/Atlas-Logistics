/**
 * @file ContainerPlannerModule.tsx
 * @description Modular orchestrator page for the 3D Container Stowage & Axle Load Engine (ADR 0020).
 * Coordinates the Three.js 3D viewport, SQLite entity bindings, Gemini CTU/IMDG safety audits, and workbench tabs.
 * @module @atlas/frontend/pages/ContainerPlannerModule
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React, { Suspense } from "react";
import { Scale, Flame, Layers, RefreshCw } from "lucide-react";
import { Button } from "@atlas/ui";
import {
  Header,
  GeminiAudit,
  EntitySelector,
  EquipmentKpi,
  Scene3D,
  AxleLoad,
  useContainerPlanner,
} from "../components/ContainerPlanner";

// ============================================================================
// 1. LAZY-LOADED SECONDARY WORKBENCH TABS
// ============================================================================

const ImdgSegregationTab = React.lazy(
  () => import("../components/ContainerPlanner/Tab/ImdgSegregation"),
);
const ManifestTab = React.lazy(
  () => import("../components/ContainerPlanner/Tab/Manifest"),
);

// ============================================================================
// 2. MAIN MODULE ORCHESTRATOR
// ============================================================================

export default function ContainerPlannerModule() {
  const planner = useContainerPlanner();

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-slate-950 text-slate-100">
      {/* 1. Top Operational Header */}
      <Header
        hasCargo={planner.cargoList.length > 0}
        isAuditingGemini={planner.isAuditingGemini}
        isCertifying={planner.isCertifying}
        onClearCargo={planner.handleClearCargo}
        onRecalculate={() => planner.handleRunOptimizer()}
        onRunGeminiAudit={() => planner.handleRunGeminiStowageAudit(false)}
        onCertifyStability={planner.handleCertifyStability}
      />

      {/* 2. Gemini CTU/IMDG Audit Banner */}
      <GeminiAudit
        auditResult={planner.geminiStowageAudit}
        onDismiss={() => planner.setGeminiStowageAudit(null)}
      />

      {/* 3. Relational SQLite Shipment & Container Selector */}
      <EntitySelector
        selectedShipmentId={planner.selectedShipmentId}
        onSelectShipmentId={planner.setSelectedShipmentId}
        selectedContainerId={planner.selectedContainerId}
        onSelectContainerId={planner.setSelectedContainerId}
        shipments={planner.shipments}
        availablePlans={planner.availablePlans}
        stowagePlan={planner.stowagePlan}
        isLoadingPlan={planner.isLoadingPlan}
        onRefreshPlan={() => planner.refetchStowagePlan()}
        certificationFeedback={planner.certificationFeedback}
        onDismissFeedback={() => planner.setCertificationFeedback(null)}
      />

      {/* 4. Equipment Specification Selector & 4 Live Telemetry KPIs */}
      <EquipmentKpi
        selectedContainerKey={planner.selectedContainerKey}
        activeContainer={planner.activeContainer}
        optResult={planner.optResult}
        onSelectContainer={planner.handleSelectContainer}
      />

      {/* 5. Main Split View: 3D WebGL Viewport (7 Cols) + Technical Workbench (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        <Scene3D
          activeContainer={planner.activeContainer}
          optResult={planner.optResult}
          selectedId={planner.selectedId}
          onSelectId={planner.setSelectedId}
          transformMode={planner.transformMode}
          onChangeTransformMode={planner.setTransformMode}
          showWalls={planner.showWalls}
          onToggleWalls={() => planner.setShowWalls(!planner.showWalls)}
          showCogMarker={planner.showCogMarker}
          onToggleCogMarker={() =>
            planner.setShowCogMarker(!planner.showCogMarker)
          }
          autoRotate={planner.autoRotate}
          onToggleAutoRotate={() => planner.setAutoRotate(!planner.autoRotate)}
          conflictingItemIds={planner.conflictingItemIds}
        />

        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            {/* Workbench Tab Navigation */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-4">
              <button
                onClick={() => planner.setActiveTab("AXLE")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  planner.activeTab === "AXLE"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Scale size={14} />
                Cargas por Eje
              </button>
              <button
                onClick={() => planner.setActiveTab("IMDG")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  planner.activeTab === "IMDG"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Flame size={14} />
                Segregación IMDG
              </button>
              <button
                onClick={() => planner.setActiveTab("MANIFEST")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  planner.activeTab === "MANIFEST"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Layers size={14} />
                Manifiesto ({planner.cargoList.length})
              </button>
            </div>

            {/* Workbench Active Tab Content */}
            <Suspense
              fallback={
                <div className="p-8 text-center text-xs text-slate-400 font-mono">
                  Cargando módulo de análisis...
                </div>
              }
            >
              {planner.activeTab === "AXLE" && (
                <AxleLoad optResult={planner.optResult} />
              )}
              {planner.activeTab === "IMDG" && (
                <ImdgSegregationTab optResult={planner.optResult} />
              )}
              {planner.activeTab === "MANIFEST" && (
                <ManifestTab
                  cargoList={planner.cargoList}
                  optResult={planner.optResult}
                  selectedId={planner.selectedId}
                  onSelectId={planner.setSelectedId}
                  onRemoveItem={planner.handleRemoveCargoItem}
                  onAddItem={planner.handleAddCargoItem}
                  newItemName={planner.newItemName}
                  onChangeNewItemName={planner.setNewItemName}
                  newItemLength={planner.newItemLength}
                  onChangeNewItemLength={planner.setNewItemLength}
                  newItemWidth={planner.newItemWidth}
                  onChangeNewItemWidth={planner.setNewItemWidth}
                  newItemHeight={planner.newItemHeight}
                  onChangeNewItemHeight={planner.setNewItemHeight}
                  newItemWeight={planner.newItemWeight}
                  onChangeNewItemWeight={planner.setNewItemWeight}
                  newItemStackable={planner.newItemStackable}
                  onChangeNewItemStackable={planner.setNewItemStackable}
                  newItemHazard={planner.newItemHazard}
                  onChangeNewItemHazard={planner.setNewItemHazard}
                />
              )}
            </Suspense>
          </div>

          {/* Heuristic Execution Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              Tiempo de cálculo heurístico:{" "}
              <strong className="font-mono text-emerald-400">
                {planner.optResult.executionTimeMs} ms
              </strong>
            </span>
            <Button
              onClick={() => planner.handleRunOptimizer()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center gap-1"
            >
              <RefreshCw size={13} />
              Re-calcular CoG
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
