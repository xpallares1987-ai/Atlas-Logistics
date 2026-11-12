/**
 * @file CrossBorderUsmcaModule.tsx
 * @description Orchestrator page for the North American Cross-Border Corridor (SAT Carta Porte 3.1, USMCA RVC, IMMEX, Customs ML).
 * @module @atlas/frontend/pages
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import React, { Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Header,
  ShipmentSelector,
  Navigation,
  CartaPorte,
  useCrossBorder,
} from "../components/CrossBorder";

// ============================================================================
// 1. LAZY-LOADED SECONDARY TABS
// ============================================================================

const UsmcaImmex = React.lazy(() =>
  import("../components/CrossBorder/Tab/UsmcaImmex").then((m) => ({
    default: m.UsmcaImmex,
  })),
);
const CustomsMl = React.lazy(() =>
  import("../components/CrossBorder/Tab/CustomsMl").then((m) => ({
    default: m.CustomsMl,
  })),
);

// ============================================================================
// 2. MODULE ORCHESTRATOR
// ============================================================================

export default function CrossBorderUsmcaModule() {
  const vm = useCrossBorder();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      <Header />

      <ShipmentSelector
        shipments={vm.shipments}
        activeShipment={vm.activeShipment}
        selectedShipmentId={vm.selectedShipmentId}
        onSelectShipmentId={vm.setSelectedShipmentId}
        dbDeclaration={vm.dbDeclaration}
        isGenerating={vm.generateMutation.isPending}
        onGenerateCartaPorte={() =>
          vm.generateMutation.mutate({ shipmentId: vm.selectedShipmentId })
        }
      />

      <Navigation activeTab={vm.activeTab} onSelectTab={vm.setActiveTab} />

      <AnimatePresence mode="wait">
        {vm.activeTab === "CARTA_PORTE" && (
          <CartaPorte
            cartaPorteData={vm.cartaPorteData}
            stampingResult={vm.stampingResult}
            copiedXml={vm.copiedXml}
            copiedIdCCP={vm.copiedIdCCP}
            isStamping={vm.stampMutation.isPending}
            onExecuteStamping={vm.handleExecuteStamping}
            onCopyXml={vm.handleCopyXml}
            onCopyIdCCP={vm.handleCopyIdCCP}
          />
        )}

        <Suspense
          fallback={
            <div className="p-8 text-center text-xs text-slate-400">
              Cargando módulo transfronterizo...
            </div>
          }
        >
          {vm.activeTab === "USMCA_IMMEX" && (
            <UsmcaImmex
              rvcInputData={vm.rvcInputData}
              setRvcInputData={vm.setRvcInputData}
              rvcResult={vm.rvcResult}
              isCalculatingRvc={vm.rvcMutation.isPending}
              onExecuteRvc={vm.handleExecuteRvc}
              immexInputData={vm.immexInputData}
              setImmexInputData={vm.setImmexInputData}
              immexResult={vm.immexResult}
              isOptimizingImmex={vm.immexMutation.isPending}
              onExecuteImmex={vm.handleExecuteImmex}
            />
          )}

          {vm.activeTab === "CUSTOMS_ML" && (
            <CustomsMl
              dwellInputData={vm.dwellInputData}
              setDwellInputData={vm.setDwellInputData}
              dwellResult={vm.dwellResult}
              isPredictingCustoms={vm.customsMutation.isPending}
              onExecuteCustomsPrediction={vm.handleExecuteCustomsPrediction}
            />
          )}
        </Suspense>
      </AnimatePresence>
    </div>
  );
}
