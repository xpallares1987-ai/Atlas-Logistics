/**
 * @file EtsGreenBaf.tsx
 * @description Tab 2: EU ETS Allowance Surrender & Green BAF Container Surcharge Simulator.
 * @module @atlas/frontend/components/FuelEu/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Calculator, Scale, Zap } from "lucide-react";
import { Input } from "@atlas/ui";
import type {
  EtsGreenBafTabProps,
  FuelEuGeographicScope,
} from "../../../types/fueleu.types";

export function EtsGreenBaf({
  simScope,
  setSimScope,
  simCo2Tonnes,
  setSimCo2Tonnes,
  simCh4Tonnes,
  setSimCh4Tonnes,
  simN2oTonnes,
  setSimN2oTonnes,
  simEuaPrice,
  setSimEuaPrice,
  simCarriedTeus,
  setSimCarriedTeus,
  simFueleuImpact,
  setSimFueleuImpact,
  etsSimResult,
  onRunEtsCalc,
}: EtsGreenBafTabProps) {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulator Inputs */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Calculator size={18} className="text-cyan-400" />
            Cálculo EU ETS & Recargo Green BAF
          </h3>
          <p className="text-xs text-slate-400">
            Calcula la entrega de derechos EUA y el recargo ecológico
            repercutible por contenedor (TEU / FEU).
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label
                htmlFor="fueleu-sim-scope"
                className="text-slate-300 block mb-1"
              >
                Ámbito Geográfico
              </label>
              <select
                id="fueleu-sim-scope"
                name="simScope"
                value={simScope}
                onChange={(e) =>
                  setSimScope(e.target.value as FuelEuGeographicScope)
                }
                className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="INTRA_EU_100">
                  Intra-UE / Puertos EEA (100% Cobertura)
                </option>
                <option value="EXTRA_EU_50">
                  Extra-UE / Terceros Países (50% Cobertura)
                </option>
                <option value="BERTH_PORT_EU_100">
                  Atraque en Puerto UE (100% Cobertura)
                </option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label
                  htmlFor="fueleu-sim-co2"
                  className="text-slate-400 block mb-1"
                >
                  CO2 (t)
                </label>
                <Input
                  id="fueleu-sim-co2"
                  name="simCo2Tonnes"
                  type="number"
                  value={simCo2Tonnes}
                  onChange={(e) => setSimCo2Tonnes(Number(e.target.value))}
                />
              </div>
              <div>
                <label
                  htmlFor="fueleu-sim-ch4"
                  className="text-slate-400 block mb-1"
                >
                  CH4 (t)
                </label>
                <Input
                  id="fueleu-sim-ch4"
                  name="simCh4Tonnes"
                  type="number"
                  step="0.01"
                  value={simCh4Tonnes}
                  onChange={(e) => setSimCh4Tonnes(Number(e.target.value))}
                />
              </div>
              <div>
                <label
                  htmlFor="fueleu-sim-n2o"
                  className="text-slate-400 block mb-1"
                >
                  N2O (t)
                </label>
                <Input
                  id="fueleu-sim-n2o"
                  name="simN2oTonnes"
                  type="number"
                  step="0.01"
                  value={simN2oTonnes}
                  onChange={(e) => setSimN2oTonnes(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="fueleu-sim-eua-price"
                  className="text-slate-400 block mb-1"
                >
                  Precio EUA (€/t)
                </label>
                <Input
                  id="fueleu-sim-eua-price"
                  name="simEuaPrice"
                  type="number"
                  value={simEuaPrice}
                  onChange={(e) => setSimEuaPrice(Number(e.target.value))}
                />
              </div>
              <div>
                <label
                  htmlFor="fueleu-sim-teus"
                  className="text-slate-400 block mb-1"
                >
                  TEUs Transportados
                </label>
                <Input
                  id="fueleu-sim-teus"
                  name="simCarriedTeus"
                  type="number"
                  value={simCarriedTeus}
                  onChange={(e) => setSimCarriedTeus(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="fueleu-sim-impact"
                className="text-slate-400 block mb-1"
              >
                Impacto/Penalización FuelEU (€)
              </label>
              <Input
                id="fueleu-sim-impact"
                name="simFueleuImpact"
                type="number"
                value={simFueleuImpact}
                onChange={(e) => setSimFueleuImpact(Number(e.target.value))}
              />
            </div>

            <button
              onClick={onRunEtsCalc}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-md shadow-cyan-600/20"
            >
              Calcular Derechos ETS & Green BAF
            </button>
          </div>
        </div>

        {/* Simulator Output */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4 lg:col-span-2">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Scale size={18} className="text-amber-400" />
            Resultados de Liquidación de Derechos & Tarifas Ecológicas
          </h3>

          {etsSimResult ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                  <span className="text-slate-400 block">
                    Emisiones Brutas GEI
                  </span>
                  <p className="text-xl font-black text-white mt-1">
                    {etsSimResult.etsLiability.totalGrossGhgTco2eq.toFixed(2)}{" "}
                    tCO2e
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Incluye CH4 (x28) y N2O (x265)
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                  <span className="text-slate-400 block">
                    Derechos Exigibles EU ETS
                  </span>
                  <p className="text-xl font-black text-amber-400 mt-1">
                    {etsSimResult.etsLiability.applicableScopeEmissionsTco2eq.toFixed(
                      2,
                    )}{" "}
                    EUA
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Factor de ámbito: x{etsSimResult.etsLiability.scopeFactor}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                  <span className="text-slate-400 block">
                    Obligación Financiera Total
                  </span>
                  <p className="text-xl font-black text-emerald-400 mt-1">
                    {etsSimResult.etsLiability.totalEtsFinancialLiabilityEur.toLocaleString(
                      "es-ES",
                      { minimumFractionDigits: 2 },
                    )}{" "}
                    €
                  </p>
                  <span className="text-[10px] text-slate-400">
                    @ {etsSimResult.etsLiability.euaPriceEurPerTonne} €/EUA
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-3">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <Zap size={14} className="text-cyan-400" />
                    Desglose de Recargo Verde (Green BAF)
                  </span>
                  <span className="text-xs text-cyan-300 font-bold">
                    Base: {etsSimResult.greenBaf.carriedTeus} TEUs
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 block">
                      Impacto FuelEU por TEU:
                    </span>
                    <p className="text-base font-bold text-white mt-0.5">
                      {etsSimResult.greenBaf.fueleuImpactPerTeuEur.toFixed(2)} €
                      / TEU
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block">
                      Coste EU ETS por TEU:
                    </span>
                    <p className="text-base font-bold text-white mt-0.5">
                      {etsSimResult.greenBaf.etsImpactPerTeuEur.toFixed(2)} € /
                      TEU
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold text-cyan-300">
                      Recargo Total Green BAF:
                    </span>
                    <p className="text-lg font-black text-cyan-400 mt-0.5">
                      {etsSimResult.greenBaf.totalGreenBafSurchargePerTeuEur.toFixed(
                        2,
                      )}{" "}
                      € / TEU
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                  <span className="text-slate-300 font-medium">
                    Recargo Total para Contenedor 40ft (FEU / 2 TEUs):
                  </span>
                  <span className="font-black text-emerald-400 text-base">
                    {etsSimResult.greenBaf.totalGreenSurchargeFor40FtContainerEur.toFixed(
                      2,
                    )}{" "}
                    €
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-sm">
              Configure los parámetros de travesía y ejecute el cálculo para
              visualizar la liquidación EU ETS y los recargos por TEU.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
