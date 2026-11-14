/**
 * @file Simulator.tsx
 * @description Interactive simulator & validator modal for Incoterms 2020 and DUA Box 46 customs normalization.
 * @module @atlas/frontend/components/IncotermsContracts/Modal
 */

import { motion, AnimatePresence } from "framer-motion";
import { Calculator, Scale } from "lucide-react";
import { Input } from "@atlas/ui";

export interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  simIncoterm: string;
  setSimIncoterm: (val: string) => void;
  simMode: string;
  setSimMode: (val: string) => void;
  simContainerized: boolean;
  setSimContainerized: (val: boolean) => void;
  simGoodsValue: number;
  setSimGoodsValue: (val: number) => void;
  simFreight: number;
  setSimFreight: (val: number) => void;
  simInsurance: number;
  setSimInsurance: (val: number) => void;
  simPreCarriage: number;
  setSimPreCarriage: (val: number) => void;
  simExportCosts: number;
  setSimExportCosts: (val: number) => void;
  simImportDuty: number;
  setSimImportDuty: (val: number) => void;
  simImportVat: number;
  setSimImportVat: (val: number) => void;
  simDestTransport: number;
  setSimDestTransport: (val: number) => void;
  onCalculate: () => void;
  isCalculating: boolean;
  simModeResult: any;
  simCustomsResult: any;
  simInsResult: any;
}

export function SimulatorModal({
  isOpen,
  onClose,
  simIncoterm,
  setSimIncoterm,
  simMode,
  setSimMode,
  simContainerized,
  setSimContainerized,
  simGoodsValue,
  setSimGoodsValue,
  simFreight,
  setSimFreight,
  simInsurance,
  setSimInsurance,
  simPreCarriage,
  setSimPreCarriage,
  simExportCosts,
  setSimExportCosts,
  simImportDuty,
  setSimImportDuty,
  simImportVat,
  setSimImportVat,
  simDestTransport,
  setSimDestTransport,
  onCalculate,
  isCalculating,
  simModeResult,
  simCustomsResult,
  simInsResult,
}: SimulatorModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-2xl w-full space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Matriz y Validador Incoterms® 2020
                  </h3>
                  <p className="text-xs text-slate-400">
                    Normalización Aduanera DUA Box 46 / TARIC y validación de
                    compatibilidad multimodal
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white text-sm font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Regla Incoterms® 2020
                </label>
                <select
                  value={simIncoterm}
                  onChange={(e) => setSimIncoterm(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  {[
                    "EXW",
                    "FCA",
                    "CPT",
                    "CIP",
                    "DAP",
                    "DPU",
                    "DDP",
                    "FAS",
                    "FOB",
                    "CFR",
                    "CIF",
                  ].map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Modo de Transporte
                </label>
                <select
                  value={simMode}
                  onChange={(e) => setSimMode(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="AIR">Aéreo (AIR)</option>
                  <option value="OCEAN">Marítimo (OCEAN)</option>
                  <option value="ROAD">Carretera (ROAD)</option>
                  <option value="RAIL">Ferrocarril (RAIL)</option>
                  <option value="MULTIMODAL">Multimodal (MULTIMODAL)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="simContainer"
                checked={simContainerized}
                onChange={(e) => setSimContainerized(e.target.checked)}
                className="rounded border-white/20 bg-slate-950 text-sky-500 focus:ring-sky-400"
              />
              <label
                htmlFor="simContainer"
                className="text-xs text-slate-300 font-medium"
              >
                Carga Contenedorizada (FCL/LCL)
              </label>
            </div>

            {/* Economic Inputs */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Valor Factura (€)
                </label>
                <Input
                  type="number"
                  value={simGoodsValue}
                  onChange={(e) => setSimGoodsValue(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Flete Principal (€)
                </label>
                <Input
                  type="number"
                  value={simFreight}
                  onChange={(e) => setSimFreight(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Seguro (€)
                </label>
                <Input
                  type="number"
                  value={simInsurance}
                  onChange={(e) => setSimInsurance(Number(e.target.value))}
                />
              </div>
            </div>

            {simIncoterm === "EXW" && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Transporte Interior Origen (€)
                  </label>
                  <Input
                    type="number"
                    value={simPreCarriage}
                    onChange={(e) => setSimPreCarriage(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Gastos Despacho Exportación (€)
                  </label>
                  <Input
                    type="number"
                    value={simExportCosts}
                    onChange={(e) => setSimExportCosts(Number(e.target.value))}
                  />
                </div>
              </div>
            )}

            {simIncoterm === "DDP" && (
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Arancel Importación (€)
                  </label>
                  <Input
                    type="number"
                    value={simImportDuty}
                    onChange={(e) => setSimImportDuty(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    IVA Importación (€)
                  </label>
                  <Input
                    type="number"
                    value={simImportVat}
                    onChange={(e) => setSimImportVat(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Transporte en Destino (€)
                  </label>
                  <Input
                    type="number"
                    value={simDestTransport}
                    onChange={(e) =>
                      setSimDestTransport(Number(e.target.value))
                    }
                  />
                </div>
              </div>
            )}

            <button
              onClick={onCalculate}
              disabled={isCalculating}
              className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isCalculating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Scale size={16} />
                  Validar Modo y Normalizar Valor en Aduana
                </>
              )}
            </button>

            {/* Results */}
            {simModeResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                  simModeResult.isValid
                    ? simModeResult.isOptimal
                      ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                      : "bg-amber-950/30 border-amber-500/30 text-amber-200"
                    : "bg-rose-950/30 border-rose-500/30 text-rose-200"
                }`}
              >
                <p className="font-bold">{simModeResult.explanation}</p>
                {simModeResult.warnings?.map((w: string, idx: number) => (
                  <p key={idx} className="text-[11px] opacity-90">
                    ⚠️ {w}
                  </p>
                ))}
              </div>
            )}

            {simCustomsResult && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-2 pb-2 border-b border-white/10">
                  <div>
                    <span className="text-slate-400">Valor Factura:</span>
                    <p className="text-sm font-bold text-white">
                      {simCustomsResult.invoiceValue?.toFixed(2)} €
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Ajustes (+ / -):</span>
                    <p className="text-sm font-bold text-sky-400">
                      + {simCustomsResult.totalAdditions?.toFixed(2)} / -{" "}
                      {simCustomsResult.totalDeductions?.toFixed(2)} €
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">
                      Base DUA Box 46 (CIF):
                    </span>
                    <p className="text-sm font-bold text-emerald-400">
                      {simCustomsResult.customsValueCif?.toFixed(2)} €
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  {simCustomsResult.explanation}
                </p>
              </div>
            )}

            {simInsResult && simInsResult.isMandatory && (
              <div className="bg-sky-950/30 p-3.5 rounded-2xl border border-sky-500/30 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sky-300">
                    Seguro Contractual Obligatorio:
                  </span>
                  <span className="font-bold text-white">
                    Mínimo Asegurado (110%):{" "}
                    {simInsResult.minimumInsuredValue?.toFixed(2)} €
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  {simInsResult.coverageDetails}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
