/**
 * @file AxleAudit.tsx
 * @description EN 15528 maximum axle load calculator and rolling stock / TEN-T node catalog.
 * @module @atlas/frontend/components/RailFreight/Tab/AxleAudit
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { Scale, TrainTrack } from "lucide-react";
import { Input } from "@atlas/ui";
import {
  AxleLoadResult,
  RailCorridor,
  RailTerminal,
  RailWagon,
} from "../../../types/rail-freight.types";

export interface AxleAuditProps {
  wagons: RailWagon[];
  terminals: RailTerminal[];
  corridors: RailCorridor[];
  calcWagonTare: number;
  setCalcWagonTare: (val: number) => void;
  calcPayload: number;
  setCalcPayload: (val: number) => void;
  calcAxles: number;
  setCalcAxles: (val: number) => void;
  calcLineCategory: "A" | "B" | "C" | "D";
  setCalcLineCategory: (val: "A" | "B" | "C" | "D") => void;
  axleResult: AxleLoadResult | null;
  onRunAxleCalc: () => void;
}

export const AxleAudit: React.FC<AxleAuditProps> = ({
  wagons,
  terminals,
  corridors,
  calcWagonTare,
  setCalcWagonTare,
  calcPayload,
  setCalcPayload,
  calcAxles,
  setCalcAxles,
  calcLineCategory,
  setCalcLineCategory,
  axleResult,
  onRunAxleCalc,
}) => {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Axle Load Simulator */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Scale size={18} className="text-blue-400" />
            Auditor de Carga Máxima por Eje (Norma EN 15528)
          </h3>
          <p className="text-xs text-slate-400">
            Verifica la compatibilidad de carga por eje con las categorías de
            infraestructura UIC (Líneas A, B, C y D).
          </p>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">
                  Tara del Vagón (t)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={calcWagonTare}
                  onChange={(e) => setCalcWagonTare(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Carga Útil Transportada (t)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={calcPayload}
                  onChange={(e) => setCalcPayload(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">
                  Número de Ejes
                </label>
                <Input
                  type="number"
                  value={calcAxles}
                  onChange={(e) => setCalcAxles(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Categoría de Línea UIC
                </label>
                <select
                  value={calcLineCategory}
                  onChange={(e) =>
                    setCalcLineCategory(e.target.value as "A" | "B" | "C" | "D")
                  }
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="A">Línea A (Máx 16.0 t/eje)</option>
                  <option value="B">Línea B (Máx 18.0 t/eje)</option>
                  <option value="C">Línea C (Máx 20.0 t/eje)</option>
                  <option value="D">Línea D (Máx 22.5 t/eje - TEN-T)</option>
                </select>
              </div>
            </div>

            <button
              onClick={onRunAxleCalc}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-600/20"
            >
              Verificar Carga por Eje
            </button>

            {axleResult && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Masa Bruta del Vagón:</span>
                  <span className="font-bold text-white">
                    {axleResult.grossWagonMassTonnes} Toneladas
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Carga por Eje Calculada:
                  </span>
                  <span
                    className={`font-black text-sm ${axleResult.isCompliant ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {axleResult.calculatedAxleLoadTonnes} t/eje
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/10">
                  <span className="text-slate-400">
                    Límite Categoría {calcLineCategory}:
                  </span>
                  <span className="font-bold text-slate-300">
                    {axleResult.maxAllowedAxleLoadTonnes} t/eje
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 italic pt-1">
                  {axleResult.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rolling Stock & Infrastructure Catalog */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <TrainTrack size={18} className="text-indigo-400" />
            Parque de Vagones ({wagons.length}) & Nodos TEN-T (
            {terminals.length} Terminales / {corridors.length} Corredores)
          </h3>
          <div className="space-y-2 overflow-y-auto max-h-[300px] text-xs pr-1">
            {wagons.map((w) => (
              <div
                key={w.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-white">
                    {w.uicWagonNumber}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${w.isP400Certified ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"}`}
                  >
                    {w.isP400Certified ? "P400 CANGURO" : "FLATBED"}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px]">{w.wagonSeries}</p>
                <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>
                    Tara: {w.tareWeightTonnes}t | Ejes: {w.numberOfAxles}
                  </span>
                  <span>Carga Cat D: {w.maxPayloadCategoryD}t</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
