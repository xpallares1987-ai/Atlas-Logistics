/**
 * @file Spot.tsx
 * @description Algorithmic multimodal spot rate calculator and margin simulation tab for Control Tower.
 * Calculates door-to-door breakdowns including ocean base rate, road BAF, EU ETS Maritime, THC, and customs.
 * @module @atlas/frontend/components/ControlTower/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { Sparkles, Zap, FileSpreadsheet } from "lucide-react";

export interface ControlTowerSpotTabProps {
  spotParams: {
    origin: string;
    destination: string;
    transportMode: string;
    containerType: string;
    distanceKm: number;
    targetMarginPct: number;
    includeCustoms: boolean;
  };
  setSpotParams: React.Dispatch<React.SetStateAction<any>>;
  spotQuote: any;
  handleCalculateSpot: () => void;
  isCalculatingSpot: boolean;
}

export const Spot: React.FC<ControlTowerSpotTabProps> = ({
  spotParams,
  setSpotParams,
  spotQuote,
  handleCalculateSpot,
  isCalculatingSpot,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Input Form */}
      <div className="lg:col-span-1 bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-400" />
          Parámetros de Cotización Puerta a Puerta
        </h2>

        <div className="flex flex-col gap-1.5 text-xs">
          <label className="text-slate-400 font-medium">Punto de Origen:</label>
          <input
            type="text"
            value={spotParams.origin}
            onChange={(e) =>
              setSpotParams({ ...spotParams, origin: e.target.value })
            }
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div className="flex flex-col gap-1.5 text-xs">
          <label className="text-slate-400 font-medium">Destino Final:</label>
          <input
            type="text"
            value={spotParams.destination}
            onChange={(e) =>
              setSpotParams({ ...spotParams, destination: e.target.value })
            }
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div className="flex flex-col gap-1.5 text-xs">
          <label className="text-slate-400 font-medium">
            Modo de Transporte:
          </label>
          <select
            value={spotParams.transportMode}
            onChange={(e) =>
              setSpotParams({
                ...spotParams,
                transportMode: e.target.value,
              })
            }
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="OCEAN_FCL">
              Marítimo FCL (Full Container Load)
            </option>
            <option value="RAIL_INTERMODAL">
              Ferrocarril Intermodal TEN-T (Bajo CO2)
            </option>
            <option value="ROAD_EXPRESS">Carretera Express Dedicado</option>
            <option value="AIR_CARGO">Carga Aérea Express (IATA)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 font-medium">
              Equipo / Unidad:
            </label>
            <select
              value={spotParams.containerType}
              onChange={(e) =>
                setSpotParams({
                  ...spotParams,
                  containerType: e.target.value,
                })
              }
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="20FT">20' Dry Standard</option>
              <option value="40FT">40' Dry Standard</option>
              <option value="40HC">40' High Cube</option>
              <option value="REEFER">40' Reefer Frío</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 font-medium">
              Distancia Terrestre:
            </label>
            <input
              type="number"
              value={spotParams.distanceKm}
              onChange={(e) =>
                setSpotParams({
                  ...spotParams,
                  distanceKm: Number(e.target.value),
                })
              }
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-xs">
          <label className="text-slate-400 font-medium">
            Margen Comercial Objetivo: {spotParams.targetMarginPct}%
          </label>
          <input
            type="range"
            min="5"
            max="35"
            value={spotParams.targetMarginPct}
            onChange={(e) =>
              setSpotParams({
                ...spotParams,
                targetMarginPct: Number(e.target.value),
              })
            }
            className="accent-indigo-500"
          />
        </div>

        <button
          onClick={handleCalculateSpot}
          disabled={isCalculatingSpot}
          className="mt-2 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Zap size={15} />
          {isCalculatingSpot ? "Calculando..." : "Calcular Tarifa Algorítmica"}
        </button>
      </div>

      {/* Output Breakdown */}
      <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex flex-col justify-between">
        {spotQuote ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <h3 className="font-bold text-base text-white">
                  Desglose de Cotización Spot Puerta a Puerta
                </h3>
                <p className="text-xs text-slate-400">
                  {spotQuote.origin} ➔ {spotQuote.destination} (
                  {spotQuote.transportMode})
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">
                  Tarifa Venta Final:
                </span>
                <div className="text-2xl font-black text-emerald-400">
                  €{spotQuote.sellRateTotal?.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Flete Base Porteador</span>
                <div className="text-base font-bold text-white mt-1">
                  €{spotQuote.baseFreight?.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Recargo Combustible BAF</span>
                <div className="text-base font-bold text-white mt-1">
                  €{spotQuote.fuelSurchargeBaf?.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Carbono EU ETS Maritime</span>
                <div className="text-base font-bold text-cyan-400 mt-1">
                  €{spotQuote.carbonSurchargeEts?.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">
                  Manipulación Terminal THC
                </span>
                <div className="text-base font-bold text-white mt-1">
                  €{(spotQuote.originThc + spotQuote.destThc)?.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">
                  Acarreo & Peajes Euroviñeta
                </span>
                <div className="text-base font-bold text-white mt-1">
                  €{spotQuote.inlandDrayageAndTolls?.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Despacho Aduanero</span>
                <div className="text-base font-bold text-white mt-1">
                  €{spotQuote.customsClearanceFee?.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-slate-300">
                  Coste Neto de Compra:{" "}
                  <strong>€{spotQuote.buyRateTotal?.toFixed(2)}</strong>
                </span>
                <div className="text-indigo-300 font-semibold mt-0.5">
                  Margen Comercial ({spotQuote.profitMarginPct}%): +€
                  {spotQuote.profitMarginAmount?.toFixed(2)}
                </div>
              </div>
              <div className="flex items-center gap-4 text-slate-300">
                <span>⏱️ Tránsito: ~{spotQuote.estimatedTransitDays}d</span>
                <span>🌿 Emisiones: {spotQuote.co2eKg} kg CO2e</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() =>
                  alert(
                    `Cotización guardada exitosamente con tarifa de €${spotQuote.sellRateTotal}.`,
                  )
                }
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-colors"
              >
                Convertir en Expediente / Reserva
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
            <FileSpreadsheet size={40} className="mb-2 opacity-50" />
            <p className="text-sm">
              Configura los parámetros a la izquierda y pulsa "Calcular Tarifa"
            </p>
            <p className="text-xs text-slate-600 mt-1">
              El motor calculará el desglose exacto de costes, márgenes y huella
              de carbono.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const SpotTab = Spot;
export const ControlTowerSpotTab = Spot;
