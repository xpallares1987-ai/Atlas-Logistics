/**
 * @file Calculator.tsx
 * @description Multimodal GLEC v3 footprint calculator and green corridor simulator tab.
 * @module @atlas/frontend/components/CarbonEmissions/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button, Input } from "@atlas/ui";
import {
  Calculator as CalculatorIcon,
  Plus,
  Sparkles,
  Trash2,
  TreePine,
  TrendingDown,
} from "lucide-react";
import type { CalculatorTabProps } from "../../../types/carbon-emissions.types";
import { toFixed, toNumber } from "../hooks/useCarbonEmissions";

export function Calculator({
  calcRefCode,
  setCalcRefCode,
  calcOriginCity,
  setCalcOriginCity,
  calcDestinationCity,
  setCalcDestinationCity,
  calcLegs,
  onAddLeg,
  onRemoveLeg,
  onLegChange,
  onRunCalculation,
  calcResult,
  greenAlternatives,
}: CalculatorTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
      {/* Journey Builder */}
      <div className="lg:col-span-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CalculatorIcon size={16} className="text-emerald-400" />
              Configurador de Ruta Multimodal
            </h3>
            <p className="text-xs text-slate-400">
              Define los tramos de origen a destino con pesos y modos de
              transporte
            </p>
          </div>
          <Button
            onClick={onAddLeg}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5"
          >
            <Plus size={14} />
            Añadir Tramo
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Referencia Simulación
            </label>
            <Input
              value={calcRefCode}
              onChange={(e) => setCalcRefCode(e.target.value)}
              className="bg-slate-950 border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Ciudad Origen
            </label>
            <Input
              value={calcOriginCity}
              onChange={(e) => setCalcOriginCity(e.target.value)}
              className="bg-slate-950 border-slate-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Ciudad Destino
            </label>
            <Input
              value={calcDestinationCity}
              onChange={(e) => setCalcDestinationCity(e.target.value)}
              className="bg-slate-950 border-slate-700 text-xs text-white"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto max-h-105 pr-1">
          {calcLegs.map((leg, index) => (
            <div
              key={index}
              className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col gap-3 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">
                  Tramo #{index + 1}
                </span>
                {calcLegs.length > 1 && (
                  <button
                    onClick={() => onRemoveLeg(index)}
                    className="text-slate-500 hover:text-red-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-slate-400 block mb-1">
                    Punto de Salida
                  </label>
                  <Input
                    value={leg.originName}
                    onChange={(e) =>
                      onLegChange(index, "originName", e.target.value)
                    }
                    className="bg-slate-900 border-slate-700 text-xs text-white"
                    placeholder="Ej. Puerto de Valencia"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-400 block mb-1">
                    Punto de Llegada
                  </label>
                  <Input
                    value={leg.destinationName}
                    onChange={(e) =>
                      onLegChange(index, "destinationName", e.target.value)
                    }
                    className="bg-slate-900 border-slate-700 text-xs text-white"
                    placeholder="Ej. Madrid Dry Port"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-slate-400 block mb-1">
                    Modo de Transporte
                  </label>
                  <select
                    value={leg.mode}
                    onChange={(e) => onLegChange(index, "mode", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="OCEAN_CONTAINER">
                      Marítimo (Portacontenedores 15k TEU)
                    </option>
                    <option value="OCEAN_BULK">
                      Marítimo Granelero (Capesize)
                    </option>
                    <option value="AIR_FREIGHT">
                      Aéreo Carguero Puro (B777F)
                    </option>
                    <option value="AIR_BELLY">
                      Aéreo Pasajeros (Belly Cargo)
                    </option>
                    <option value="ROAD_DIESEL">
                      Carretera Camión Diésel Euro 6
                    </option>
                    <option value="ROAD_HVO">Carretera HVO100 Renovable</option>
                    <option value="ROAD_EV">Carretera Eléctrico (BEV)</option>
                    <option value="RAIL_ELECTRIC">
                      Ferrocarril Eléctrico (Mix UE)
                    </option>
                    <option value="RAIL_DIESEL">Ferrocarril Diésel</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-400 block mb-1">
                    Distancia (km)
                  </label>
                  <Input
                    type="number"
                    value={leg.distanceKm}
                    onChange={(e) =>
                      onLegChange(
                        index,
                        "distanceKm",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="bg-slate-900 border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-400 block mb-1">
                    Peso Carga (kg)
                  </label>
                  <Input
                    type="number"
                    value={leg.weightKg}
                    onChange={(e) =>
                      onLegChange(
                        index,
                        "weightKg",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className="bg-slate-900 border-slate-700 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={onRunCalculation}
          className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2"
        >
          <Sparkles size={16} />
          Calcular Huella GLEC v3 & Analizar Corredores Verdes
        </Button>
      </div>

      {/* Simulation Output & Green Alternatives */}
      <div className="lg:col-span-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 flex flex-col gap-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
          <TrendingDown size={16} className="text-emerald-400" />
          Resultado de Auditoría & Comparativa Ecológica
        </h3>

        {calcResult ? (
          <div className="flex flex-col gap-5">
            {/* Result Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-400 uppercase block">
                  Total WTW
                </span>
                <span className="text-xl font-black text-white mt-1 block">
                  {toNumber(calcResult.totalTco2eWtw).toFixed(4)} t
                </span>
                <span className="text-[10px] text-slate-400">
                  {calcResult.totalDistanceKm} km totales
                </span>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Directo TTW
                </span>
                <span className="text-xl font-black text-slate-200 mt-1 block">
                  {toNumber(calcResult.totalTco2eTtw).toFixed(4)} t
                </span>
                <span className="text-[10px] text-slate-400">
                  Combustión motriz
                </span>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Intensidad
                </span>
                <span className="text-xl font-black text-emerald-400 mt-1 block">
                  {calcResult.carbonIntensityGco2ePerTkm}
                </span>
                <span className="text-[10px] text-slate-400">gCO2e / t-km</span>
              </div>
            </div>

            {/* Green Alternatives List */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TreePine size={15} className="text-emerald-400" />
                Opciones de Corredores Verdes Recomendadas
              </h4>

              {greenAlternatives.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {greenAlternatives.map((alt, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/20 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-300">
                          {alt.modeName}
                        </span>
                        <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                          -{alt.reductionPercentage}% CO2e
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {alt.description}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                        <span className="text-slate-400">
                          Emisión con esta ruta:{" "}
                          <strong className="text-white">
                            {toFixed(alt.simulatedTco2eWtw, 4)} t
                          </strong>
                        </span>
                        <span className="text-emerald-400 font-bold">
                          Ahorro: {toFixed(alt.savedTco2e, 4)} tCO2e
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-950/40 p-6 rounded-xl text-center text-xs text-slate-400">
                  Esta ruta ya utiliza tramos altamente optimizados en bajas
                  emisiones (Tren Eléctrico / HVO).
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-500">
            <CalculatorIcon size={44} className="text-slate-700 mb-2" />
            <h4 className="text-sm font-bold text-slate-300">
              Configura los tramos y ejecuta el cálculo
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              El motor aplicará los factores de emisión GLEC v3 y generará
              propuestas de descarbonización.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
export default Calculator;
