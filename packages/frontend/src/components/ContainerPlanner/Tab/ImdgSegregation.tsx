/**
 * @file ImdgSegregation.tsx
 * @description IMDG 7.2.4 dangerous goods segregation verification tab inside cargo transport units (CTU).
 * @module @atlas/frontend/components/ContainerPlanner/Tab
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { StowageOptimizationResult } from "@atlas/shared";

// ============================================================================
// 1. PROPS INTERFACE
// ============================================================================

export interface ImdgSegregationProps {
  optResult: StowageOptimizationResult;
}

// ============================================================================
// 2. COMPONENT IMPLEMENTATION
// ============================================================================

export const ImdgSegregation: React.FC<ImdgSegregationProps> = ({
  optResult,
}) => {
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          Segregación IMDG 7.2.4 en Unidad de Carga (CTU)
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            optResult.imoSegregation.hasIncompatibleHazard
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          }`}
        >
          {optResult.imoSegregation.hasIncompatibleHazard
            ? "INCOMPATIBLE"
            : "CONFORME"}
        </span>
      </div>

      {optResult.imoSegregation.checks.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs">
          No hay mercancías peligrosas declaradas en este contenedor. Carga
          clasificada como carga general.
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {optResult.imoSegregation.checks.map((chk, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                chk.isCompliant
                  ? "bg-slate-950/70 border-emerald-500/30 text-slate-200"
                  : "bg-rose-950/40 border-rose-500/50 text-rose-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">
                  {chk.itemAName}{" "}
                  <span className="text-amber-400 font-mono">
                    (Clase {chk.classA})
                  </span>{" "}
                  vs {chk.itemBName}{" "}
                  <span className="text-amber-400 font-mono">
                    (Clase {chk.classB})
                  </span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    chk.isCompliant
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/20 text-rose-400"
                  }`}
                >
                  {chk.isCompliant ? "CUMPLE" : "VIOLACIÓN"}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 flex justify-between">
                <span>
                  Distancia 3D:{" "}
                  <strong className="font-mono text-white">
                    {chk.actualDistanceM}m
                  </strong>
                </span>
                <span>
                  Requerimiento IMDG:{" "}
                  <strong className="font-mono text-indigo-400">
                    Código {chk.imdgRequirementCode}
                  </strong>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                {chk.statusMessage}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImdgSegregation;
