/**
 * @file CustomsMl.tsx
 * @description Tab 3: Machine Learning Customs Dwell & Red Channel Inspection Predictor.
 * @module @atlas/frontend/components/CrossBorder/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { motion } from "framer-motion";
import { Sparkles, RefreshCw, Clock, Calendar, Layers } from "lucide-react";
import { Button, Input } from "@atlas/ui";
import type { CustomsMlTabProps } from "../../../types/cross-border.types";

export function CustomsMl({
  dwellInputData,
  setDwellInputData,
  dwellResult,
  isPredictingCustoms,
  onExecuteCustomsPrediction,
}: CustomsMlTabProps) {
  return (
    <motion.div
      key="customs-ml"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* Left Col: Prediction Configuration */}
      <div className="lg:col-span-5 space-y-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Parámetros de Aforo Aduanal
            </h3>
            <span className="text-xs text-amber-400 font-mono">
              IA Predictor
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Número de Pedimento Aduanal
              </label>
              <Input
                value={dwellInputData.pedimentoNumber}
                onChange={(e) =>
                  setDwellInputData({
                    ...dwellInputData,
                    pedimentoNumber: e.target.value,
                  })
                }
                className="bg-slate-950 border-slate-800 font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Aduana de Despacho
              </label>
              <select
                value={dwellInputData.customsPortCode}
                onChange={(e) =>
                  setDwellInputData({
                    ...dwellInputData,
                    customsPortCode: e.target.value as any,
                  })
                }
                className="w-full h-9 rounded-md bg-slate-950 border border-slate-800 px-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="MXNLD">
                  Nuevo Laredo (MXNLD - Puente Comercio Mundial)
                </option>
                <option value="MXZLO">
                  Manzanillo (MXZLO - SSA / Contecon)
                </option>
                <option value="MXVER">Veracruz (MXVER - Terminal ICAVE)</option>
                <option value="MXATM">Altamira (MXATM - Terminal ATP)</option>
                <option value="MXMEX">CDMX / AIFA Carga Aérea (MXMEX)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Mecanismo de Selección Automatizada (Semáforo)
              </label>
              <select
                value={dwellInputData.trafficLightOutcome}
                onChange={(e) =>
                  setDwellInputData({
                    ...dwellInputData,
                    trafficLightOutcome: e.target.value as any,
                  })
                }
                className="w-full h-9 rounded-md bg-slate-950 border border-slate-800 px-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="GREEN_CLEARANCE">
                  Canal Verde (Despacho Libre Inmediato)
                </option>
                <option value="RED_INSPECTION">
                  Aforo Rojo (Reconocimiento Físico & Rayos Gamma)
                </option>
                <option value="PENDING_SELECTION">
                  Pendiente de Selección en Muelle
                </option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div>
                <span className="text-slate-200 font-medium block">
                  Contenedor Refrigerado (Reefer)
                </span>
                <span className="text-slate-500 text-[11px]">
                  Protocolo expedito para perecederos (-15% de tiempo de espera)
                </span>
              </div>
              <input
                type="checkbox"
                checked={dwellInputData.hasReeferCargo}
                onChange={(e) =>
                  setDwellInputData({
                    ...dwellInputData,
                    hasReeferCargo: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={onExecuteCustomsPrediction}
              disabled={isPredictingCustoms}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2"
            >
              {isPredictingCustoms ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              Predecir Permanencia con IA
            </Button>
          </div>
        </div>
      </div>

      {/* Right Col: Prediction Dashboard */}
      <div className="lg:col-span-7 space-y-6">
        {dwellResult && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-500 text-xs font-semibold uppercase block">
                  Tiempo Estimado (Dwell)
                </span>
                <div className="text-3xl font-bold font-mono text-amber-400">
                  {dwellResult.estimatedDwellHours}h
                </div>
                <span className="text-[11px] text-slate-400">
                  En patio aduanero
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-500 text-xs font-semibold uppercase block">
                  Categoría de Riesgo
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                      dwellResult.riskCategory === "HIGH_RISK"
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : dwellResult.riskCategory === "MEDIUM_RISK"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {dwellResult.riskCategory}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Confianza del modelo: {dwellResult.confidenceScorePercent}%
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-500 text-xs font-semibold uppercase block">
                  Prob. Canal Rojo
                </span>
                <div className="text-3xl font-bold font-mono text-rose-400">
                  {dwellResult.redChannelProbabilityPercent}%
                </div>
                <span className="text-[11px] text-slate-400">
                  Por fracción arancelaria
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  Fecha y Hora Prevista de Salida de Garita (Gate-Out)
                </h4>
                <span className="text-xs font-mono text-cyan-400">
                  {dwellResult.portName}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="font-mono text-base font-bold text-white">
                  {new Date(
                    dwellResult.predictedGateOutTimestamp,
                  ).toLocaleString()}
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                  Hora Centro (UTC-6)
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Factores Predictivos Clave (Explainable AI)
              </h4>

              <div className="space-y-2">
                {dwellResult.keyPredictors.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start justify-between gap-4 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 block">
                        {p.feature}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {p.description}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold flex-shrink-0 ${
                        p.impact === "INCREMENTAL_DELAY"
                          ? "bg-red-500/20 text-red-300"
                          : p.impact === "FASTER_CLEARANCE"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {p.impact}
                    </span>
                  </div>
                ))}
              </div>

              {dwellResult.recommendedActions.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                    Recomendaciones Operativas
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {dwellResult.recommendedActions.map((act, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        {act}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
