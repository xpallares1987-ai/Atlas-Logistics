/**
 * @file AxleLoad.tsx
 * @description Static road axle weight distribution analysis tab (EU Directive 96/53/EC).
 * @module @atlas/frontend/components/ContainerPlanner/Tab
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { AlertTriangle, Info } from "lucide-react";
import { StowageOptimizationResult } from "@atlas/shared";

// ============================================================================
// 1. PROPS INTERFACE
// ============================================================================

export interface AxleLoadProps {
  optResult: StowageOptimizationResult;
}

// ============================================================================
// 2. COMPONENT IMPLEMENTATION
// ============================================================================

export const AxleLoad: React.FC<AxleLoadProps> = ({ optResult }) => {
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Distribución Estática por Eje (Directiva 96/53/CE)
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            optResult.axleDistribution.isLegal
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
          }`}
        >
          {optResult.axleDistribution.isLegal ? "LEGAL / APTO" : "SOBREPESO"}
        </span>
      </div>

      {/* Steer Axle */}
      <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-white/5 space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-300">
            Eje Directriz Tractor (Eje 1)
          </span>
          <span className="font-mono font-bold text-white">
            {optResult.axleDistribution.steerAxleLoadKg.toLocaleString()} /
            7,000 kg
          </span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              optResult.axleDistribution.steerOverloadKg > 0
                ? "bg-rose-500"
                : "bg-indigo-500"
            }`}
            style={{
              width: `${Math.min(100, (optResult.axleDistribution.steerAxleLoadKg / 7000) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Drive Axle */}
      <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-white/5 space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-300">
            Eje Motriz Tractor (Quinta Rueda)
          </span>
          <span className="font-mono font-bold text-white">
            {optResult.axleDistribution.driveAxleLoadKg.toLocaleString()} /
            11,500 kg
          </span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              optResult.axleDistribution.driveOverloadKg > 0
                ? "bg-rose-500"
                : "bg-emerald-500"
            }`}
            style={{
              width: `${Math.min(100, (optResult.axleDistribution.driveAxleLoadKg / 11500) * 100)}%`,
            }}
          />
        </div>
        {optResult.axleDistribution.driveOverloadKg > 0 && (
          <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
            <AlertTriangle size={12} />
            Sobrecarga en eje motriz: +
            {optResult.axleDistribution.driveOverloadKg} kg sobre el límite
            legal.
          </div>
        )}
      </div>

      {/* Trailer Tridem */}
      <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-white/5 space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-300">
            Tridem Semirremolque (Bogie Trasero)
          </span>
          <span className="font-mono font-bold text-white">
            {optResult.axleDistribution.trailerTridemLoadKg.toLocaleString()} /
            24,000 kg
          </span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              optResult.axleDistribution.trailerOverloadKg > 0
                ? "bg-rose-500"
                : "bg-indigo-500"
            }`}
            style={{
              width: `${Math.min(100, (optResult.axleDistribution.trailerTridemLoadKg / 24000) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Diagnostic summary */}
      <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs text-slate-300 space-y-1">
        <div className="font-bold text-white flex items-center gap-1.5">
          <Info size={14} className="text-indigo-400" />
          Diagnóstico de Estiba:
        </div>
        <p className="text-[11px] text-slate-400">
          {optResult.axleDistribution.legalComplianceSummary}
        </p>
        {optResult.centerOfGravity.safetyRecommendations.map((rec, idx) => (
          <p key={idx} className="text-[11px] text-amber-400/90">
            • {rec}
          </p>
        ))}
      </div>
    </div>
  );
};

export default AxleLoad;
