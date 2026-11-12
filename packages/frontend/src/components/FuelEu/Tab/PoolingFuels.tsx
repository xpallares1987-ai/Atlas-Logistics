/**
 * @file PoolingFuels.tsx
 * @description Tab 3: Fleet Compliance Pooling (Art. 21) & Multi-Fuel Well-to-Wake Simulator.
 * @module @atlas/frontend/components/FuelEu/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Flame, ShieldCheck } from "lucide-react";
import { Input } from "@atlas/ui";
import type { PoolingFuelsTabProps } from "../../../types/fueleu.types";

export function PoolingFuels({
  fuels,
  simFuelCode,
  setSimFuelCode,
  simFuelTonnes,
  setSimFuelTonnes,
  simOpsKwh,
  setSimOpsKwh,
  fuelSimResult,
  onRunFuelSim,
  pools,
}: PoolingFuelsTabProps) {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Fuel Simulator */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Flame size={18} className="text-cyan-400" />
            Balance de Combustibles Verdes & Cumplimiento FuelEU
          </h3>
          <p className="text-xs text-slate-400">
            Evalúa el impacto de combustibles alternativos (E-Metanol, Bio-LNG,
            HVO) y conexión OPS en el balance de cumplimiento (CB).
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label
                htmlFor="fueleu-sim-fuel-code"
                className="text-slate-300 block mb-1"
              >
                Tipo de Combustible Principal
              </label>
              <select
                id="fueleu-sim-fuel-code"
                name="simFuelCode"
                value={simFuelCode}
                onChange={(e) => setSimFuelCode(e.target.value)}
                className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {fuels.map((f) => (
                  <option key={f.id} value={f.fuelCode}>
                    {f.fuelName} ({f.totalWtwFactorGco2eqPerMj} g/MJ)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="fueleu-sim-fuel-tonnes"
                  className="text-slate-400 block mb-1"
                >
                  Consumo Combustible (t)
                </label>
                <Input
                  id="fueleu-sim-fuel-tonnes"
                  name="simFuelTonnes"
                  type="number"
                  value={simFuelTonnes}
                  onChange={(e) => setSimFuelTonnes(Number(e.target.value))}
                />
              </div>
              <div>
                <label
                  htmlFor="fueleu-sim-ops-kwh"
                  className="text-slate-400 block mb-1"
                >
                  Electricidad OPS Muelle (kWh)
                </label>
                <Input
                  id="fueleu-sim-ops-kwh"
                  name="simOpsKwh"
                  type="number"
                  value={simOpsKwh}
                  onChange={(e) => setSimOpsKwh(Number(e.target.value))}
                />
              </div>
            </div>

            <button
              onClick={onRunFuelSim}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-md shadow-cyan-600/20"
            >
              Calcular Intensidad GEI & Balance
            </button>

            {fuelSimResult && (
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Intensidad WtW Obtenida:
                  </span>
                  <span className="font-bold text-white">
                    {fuelSimResult.ghgMetrics.calculatedGhgIntensityGco2eqPerMj.toFixed(
                      2,
                    )}{" "}
                    gCO2eq/MJ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Objetivo Regulatorio 2025:
                  </span>
                  <span className="font-bold text-slate-300">
                    {fuelSimResult.complianceMetrics.targetGhgIntensityGco2eqPerMj.toFixed(
                      2,
                    )}{" "}
                    gCO2eq/MJ
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/10">
                  <span className="text-slate-400 font-bold">
                    Estado de Cumplimiento:
                  </span>
                  <span
                    className={`font-black ${
                      fuelSimResult.complianceMetrics.isCompliant
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {fuelSimResult.complianceMetrics.complianceStatus} (
                    {fuelSimResult.complianceMetrics.complianceBalanceTonnesCo2eq.toFixed(
                      2,
                    )}{" "}
                    tCO2e)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Penalización Prevista:</span>
                  <span className="font-black text-amber-400">
                    {fuelSimResult.complianceMetrics.fuelEuPenaltyEur.toLocaleString(
                      "es-ES",
                      { minimumFractionDigits: 2 },
                    )}{" "}
                    €
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Compliance Pools */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            Agrupaciones de Cumplimiento de Flota (Pools - Art. 21)
          </h3>
          <p className="text-xs text-slate-400">
            La agrupación permite compensar déficits de buques convencionales
            con superávits de buques a metanol verde, neutralizando
            penalizaciones a 0,00 €.
          </p>

          <div className="space-y-3 overflow-y-auto max-h-[360px]">
            {pools.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-sm">
                        {p.poolName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Gestor: {p.managingOperatorName} | Año: {p.reportingYear}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-400">
                      +
                      {(
                        p.consolidatedNetComplianceBalanceGco2eq / 1_000_000
                      ).toFixed(1)}{" "}
                      t CO2e
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {p.totalEnrolledVesselsCount} Buques en Pool
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 italic pt-1 border-t border-white/10">
                  "{p.remarks}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
