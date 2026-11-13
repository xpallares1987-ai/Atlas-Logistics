/**
 * @file TrainConsist.tsx
 * @description Train consist & braking sheet simulator (TEN-T 750m) and active block train list.
 * @module @atlas/frontend/components/RailFreight/Tab/TrainConsist
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { Gauge, Layers, Download } from "lucide-react";
import { Input } from "@atlas/ui";
import {
  RailTrainConsist,
  TrainPhysicsResult,
} from "../../../types/rail-freight.types";

export interface TrainConsistProps {
  trains: RailTrainConsist[];
  simWagonCount: number;
  setSimWagonCount: (val: number) => void;
  simAvgWagonTare: number;
  setSimAvgWagonTare: (val: number) => void;
  simAvgWagonPayload: number;
  setSimAvgWagonPayload: (val: number) => void;
  simAvgWagonBrake: number;
  setSimAvgWagonBrake: (val: number) => void;
  simLocoWeight: number;
  setSimLocoWeight: (val: number) => void;
  simLocoBrake: number;
  setSimLocoBrake: (val: number) => void;
  trainPhysicsResult: TrainPhysicsResult | null;
  onRunTrainPhysics: () => void;
}

export const TrainConsist: React.FC<TrainConsistProps> = ({
  trains,
  simWagonCount,
  setSimWagonCount,
  simAvgWagonTare,
  setSimAvgWagonTare,
  simAvgWagonPayload,
  setSimAvgWagonPayload,
  simAvgWagonBrake,
  setSimAvgWagonBrake,
  simLocoWeight,
  setSimLocoWeight,
  simLocoBrake,
  setSimLocoBrake,
  trainPhysicsResult,
  onRunTrainPhysics,
}) => {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulator Inputs */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Gauge size={18} className="text-blue-400" />
            Cálculo de Convoy Ferroviario (TEN-T 750m)
          </h3>
          <p className="text-xs text-slate-400">
            Calcula la longitud del tren bloque, peso bruto total y porcentaje
            de masa frenada requerida.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 block mb-1">
                Número de Vagones en el Tren
              </label>
              <Input
                type="number"
                value={simWagonCount}
                onChange={(e) => setSimWagonCount(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">
                  Tara Media Vagón (t)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={simAvgWagonTare}
                  onChange={(e) => setSimAvgWagonTare(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Carga Media UTI (t)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={simAvgWagonPayload}
                  onChange={(e) =>
                    setSimAvgWagonPayload(Number(e.target.value))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">
                  Freno Vagón (t)
                </label>
                <Input
                  type="number"
                  step="1"
                  value={simAvgWagonBrake}
                  onChange={(e) => setSimAvgWagonBrake(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Loco Tara (t)
                </label>
                <Input
                  type="number"
                  step="1"
                  value={simLocoWeight}
                  onChange={(e) => setSimLocoWeight(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Loco Freno (t)
                </label>
                <Input
                  type="number"
                  step="1"
                  value={simLocoBrake}
                  onChange={(e) => setSimLocoBrake(Number(e.target.value))}
                />
              </div>
            </div>

            <button
              onClick={onRunTrainPhysics}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-600/20"
            >
              Calcular Dinámica de Tren & Frenado
            </button>

            {trainPhysicsResult && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Longitud Total del Convoy:
                  </span>
                  <span
                    className={`font-black ${trainPhysicsResult.isLengthCompliant ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {trainPhysicsResult.totalTrainLengthMeters} m / 750 m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Masa Bruta del Tren:</span>
                  <span className="font-bold text-white">
                    {trainPhysicsResult.totalGrossMassTonnes} Toneladas
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Porcentaje de Masa Frenada:
                  </span>
                  <span
                    className={`font-black ${trainPhysicsResult.isBrakeCompliant ? "text-blue-400" : "text-amber-400"}`}
                  >
                    {trainPhysicsResult.calculatedBrakePercentage}% (Mín: 65%)
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 italic pt-1 border-t border-white/10">
                  {trainPhysicsResult.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Active Train Consists List */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4 lg:col-span-2">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Layers size={18} className="text-emerald-400" />
            Trenes Bloque en Circulación & Boletines de Tracción
          </h3>
          <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
            {trains.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-sm">
                      {t.trainRunNumber}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {t.locomotiveSeries} | {t.tractionOperator}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Longitud: {t.totalTrainLengthMeters}m | Masa:{" "}
                    {t.totalGrossMassTonnes}t | Frenado:{" "}
                    {t.calculatedBrakePercentage}%
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/api/rail/trains/${t.id}/braking-sheet-pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-colors flex items-center gap-1"
                  >
                    <Download size={13} />
                    Boletín Frenado (PDF)
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
