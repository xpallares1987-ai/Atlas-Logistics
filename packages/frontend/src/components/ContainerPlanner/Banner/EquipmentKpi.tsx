/**
 * @file EquipmentKpi.tsx
 * @description Equipment catalog selector and 4 real-time KPI telemetry cards for volume, payload, CoG stability, and EU 96/53/EC axle load compliance.
 * @module @atlas/frontend/components/ContainerPlanner/Banner
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { Truck, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  EQUIPMENT_CATALOG,
  ContainerTypeKey,
  ContainerSpecification,
  StowageOptimizationResult,
} from "@atlas/shared";

// ============================================================================
// 1. PROPS INTERFACE
// ============================================================================

export interface EquipmentKpiProps {
  selectedContainerKey: ContainerTypeKey;
  activeContainer: ContainerSpecification;
  optResult: StowageOptimizationResult;
  onSelectContainer: (key: ContainerTypeKey) => void;
}

// ============================================================================
// 2. COMPONENT IMPLEMENTATION
// ============================================================================

export const EquipmentKpi: React.FC<EquipmentKpiProps> = ({
  selectedContainerKey,
  activeContainer,
  optResult,
  onSelectContainer,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Equipment Selector (4 Cols) */}
      <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Truck size={15} className="text-indigo-400" />
            Equipo de Transporte:
          </span>
          <span className="text-[10px] font-mono text-indigo-400 uppercase">
            {activeContainer.category}
          </span>
        </div>

        <select
          id="selected-container-type"
          name="selectedContainerType"
          aria-label="Tipo de Contenedor"
          value={selectedContainerKey}
          onChange={(e) =>
            onSelectContainer(e.target.value as ContainerTypeKey)
          }
          className="w-full bg-slate-950 border border-slate-800 text-white font-semibold text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
        >
          {Object.values(EQUIPMENT_CATALOG).map((spec) => (
            <option key={spec.key} value={spec.key}>
              {spec.name} ({spec.internalLengthM}m × {spec.internalWidthM}m ×{" "}
              {spec.internalHeightM}m)
            </option>
          ))}
        </select>

        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-center font-mono text-[11px]">
          <div className="bg-slate-950/60 p-2 rounded-xl">
            <div className="text-[9px] text-slate-500 uppercase">Volumen</div>
            <div className="font-bold text-white">
              {activeContainer.internalVolumeCbm} m³
            </div>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-xl">
            <div className="text-[9px] text-slate-500 uppercase">Carga Máx</div>
            <div className="font-bold text-emerald-400">
              {(activeContainer.maxPayloadKg / 1000).toFixed(1)} t
            </div>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-xl">
            <div className="text-[9px] text-slate-500 uppercase">Tara</div>
            <div className="font-bold text-slate-300">
              {activeContainer.tareWeightKg} kg
            </div>
          </div>
        </div>
      </div>

      {/* 4 Live KPI Cards (8 Cols) */}
      <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI 1: Volumen */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Cubicaje Utilizado
          </span>
          <div>
            <div className="text-xl font-black text-white">
              {optResult.totalCargoVolumeCbm.toFixed(1)}{" "}
              <span className="text-xs font-normal text-slate-400">
                / {activeContainer.internalVolumeCbm} m³
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, optResult.volumeUtilizationPercent)}%`,
                }}
              />
            </div>
          </div>
          <span className="text-[10px] text-indigo-400 font-mono mt-1">
            {optResult.volumeUtilizationPercent}% de ocupación
          </span>
        </div>

        {/* KPI 2: Payload */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Carga Útil Total
          </span>
          <div>
            <div className="text-xl font-black text-white">
              {(optResult.totalCargoWeightKg / 1000).toFixed(1)}{" "}
              <span className="text-xs font-normal text-slate-400">
                / {(activeContainer.maxPayloadKg / 1000).toFixed(1)} t
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  optResult.weightUtilizationPercent > 100
                    ? "bg-rose-500"
                    : "bg-emerald-500"
                }`}
                style={{
                  width: `${Math.min(100, optResult.weightUtilizationPercent)}%`,
                }}
              />
            </div>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono mt-1">
            {optResult.weightUtilizationPercent}% de masa máxima
          </span>
        </div>

        {/* KPI 3: Stability CoG */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Score Estabilidad CoG
          </span>
          <div>
            <div className="text-xl font-black text-white flex items-center gap-1.5">
              <span>{optResult.centerOfGravity.stabilityScore}</span>
              <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  optResult.centerOfGravity.stabilityScore >= 80
                    ? "bg-emerald-500"
                    : optResult.centerOfGravity.stabilityScore >= 60
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
                style={{
                  width: `${optResult.centerOfGravity.stabilityScore}%`,
                }}
              />
            </div>
          </div>
          <span
            className={`text-[10px] font-bold uppercase ${
              optResult.centerOfGravity.lateralStatus === "OPTIMAL"
                ? "text-emerald-400"
                : optResult.centerOfGravity.lateralStatus === "ACCEPTABLE"
                  ? "text-amber-400"
                  : "text-rose-400"
            }`}
          >
            {optResult.centerOfGravity.lateralStatus === "OPTIMAL"
              ? "Óptimo Balanceado"
              : optResult.centerOfGravity.lateralStatus === "ACCEPTABLE"
                ? "Aceptable"
                : "Riesgo de Escora"}
          </span>
        </div>

        {/* KPI 4: Axle Compliance */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Cargas por Eje
          </span>
          <div>
            <div className="text-xl font-black text-white flex items-center gap-1.5">
              {optResult.axleDistribution.isLegal ? (
                <CheckCircle2 size={20} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={20} className="text-rose-400" />
              )}
              <span className="text-sm font-bold">
                {optResult.axleDistribution.isLegal ? "Conforme" : "Sobrecarga"}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-300 mt-2">
              MMA:{" "}
              {(
                optResult.axleDistribution.grossCombinedWeightKg / 1000
              ).toFixed(1)}{" "}
              t
            </div>
          </div>
          <span
            className={`text-[10px] font-bold ${
              optResult.axleDistribution.isLegal
                ? "text-emerald-400"
                : "text-rose-400"
            }`}
          >
            {optResult.axleDistribution.isLegal
              ? "Directiva 96/53/CE OK"
              : "Infracción Legal"}
          </span>
        </div>
      </div>
    </div>
  );
};
