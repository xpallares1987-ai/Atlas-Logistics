/**
 * @file Calculator.tsx
 * @description Thermal Calculators & Physics Simulators tab (Arrhenius MKT, UN 1845 Dry Ice sublimation, and Reefer Genset diesel burn).
 * @module @atlas/frontend/components/ColdChain/Tab/Calculator
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { Activity, Snowflake, BatteryCharging } from "lucide-react";
import { Input } from "@atlas/ui";
import {
  DryIceSimResult,
  MktEvaluationResult,
  ReeferPowerSimResult,
} from "../../../types/cold-chain.types";

export interface CalculatorProps {
  calcTempsInput: string;
  setCalcTempsInput: (val: string) => void;
  calcMinTemp: number;
  setCalcMinTemp: (val: number) => void;
  calcMaxTemp: number;
  setCalcMaxTemp: (val: number) => void;
  mktResult: MktEvaluationResult | null;
  onRunMktCalc: () => void;

  simDryIceInitialKg: number;
  setSimDryIceInitialKg: (val: number) => void;
  simDryIceCurrentKg: number;
  setSimDryIceCurrentKg: (val: number) => void;
  simDryIceRate: number;
  setSimDryIceRate: (val: number) => void;
  simDryIceTransitHrs: number;
  setSimDryIceTransitHrs: (val: number) => void;
  dryIceResult: DryIceSimResult | null;
  onRunDryIceSim: () => void;

  simAmbientTemp: number;
  setSimAmbientTemp: (val: number) => void;
  simSetpointTemp: number;
  setSimSetpointTemp: (val: number) => void;
  simTransitHours: number;
  setSimTransitHours: (val: number) => void;
  simTankCapacity: number;
  setSimTankCapacity: (val: number) => void;
  reeferResult: ReeferPowerSimResult | null;
  onRunReeferSim: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({
  calcTempsInput,
  setCalcTempsInput,
  calcMinTemp,
  setCalcMinTemp,
  calcMaxTemp,
  setCalcMaxTemp,
  mktResult,
  onRunMktCalc,
  simDryIceInitialKg,
  setSimDryIceInitialKg,
  simDryIceCurrentKg,
  setSimDryIceCurrentKg,
  simDryIceRate,
  setSimDryIceRate,
  simDryIceTransitHrs,
  setSimDryIceTransitHrs,
  dryIceResult,
  onRunDryIceSim,
  simAmbientTemp,
  setSimAmbientTemp,
  simSetpointTemp,
  setSimSetpointTemp,
  simTransitHours,
  setSimTransitHours,
  simTankCapacity,
  setSimTankCapacity,
  reeferResult,
  onRunReeferSim,
}) => {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulator 1: MKT Arrhenius Calculator */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Activity size={18} className="text-cyan-400" />
            Temperatura Cinética Media (MKT)
          </h3>
          <p className="text-xs text-slate-400">
            Ecuación de Arrhenius (ΔH = 83.14 kJ/mol) para evaluar el impacto
            térmico real sobre la estabilidad farmacéutica.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 block mb-1">
                Serie de Temperaturas (°C)
              </label>
              <Input
                type="text"
                value={calcTempsInput}
                onChange={(e) => setCalcTempsInput(e.target.value)}
                placeholder="ej. 4.8, 5.2, 5.0, 8.4, 4.9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">
                  Mín. Permitido (°C)
                </label>
                <Input
                  type="number"
                  value={calcMinTemp}
                  onChange={(e) => setCalcMinTemp(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Máx. Permitido (°C)
                </label>
                <Input
                  type="number"
                  value={calcMaxTemp}
                  onChange={(e) => setCalcMaxTemp(Number(e.target.value))}
                />
              </div>
            </div>

            <button
              onClick={onRunMktCalc}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all"
            >
              Calcular MKT de Arrhenius
            </button>

            {mktResult && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">MKT Calculado:</span>
                  <span className="font-black text-cyan-400 text-sm">
                    {mktResult.mktCelsius}°C ({mktResult.mktKelvin} K)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Media Aritmética:</span>
                  <span className="font-bold text-slate-200">
                    {mktResult.avgRecordedCelsius}°C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Excursión Acumulada:</span>
                  <span className="font-bold text-amber-400">
                    {mktResult.totalExcursionMinutes} min
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 italic pt-1">
                  {mktResult.stabilityAuditNotes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Simulator 2: Dry Ice Sublimation (UN 1845) */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Snowflake size={18} className="text-blue-400" />
            Autonomía Hielo Seco (-80°C UN 1845)
          </h3>
          <p className="text-xs text-slate-400">
            Calcula la tasa de sublimación por delta térmico y la reserva en kg
            a la llegada estimada.
          </p>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">
                  Carga Inicial (kg)
                </label>
                <Input
                  type="number"
                  value={simDryIceInitialKg}
                  onChange={(e) =>
                    setSimDryIceInitialKg(Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Carga Actual (kg)
                </label>
                <Input
                  type="number"
                  value={simDryIceCurrentKg}
                  onChange={(e) =>
                    setSimDryIceCurrentKg(Number(e.target.value))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Tasa (kg/h)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={simDryIceRate}
                  onChange={(e) => setSimDryIceRate(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Tránsito Restante (h)
                </label>
                <Input
                  type="number"
                  value={simDryIceTransitHrs}
                  onChange={(e) =>
                    setSimDryIceTransitHrs(Number(e.target.value))
                  }
                />
              </div>
            </div>

            <button
              onClick={onRunDryIceSim}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
            >
              Estimar Autonomía & Pérdida
            </button>

            {dryIceResult && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Autonomía Restante:</span>
                  <span className="font-black text-blue-400 text-sm">
                    {dryIceResult.holdoverHoursRemaining} Horas
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Peso Proyectado Llegada:
                  </span>
                  <span className="font-bold text-white">
                    {dryIceResult.projectedWeightAtArrivalKg} kg
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 italic pt-1">
                  {dryIceResult.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Simulator 3: Reefer Genset Diesel & Power Draw */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <BatteryCharging size={18} className="text-emerald-400" />
            Genset Diésel Contenedor Reefer
          </h3>
          <p className="text-xs text-slate-400">
            Consumo diésel y autonomía del generador del contenedor frigorífico
            según diferencial térmico (ΔT).
          </p>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">
                  Temp. Ambiente (°C)
                </label>
                <Input
                  type="number"
                  value={simAmbientTemp}
                  onChange={(e) => setSimAmbientTemp(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Consigna Setpoint (°C)
                </label>
                <Input
                  type="number"
                  value={simSetpointTemp}
                  onChange={(e) => setSimSetpointTemp(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">
                  Horas de Trayecto
                </label>
                <Input
                  type="number"
                  value={simTransitHours}
                  onChange={(e) => setSimTransitHours(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Capacidad Depósito (L)
                </label>
                <Input
                  type="number"
                  value={simTankCapacity}
                  onChange={(e) => setSimTankCapacity(Number(e.target.value))}
                />
              </div>
            </div>

            <button
              onClick={onRunReeferSim}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
            >
              Estimar Consumo de Combustible
            </button>

            {reeferResult && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Diferencial Térmico (ΔT):
                  </span>
                  <span className="font-bold text-white">
                    {reeferResult.deltaTCelsius}°C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tasa de Consumo:</span>
                  <span className="font-black text-emerald-400">
                    {reeferResult.fuelBurnRateLitersPerHr} L/h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Consumo Total Estimado:
                  </span>
                  <span className="font-bold text-white">
                    {reeferResult.totalFuelConsumedLiters} Litros
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 italic pt-1">
                  {reeferResult.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
