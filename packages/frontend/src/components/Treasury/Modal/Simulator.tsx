/**
 * @file Simulator.tsx
 * @description 3-Way Match Freight Reconciliation Simulator modal with tolerance evaluation.
 * @module @atlas/frontend/components/Treasury/Modal
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@atlas/ui";

export interface TreasurySimResult {
  reconciliationStatus?: string;
  totalVarianceAmount?: number | string;
  auditNotes?: string;
  [key: string]: unknown;
}

export interface ReconciliationSimulatorModalProps {
  showSimModal: boolean;
  onClose: () => void;
  simChargeCode: string;
  onSimChargeCodeChange: (v: string) => void;
  simDocNumber: string;
  onSimDocNumberChange: (v: string) => void;
  simDescription: string;
  onSimDescriptionChange: (v: string) => void;
  simBilledAmount: number;
  onSimBilledAmountChange: (v: number) => void;
  simExpectedAmount: number;
  onSimExpectedAmountChange: (v: number) => void;
  onRunSimulation: () => void;
  simResult: TreasurySimResult | null;
}

export function ReconciliationSimulatorModal({
  showSimModal,
  onClose,
  simChargeCode,
  onSimChargeCodeChange,
  simDocNumber,
  onSimDocNumberChange,
  simDescription,
  onSimDescriptionChange,
  simBilledAmount,
  onSimBilledAmountChange,
  simExpectedAmount,
  onSimExpectedAmountChange,
  onRunSimulation,
  simResult,
}: ReconciliationSimulatorModalProps) {
  return (
    <AnimatePresence>
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-xl w-full space-y-4"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white">
                Motor de Casación 3-Way Match
              </h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Tipo de Cargo
                </label>
                <select
                  value={simChargeCode}
                  onChange={(e) => onSimChargeCodeChange(e.target.value)}
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="DEMURRAGE">DEMURRAGE (Demoras)</option>
                  <option value="BASIC_FREIGHT">
                    BASIC_FREIGHT (Flete Base)
                  </option>
                  <option value="BAF_FUEL">BAF_FUEL (Combustible)</option>
                  <option value="THC_ORIGIN">
                    THC_ORIGIN (Terminal Origen)
                  </option>
                  <option value="IATA_COMMISSION">
                    IATA_COMMISSION (Comisión)
                  </option>
                  <option value="OTHER_SURCHARGE">
                    OTHER_SURCHARGE (Otros)
                  </option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Doc. Embarque (B/L / AWB)
                </label>
                <Input
                  type="text"
                  value={simDocNumber}
                  onChange={(e) => onSimDocNumberChange(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-400 block mb-1">
                  Descripción Concepto
                </label>
                <Input
                  type="text"
                  value={simDescription}
                  onChange={(e) => onSimDescriptionChange(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Importe Facturado (€/$)
                </label>
                <Input
                  type="number"
                  value={simBilledAmount}
                  onChange={(e) =>
                    onSimBilledAmountChange(Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Importe Pactado (€/$)
                </label>
                <Input
                  type="number"
                  value={simExpectedAmount}
                  onChange={(e) =>
                    onSimExpectedAmountChange(Number(e.target.value))
                  }
                />
              </div>
            </div>

            <button
              onClick={onRunSimulation}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Evaluar Casación con Tolerancia ±1% / ±5€
            </button>

            {simResult && (
              <div className="p-3 rounded-xl bg-slate-950 border border-white/10 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Resultado Casación:</span>
                  <span
                    className={`font-bold ${simResult.reconciliationStatus === "AUTO_MATCHED" ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {simResult.reconciliationStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Varianza:</span>
                  <span className="font-bold text-white">
                    {simResult.totalVarianceAmount} €
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 italic pt-1">
                  {simResult.auditNotes}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
