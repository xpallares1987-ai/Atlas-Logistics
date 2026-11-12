/**
 * @file Journeys.tsx
 * @description Audited multimodal journeys list and itemized leg-by-leg WTW/TTW/WTT breakdown.
 * @module @atlas/frontend/components/CarbonEmissions/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button, Input } from "@atlas/ui";
import {
  ArrowRight,
  Award,
  Globe2,
  Layers,
  Leaf,
  Plane,
  Search,
  Ship,
  TrainTrack,
  Truck,
} from "lucide-react";
import type { JourneysTabProps } from "../../../types/carbon-emissions.types";
import { toFixed, toNumber } from "../hooks/useCarbonEmissions";

function getModeBadge(mode: string) {
  switch (mode) {
    case "OCEAN_CONTAINER":
    case "OCEAN_BULK":
      return {
        icon: <Ship size={14} className="text-blue-400" />,
        label: "Marítimo",
        bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      };
    case "AIR_FREIGHT":
    case "AIR_BELLY":
      return {
        icon: <Plane size={14} className="text-amber-400" />,
        label: "Aéreo",
        bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      };
    case "RAIL_ELECTRIC":
    case "RAIL_DIESEL":
      return {
        icon: <TrainTrack size={14} className="text-emerald-400" />,
        label: "Ferrocarril",
        bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      };
    case "ROAD_HVO":
    case "ROAD_EV":
      return {
        icon: <Truck size={14} className="text-green-400" />,
        label: "Carretera Eco",
        bg: "bg-green-500/10 text-green-400 border-green-500/20",
      };
    default:
      return {
        icon: <Truck size={14} className="text-slate-400" />,
        label: "Carretera Diésel",
        bg: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      };
  }
}

export function Journeys({
  calculations,
  searchQuery,
  setSearchQuery,
  selectedCalculation,
  onSelectCalculation,
  calcDetails,
  onNavigateCertificates,
  onOpenOffsetForCalc,
}: JourneysTabProps) {
  const totalCalcTco2eWtw = toNumber(calcDetails?.totalTco2eWtw);
  const totalCalcTco2eTtw = toNumber(calcDetails?.totalTco2eTtw);
  const totalCalcTco2eWtt = toNumber(calcDetails?.totalTco2eWtt);
  const totalCalcCarbonIntensity = toNumber(
    calcDetails?.carbonIntensityGco2ePerTkm,
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
      {/* List of Journeys */}
      <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe2 size={16} className="text-emerald-400" />
            Expediciones Multimodales
          </h3>
          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-bold">
            {calculations.length} registradas
          </span>
        </div>

        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            placeholder="Buscar por referencia o ciudad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-950/50 border-slate-700/60 text-xs text-white"
          />
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 max-h-137.5 pr-1">
          {calculations.map((calc) => {
            const isSelected = selectedCalculation?.id === calc.id;
            const isOffset = calc.status === "OFFSET_COMPLETED";

            return (
              <div
                key={calc.id}
                onClick={() => onSelectCalculation(calc)}
                className={`p-4 rounded-xl border transition cursor-pointer text-left ${
                  isSelected
                    ? "bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-950/50"
                    : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-white">
                    {calc.referenceCode}
                  </span>
                  <span
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                      isOffset
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {isOffset ? "COMPENSADO" : "PENDIENTE"}
                  </span>
                </div>

                <div className="text-xs text-slate-300 font-medium mb-2 flex items-center gap-1.5">
                  <span>{calc.originCity}</span>
                  <ArrowRight size={12} className="text-slate-500" />
                  <span>{calc.destinationCity}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/80 text-slate-400">
                  <div>
                    <span>Huella WTW: </span>
                    <strong className="text-emerald-400">
                      {calc.totalTco2eWtw
                        ? toNumber(calc.totalTco2eWtw).toFixed(3)
                        : 0}{" "}
                      t
                    </strong>
                  </div>
                  <div className="text-right">
                    <span>Distancia: </span>
                    <strong className="text-white">
                      {calc.totalDistanceKm} km
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Details & Leg-by-Leg Inspector */}
      <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 flex flex-col gap-6">
        {calcDetails ? (
          <>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-black text-white">
                    {calcDetails.referenceCode}
                  </h2>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      calcDetails.status === "OFFSET_COMPLETED"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {calcDetails.status === "OFFSET_COMPLETED"
                      ? "NEUTRALIDAD 100% CERTIFICADA"
                      : "HUELLA AUDITADA (SIN COMPENSAR)"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ruta: {calcDetails.originCity} ➔ {calcDetails.destinationCity}{" "}
                  | Peso Carga:{" "}
                  {(toNumber(calcDetails.totalWeightKg) / 1000).toFixed(2)}{" "}
                  Toneladas
                </p>
              </div>

              <div className="flex items-center gap-2">
                {calcDetails.status === "OFFSET_COMPLETED" ? (
                  <Button
                    onClick={onNavigateCertificates}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                  >
                    <Award size={14} />
                    Ver Certificado Oficial
                  </Button>
                ) : (
                  <Button
                    onClick={() => onOpenOffsetForCalc(calcDetails)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                  >
                    <Award size={14} />
                    Compensar con Créditos Verificados
                  </Button>
                )}
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-emerald-500/20">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Total WTW (Well-to-Wheel)
                </span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {toFixed(totalCalcTco2eWtw, 4)}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    tCO2e
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Intensidad: {toFixed(totalCalcCarbonIntensity, 2)} g/t-km
                </span>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Directo TTW (Tank-to-Wheel)
                </span>
                <span className="text-2xl font-black text-slate-200 mt-1 block">
                  {toFixed(totalCalcTco2eTtw, 4)}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    tCO2e
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Combustión operacional directa
                </span>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Indirecto WTT (Well-to-Tank)
                </span>
                <span className="text-2xl font-black text-slate-200 mt-1 block">
                  {toFixed(totalCalcTco2eWtt, 4)}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    tCO2e
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Extracción y refinado de combustible
                </span>
              </div>
            </div>

            {/* Itemized Legs */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Layers size={14} className="text-emerald-400" />
                Desglose Tramo a Tramo (Leg-by-Leg)
              </h3>

              <div className="flex flex-col gap-3">
                {calcDetails.legs?.map((leg: any) => {
                  const badge = getModeBadge(leg.mode);
                  const pctOfTotal =
                    totalCalcTco2eWtw > 0
                      ? (
                          (toNumber(leg.legTco2eWtw) / totalCalcTco2eWtw) *
                          100
                        ).toFixed(1)
                      : "0.0";

                  return (
                    <div
                      key={leg.id}
                      className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-white">
                          {leg.legOrder}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.bg}`}
                            >
                              {badge.icon}
                              {badge.label}
                            </span>
                            <span className="text-xs font-bold text-white">
                              {leg.originName} ➔ {leg.destinationName}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Distancia: {leg.distanceKm} km | Factor GLEC:{" "}
                            {leg.emissionFactorWtw} gCO2e/t-km
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-right w-full md:w-auto justify-between md:justify-end">
                        <div>
                          <span className="text-xs font-black text-emerald-400 block">
                            {toNumber(leg.legTco2eWtw).toFixed(4)} tCO2e
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {pctOfTotal}% del total
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-500">
            <Leaf size={48} className="text-slate-700 mb-3" />
            <h4 className="text-base font-bold text-slate-300">
              Selecciona una expedición para ver su auditoría Scope 3
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Explora el balance de emisiones tramo a tramo, compara factores
              GLEC y genera certificados de neutralidad.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
export default Journeys;
