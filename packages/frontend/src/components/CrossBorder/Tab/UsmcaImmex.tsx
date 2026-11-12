/**
 * @file UsmcaImmex.tsx
 * @description Tab 2: USMCA Regional Value Content (Art. 4.5) & IMMEX Tariff Optimization calculator.
 * @module @atlas/frontend/components/CrossBorder/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { motion } from "framer-motion";
import {
  Percent,
  RefreshCw,
  Scale,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { Button, Input } from "@atlas/ui";
import type { UsmcaImmexTabProps } from "../../../types/cross-border.types";

export function UsmcaImmex({
  rvcInputData,
  setRvcInputData,
  rvcResult,
  isCalculatingRvc,
  onExecuteRvc,
  immexInputData,
  setImmexInputData,
  immexResult,
  isOptimizingImmex,
  onExecuteImmex,
}: UsmcaImmexTabProps) {
  return (
    <motion.div
      key="usmca-immex"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* Left Col: RVC Calculator (Art 4.5) */}
      <div className="lg:col-span-6 space-y-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-cyan-400" />
                Calculadora de Valor de Contenido Regional (VCR)
              </h3>
              <p className="text-xs text-slate-400">
                T-MEC / USMCA Reglas de Origen (Artículo 4.5)
              </p>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
              Art. 4.5
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Fracción Arancelaria (HS Code)
              </label>
              <Input
                value={rvcInputData.hsCode}
                onChange={(e) =>
                  setRvcInputData({
                    ...rvcInputData,
                    hsCode: e.target.value,
                  })
                }
                className="bg-slate-950 border-slate-800 font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Método de Cálculo
              </label>
              <select
                value={rvcInputData.method}
                onChange={(e) =>
                  setRvcInputData({
                    ...rvcInputData,
                    method: e.target.value as any,
                  })
                }
                className="w-full h-9 rounded-md bg-slate-950 border border-slate-800 px-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="NET_COST">
                  Costo Neto (CN) - Umbral 50%/75%
                </option>
                <option value="TRANSACTION_VALUE">
                  Valor de Transacción (VT) - Umbral 60%
                </option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                {rvcInputData.method === "TRANSACTION_VALUE"
                  ? "Valor de Transacción (VT USD)"
                  : "Costo Neto Total (CN USD)"}
              </label>
              <Input
                type="number"
                value={
                  rvcInputData.method === "TRANSACTION_VALUE"
                    ? rvcInputData.transactionValueUsd
                    : rvcInputData.netCostUsd
                }
                onChange={(e) =>
                  rvcInputData.method === "TRANSACTION_VALUE"
                    ? setRvcInputData({
                        ...rvcInputData,
                        transactionValueUsd: parseFloat(e.target.value) || 0,
                      })
                    : setRvcInputData({
                        ...rvcInputData,
                        netCostUsd: parseFloat(e.target.value) || 0,
                      })
                }
                className="bg-slate-950 border-slate-800 font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Materiales No Originarios (VMO USD)
              </label>
              <Input
                type="number"
                value={rvcInputData.nonOriginatingMaterialsCostUsd}
                onChange={(e) =>
                  setRvcInputData({
                    ...rvcInputData,
                    nonOriginatingMaterialsCostUsd:
                      parseFloat(e.target.value) || 0,
                  })
                }
                className="bg-slate-950 border-slate-800 font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={onExecuteRvc}
              disabled={isCalculatingRvc}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2"
            >
              {isCalculatingRvc ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Scale className="w-3.5 h-3.5" />
              )}
              Recalcular VCR T-MEC
            </Button>
          </div>

          {rvcResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Porcentaje VCR Obtenido
                  </span>
                  <div className="text-3xl font-bold font-mono text-cyan-400">
                    {rvcResult.rvcPercentage}%
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Umbral Requerido
                  </span>
                  <span className="text-lg font-mono font-semibold text-slate-300">
                    {rvcResult.thresholdRequiredPercentage}%
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-500 ${
                      rvcResult.qualifiesForUsmca
                        ? "bg-emerald-500"
                        : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.min(100, rvcResult.rvcPercentage)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0%</span>
                  <span className="text-cyan-400 font-semibold font-mono">
                    Umbral: {rvcResult.thresholdRequiredPercentage}%
                  </span>
                  <span>100%</span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  rvcResult.qualifiesForUsmca
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-red-500/10 border-red-500/30 text-red-300"
                }`}
              >
                {rvcResult.qualifiesForUsmca ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                )}
                <div className="text-xs">
                  <span className="font-bold block">
                    {rvcResult.qualifiesForUsmca
                      ? "CALIFICA PARA ARANCEL PREFERENCIAL T-MEC (0%)"
                      : "NO CALIFICA PARA PREFERENCIA ARANCELARIA"}
                  </span>
                  <span className="text-[11px] opacity-80">
                    {rvcResult.ruleAppliedDescription}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Col: IMMEX & Pedimento Optimizer */}
      <div className="lg:col-span-6 space-y-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Optimizador Arancelario & Programa IMMEX
              </h3>
              <p className="text-xs text-slate-400">
                Exención de Impuesto General de Importación (IGI)
              </p>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              IMMEX AF
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Valor Declarado (USD)
              </label>
              <Input
                type="number"
                value={immexInputData.declaredValueUsd}
                onChange={(e) =>
                  setImmexInputData({
                    ...immexInputData,
                    declaredValueUsd: parseFloat(e.target.value) || 0,
                  })
                }
                className="bg-slate-950 border-slate-800 font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                País de Origen
              </label>
              <select
                value={immexInputData.originCountry}
                onChange={(e) =>
                  setImmexInputData({
                    ...immexInputData,
                    originCountry: e.target.value as any,
                  })
                }
                className="w-full h-9 rounded-md bg-slate-950 border border-slate-800 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="US">Estados Unidos (US - T-MEC)</option>
                <option value="CA">Canadá (CA - T-MEC)</option>
                <option value="MX">México (MX)</option>
                <option value="CN">China (CN - Tercer País MFN)</option>
                <option value="DE">Alemania (DE)</option>
                <option value="OTHER">Otro País</option>
              </select>
            </div>

            <div className="md:col-span-2 flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <div>
                <span className="text-slate-200 font-medium block">
                  Programa IMMEX Habilitado
                </span>
                <span className="text-slate-500 text-[11px]">
                  Importación temporal para transformación, elaboración o
                  ensamble
                </span>
              </div>
              <input
                type="checkbox"
                checked={immexInputData.isImmexProgramActive !== false}
                onChange={(e) =>
                  setImmexInputData({
                    ...immexInputData,
                    isImmexProgramActive: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={onExecuteImmex}
              disabled={isOptimizingImmex}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2"
            >
              {isOptimizingImmex ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <DollarSign className="w-3.5 h-3.5" />
              )}
              Optimizar Régimen Arancelario
            </Button>
          </div>

          {immexResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-400 font-medium block">
                    Ahorro Arancelario Total (IGI Exento)
                  </span>
                  <div className="text-2xl font-bold font-mono text-emerald-300">
                    ${immexResult.dutySavingsUsd.toLocaleString()} USD
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                    Pedimento Sugerido
                  </span>
                  <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs">
                    {immexResult.recommendedPedimentoType}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">
                    Arancel General MFN
                  </span>
                  <span className="font-mono text-slate-300 font-semibold">
                    {immexResult.standardMfnDutyRatePercent}% ($
                    {immexResult.standardDutyPayableUsd.toLocaleString()} USD)
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">
                    Arancel Aplicado
                  </span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {immexResult.immexDutyRatePercent}% ($
                    {immexResult.immexDutyPayableUsd.toLocaleString()} USD)
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">
                    Permanencia Máxima
                  </span>
                  <span className="font-semibold text-slate-300">
                    {immexResult.maxPermanenceMonths} meses
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-500 text-[10px] block">
                    Crédito Fiscal IVA
                  </span>
                  <span className="font-semibold text-cyan-400">
                    {immexResult.vatCreditEligible
                      ? "16% Exento / Diferido"
                      : "16% Causado"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
