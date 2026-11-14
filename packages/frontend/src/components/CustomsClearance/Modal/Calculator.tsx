/**
 * @file Calculator.tsx
 * @description Modal dialog for TARIC live tariff calculations and direct customs clearance creation.
 * @module @atlas/frontend/components/CustomsClearance/Modal
 */

import { X, Calculator as CalcIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TariffCalcParams, TariffCalcResult } from "../types/index";

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  calcParams: TariffCalcParams;
  setCalcParams: React.Dispatch<React.SetStateAction<TariffCalcParams>>;
  calcResult: TariffCalcResult | null;
  isCalculating: boolean;
  onCalculate: () => void;
  onCreateDeclaration: () => void;
}

export function CalculatorModal({
  isOpen,
  onClose,
  calcParams,
  setCalcParams,
  calcResult,
  isCalculating,
  onCalculate,
  onCreateDeclaration,
}: CalculatorModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-900 border border-white/10 rounded-3xl max-w-2xl w-full p-6 shadow-2xl overflow-hidden"
          >
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <CalcIcon className="w-5 h-5 text-rose-400" />
                <h3 className="text-lg font-bold text-white">
                  Calculador Arancelario TARIC y Alta de Despacho
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div>
                <label
                  htmlFor="customs-calc-hs-code"
                  className="text-xs font-bold text-slate-400"
                >
                  Código TARIC / HS Code
                </label>
                <select
                  id="customs-calc-hs-code"
                  name="calcHsCode"
                  value={calcParams.hsCode}
                  onChange={(e) =>
                    setCalcParams((prev) => ({
                      ...prev,
                      hsCode: e.target.value,
                    }))
                  }
                  className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="8504.40.90.90">
                    8504.40.90.90 - Fuentes de alimentación (3.3% Arancel)
                  </option>
                  <option value="8471.30.00.00">
                    8471.30.00.00 - Portátiles y tablets (0.0% Arancel)
                  </option>
                  <option value="6109.10.00.10">
                    6109.10.00.10 - Camisetas de algodón (12.0% Arancel)
                  </option>
                  <option value="8708.29.90.00">
                    8708.29.90.00 - Componentes de automoción (4.5% Arancel)
                  </option>
                  <option value="2204.21.06.00">
                    2204.21.06.00 - Vinos DOCa Rioja (Específico 0.131 €/kg)
                  </option>
                  <option value="9013.80.00.00">
                    9013.80.00.00 - Dispositivos láser (Doble Uso - 4.0%)
                  </option>
                  <option value="3004.90.00.00">
                    3004.90.00.00 - Medicamentos (0.0% Arancel, 4% IVA)
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="customs-calc-origin"
                  className="text-xs font-bold text-slate-400"
                >
                  País de Origen
                </label>
                <select
                  id="customs-calc-origin"
                  name="calcOrigin"
                  value={calcParams.originCountry}
                  onChange={(e) =>
                    setCalcParams((prev) => ({
                      ...prev,
                      originCountry: e.target.value,
                    }))
                  }
                  className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="CN">China (CN)</option>
                  <option value="US">Estados Unidos (US)</option>
                  <option value="VN">Vietnam (VN)</option>
                  <option value="TR">Turquía (TR - Unión Aduanera)</option>
                  <option value="RU">Rusia (RU - Restricciones)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="customs-calc-fob-value"
                  className="text-xs font-bold text-slate-400"
                >
                  Valor FOB de la Mercancía (€)
                </label>
                <input
                  id="customs-calc-fob-value"
                  name="calcFobValue"
                  type="number"
                  value={calcParams.fobValue}
                  onChange={(e) =>
                    setCalcParams((prev) => ({
                      ...prev,
                      fobValue: Number(e.target.value),
                    }))
                  }
                  className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="customs-calc-freight"
                  className="text-xs font-bold text-slate-400"
                >
                  Flete Internacional (€)
                </label>
                <input
                  id="customs-calc-freight"
                  name="calcFreight"
                  type="number"
                  value={calcParams.freightCost}
                  onChange={(e) =>
                    setCalcParams((prev) => ({
                      ...prev,
                      freightCost: Number(e.target.value),
                    }))
                  }
                  className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="customs-calc-insurance"
                  className="text-xs font-bold text-slate-400"
                >
                  Seguro de Transporte (€)
                </label>
                <input
                  id="customs-calc-insurance"
                  name="calcInsurance"
                  type="number"
                  value={calcParams.insuranceCost}
                  onChange={(e) =>
                    setCalcParams((prev) => ({
                      ...prev,
                      insuranceCost: Number(e.target.value),
                    }))
                  }
                  className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="customs-calc-weight-kg"
                  className="text-xs font-bold text-slate-400"
                >
                  Peso Bruto (KG)
                </label>
                <input
                  id="customs-calc-weight-kg"
                  name="calcWeightKg"
                  type="number"
                  value={calcParams.grossWeightKg}
                  onChange={(e) =>
                    setCalcParams((prev) => ({
                      ...prev,
                      grossWeightKg: Number(e.target.value),
                    }))
                  }
                  className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="prefCert"
                checked={calcParams.hasPreferentialOriginCert}
                onChange={(e) =>
                  setCalcParams((prev) => ({
                    ...prev,
                    hasPreferentialOriginCert: e.target.checked,
                  }))
                }
                className="rounded text-rose-600 focus:ring-rose-500 bg-slate-800 border-white/10"
              />
              <label
                htmlFor="prefCert"
                className="text-xs text-slate-300 select-none cursor-pointer"
              >
                Dispone de Certificado de Origen Preferencial (EUR.1 / ATR para
                0% arancel)
              </label>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={onCalculate}
                disabled={isCalculating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <CalcIcon className="w-3.5 h-3.5" /> Calcular Liquidación
              </button>
            </div>

            {calcResult && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Valor CIF (Base):</span>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {calcResult.customsValueCif?.toFixed(2) ??
                        (
                          calcParams.fobValue +
                          calcParams.freightCost +
                          calcParams.insuranceCost
                        ).toFixed(2)}{" "}
                      €
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">
                      Arancel (
                      {calcResult.dutyRateApplied !== undefined
                        ? (calcResult.dutyRateApplied * 100).toFixed(1)
                        : "0.0"}
                      %):
                    </span>
                    <p className="text-sm font-bold text-amber-400 mt-0.5">
                      {calcResult.importDuty?.toFixed(2) ?? "0.00"} €
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">
                      IVA (
                      {calcResult.vatRateApplied !== undefined
                        ? (calcResult.vatRateApplied * 100).toFixed(1)
                        : "21.0"}
                      %):
                    </span>
                    <p className="text-sm font-bold text-indigo-400 mt-0.5">
                      {calcResult.vatAmount?.toFixed(2) ?? "0.00"} €
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Liquidación:</span>
                    <p className="text-sm font-black text-emerald-400 mt-0.5">
                      {calcResult.totalCustomsPayable?.toFixed(2) ?? "0.00"} €
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={onCreateDeclaration}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                Crear Despacho DUA Oficial
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
