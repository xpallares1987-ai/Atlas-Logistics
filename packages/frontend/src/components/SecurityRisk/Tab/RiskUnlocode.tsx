/**
 * @file RiskUnlocode.tsx
 * @description Tab 3: Multimodal Route Risk Scorer (1-100) & UN/LOCODE Prefix Trie + LRU Cache search.
 * @module @atlas/frontend/components/SecurityRisk/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { motion } from "framer-motion";
import { Activity, ChevronRight, Globe2, Search } from "lucide-react";
import { getUnlocodeStats } from "@atlas/shared";
import { Button, Input } from "@atlas/ui";
import type { RiskUnlocodeTabProps } from "../../../types/security-risk.types";

export function RiskUnlocode({
  originPort,
  setOriginPort,
  destinationPort,
  setDestinationPort,
  transportType,
  setTransportType,
  isHighPriority,
  setIsHighPriority,
  shipmentStatus,
  setShipmentStatus,
  predictedDelay,
  setPredictedDelay,
  riskResult,
  riskBadge,
  unlocodeQuery,
  unlocodeCountry,
  unlocodeResults,
  onSearchUnlocodes,
}: RiskUnlocodeTabProps) {
  const stats = getUnlocodeStats();

  return (
    <motion.div
      key="risk_unlocode"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      {/* Left: Dynamic Risk Scorer Simulator */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
              <Activity size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Calculador de Riesgo de Ruta Multimodal (1–100)
              </h3>
              <p className="text-xs text-slate-500">
                Ponderación en tiempo real de meteorología, geopolítica, puertos
                y SLA
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${riskBadge.bg} ${riskBadge.text} ${riskBadge.border}`}
          >
            Nivel {riskResult.level} ({riskResult.score}/100)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Puerto Origen (UN/LOCODE)
            </label>
            <select
              value={originPort}
              onChange={(e) => setOriginPort(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200"
            >
              <option value="CNSHA">CNSHA - Shanghai, China</option>
              <option value="SGSIN">SGSIN - Singapur Hub</option>
              <option value="NLRTM">NLRTM - Rotterdam, Países Bajos</option>
              <option value="ESBCN">ESBCN - Barcelona, España</option>
              <option value="MXVER">MXVER - Veracruz, México</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Puerto Destino (UN/LOCODE)
            </label>
            <select
              value={destinationPort}
              onChange={(e) => setDestinationPort(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200"
            >
              <option value="USLAX">USLAX - Los Angeles, EE.UU.</option>
              <option value="USNYC">USNYC - New York, EE.UU.</option>
              <option value="NLRTM">NLRTM - Rotterdam, Países Bajos</option>
              <option value="ESVLC">ESVLC - Valencia, España</option>
              <option value="MXNLD">MXNLD - Nuevo Laredo, México</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Modo
            </label>
            <select
              value={transportType}
              onChange={(e) => setTransportType(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200"
            >
              <option value="SEA">Marítimo (Ocean)</option>
              <option value="AIR">Aéreo (Air)</option>
              <option value="ROAD">Carretera (Road)</option>
              <option value="RAIL">Ferroviario (Rail)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Estado
            </label>
            <select
              value={shipmentStatus}
              onChange={(e) => setShipmentStatus(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200"
            >
              <option value="delayed">Con Retraso (Delayed)</option>
              <option value="intransit">En Tránsito (On Time)</option>
              <option value="customs_hold">Retenido en Aduana</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Retraso Estimado
            </label>
            <Input
              type="number"
              value={predictedDelay}
              onChange={(e) => setPredictedDelay(Number(e.target.value))}
              className="w-full text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="highPriority"
            checked={isHighPriority}
            onChange={(e) => setIsHighPriority(e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <label
            htmlFor="highPriority"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Carga de Alta Prioridad / Alto Valor Asegurado (Aplica multiplicador
            de sensibilidad 1.12x)
          </label>
        </div>

        {/* Breakdown Bars */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">
              Riesgo Meteorológico (Tifones / Oleaje):
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {riskResult.weatherRisk} / 30 pts
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-sky-500 h-full"
              style={{ width: `${(riskResult.weatherRisk / 30) * 100}%` }}
            />
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-slate-500">
              Riesgo Geopolítico (Mar Rojo / Aranceles):
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {riskResult.politicalRisk} / 30 pts
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-red-500 h-full"
              style={{ width: `${(riskResult.politicalRisk / 30) * 100}%` }}
            />
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-slate-500">
              Congestión de Terminal / Huelgas Portuarias:
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {riskResult.portDelayRisk} / 30 pts
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full"
              style={{ width: `${(riskResult.portDelayRisk / 30) * 100}%` }}
            />
          </div>
        </div>

        {/* Mitigations */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
          <span className="font-bold text-slate-800 dark:text-slate-200 block">
            Mitigaciones Recomendadas:
          </span>
          {riskResult.mitigations.map((m, i) => (
            <div
              key={i}
              className="text-slate-600 dark:text-slate-400 flex items-start gap-1.5"
            >
              <ChevronRight
                size={14}
                className="text-indigo-500 shrink-0 mt-0.5"
              />
              <span>{m}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: UN/LOCODE Prefix Trie & LRU Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Globe2 size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Buscador UN/LOCODE (Prefix Trie + LRU Cache)
              </h3>
              <p className="text-xs text-slate-500">
                Indexación en memoria con poda de candidatos a velocidad
                sub-milisegundo
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 relative">
            <Search
              size={16}
              className="absolute left-3 top-3 text-slate-400"
            />
            <Input
              placeholder="Buscar por código (ESBCN) o ciudad (Barcelona)..."
              value={unlocodeQuery}
              onChange={(e) =>
                onSearchUnlocodes(e.target.value, unlocodeCountry)
              }
              className="pl-9 text-xs"
            />
          </div>
          <div>
            <Input
              placeholder="País (ES, US...)"
              maxLength={2}
              value={unlocodeCountry}
              onChange={(e) =>
                onSearchUnlocodes(unlocodeQuery, e.target.value.toUpperCase())
              }
              className="text-center text-xs uppercase"
            />
          </div>
        </div>

        {/* Cache Stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-slate-400 block text-[10px]">
              Tasa de Aciertos LRU
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {stats.cache.hitRate}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">
              Capacidad Caché
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {stats.cache.capacity} slots
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">
              Nodos Indexados
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {stats.trie.indexedLocations}
            </span>
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {unlocodeResults.map((loc) => (
            <div
              key={loc.location}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs hover:border-indigo-400 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                    {loc.location}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {loc.name}
                  </span>
                  <span className="text-slate-400">({loc.country})</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Coords: {loc.coordinates || "N/A"} | Funciones:{" "}
                  {loc.function || "Multimodal"}
                </div>
              </div>
              <Button
                onClick={() => setOriginPort(loc.location)}
                variant="outline"
                className="text-[11px] h-7 px-2"
              >
                Fijar Origen
              </Button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
