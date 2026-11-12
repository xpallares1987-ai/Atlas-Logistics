/**
 * @file EntitySelector.tsx
 * @description Dynamic SQLite shipment and container stowage selector bar with IMO/CSS Code Annex 13 certification badge.
 * @module @atlas/frontend/components/ContainerPlanner/Banner
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { Database, RefreshCw, ShieldCheck, CheckCircle2 } from "lucide-react";
import {
  StowagePlanSummary,
  CertificationFeedback,
} from "../../../types/container-planner.types";

// ============================================================================
// 1. PROPS INTERFACE
// ============================================================================

export interface EntitySelectorProps {
  selectedShipmentId: string;
  onSelectShipmentId: (id: string) => void;
  selectedContainerId: string;
  onSelectContainerId: (id: string) => void;
  shipments: any[];
  availablePlans: StowagePlanSummary[];
  stowagePlan: any;
  isLoadingPlan: boolean;
  onRefreshPlan: () => void;
  certificationFeedback: CertificationFeedback | null;
  onDismissFeedback: () => void;
}

// ============================================================================
// 2. COMPONENT IMPLEMENTATION
// ============================================================================

export const EntitySelector: React.FC<EntitySelectorProps> = ({
  selectedShipmentId,
  onSelectShipmentId,
  selectedContainerId,
  onSelectContainerId,
  shipments,
  availablePlans,
  stowagePlan,
  isLoadingPlan,
  onRefreshPlan,
  certificationFeedback,
  onDismissFeedback,
}) => {
  const dynamicPlans = availablePlans.filter(
    (p) => p.containerId !== "cnt_msku_9284712",
  );

  return (
    <>
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Expedición & Contenedor SQLite:
            </span>
          </div>

          <select
            id="stowage-shipment-select"
            aria-label="Seleccionar Expedición"
            value={selectedShipmentId}
            onChange={(e) => onSelectShipmentId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-1.5 font-mono focus:outline-none focus:border-indigo-500"
          >
            <option value="sh_demo_01">
              sh_demo_01 • BK-2026-67116 (MSC ISABELLA)
            </option>
            {shipments
              .filter((s: any) => s.id !== "sh_demo_01")
              .map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.id} • {s.trackingNumber || s.vesselName || "Expedición"}
                </option>
              ))}
          </select>

          <select
            id="stowage-container-select"
            aria-label="Seleccionar Contenedor"
            value={selectedContainerId}
            onChange={(e) => onSelectContainerId(e.target.value)}
            className="bg-slate-950 border border-indigo-500/40 text-xs text-indigo-300 rounded-xl px-3 py-1.5 font-mono focus:outline-none focus:border-indigo-500"
          >
            <option value="cnt_msku_9284712">
              cnt_msku_9284712 • MSKU9284712 (40&apos; High Cube • Seal:
              ISO-17712-H-881920)
            </option>
            {dynamicPlans.map((plan) => (
              <option key={plan.id} value={plan.containerId}>
                {plan.containerId} • {plan.shipmentId} (
                {(plan.totalCargoWeightKg / 1000).toFixed(1)}t /{" "}
                {plan.volumeUtilizationPercent}% Vol)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onRefreshPlan}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-xl transition"
            title="Sincronizar con SQLite"
          >
            <RefreshCw
              size={13}
              className={isLoadingPlan ? "animate-spin text-indigo-400" : ""}
            />
            <span>Sincronizar DB</span>
          </button>
        </div>

        {/* Official Marine Stability Certification Badge */}
        {stowagePlan?.stabilityCertified && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
            <div className="text-[11px] leading-tight">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <span>Certificado IMO/CSS Code Anexo 13</span>
                <span className="text-[10px] font-mono bg-emerald-500/20 px-1.5 py-0.2 rounded text-emerald-200">
                  VERIFIED
                </span>
              </div>
              <div className="text-slate-400 font-mono text-[10px]">
                Firmado: {stowagePlan.certifiedBy || "Chief Mate Roberts"} •{" "}
                {stowagePlan.certifiedAt
                  ? new Date(stowagePlan.certifiedAt * 1000).toLocaleString()
                  : "Reciente"}
              </div>
            </div>
          </div>
        )}
      </div>

      {certificationFeedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center justify-between ${
            certificationFeedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{certificationFeedback.message}</span>
          </div>
          <button
            onClick={onDismissFeedback}
            className="text-slate-400 hover:text-white text-[11px] underline"
          >
            Cerrar
          </button>
        </div>
      )}
    </>
  );
};
