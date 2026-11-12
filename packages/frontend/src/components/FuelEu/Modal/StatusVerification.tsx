/**
 * @file StatusVerification.tsx
 * @description Modal for THETIS-MRV maritime voyage verification status updates.
 * @module @atlas/frontend/components/FuelEu/Modal
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Input } from "@atlas/ui";
import type {
  StatusVerificationModalProps,
  VoyageVerificationStatus,
} from "../../../types/fueleu.types";

export function StatusVerification({
  isOpen,
  onClose,
  statusInput,
  setStatusInput,
  verifierInput,
  setVerifierInput,
  onConfirm,
}: StatusVerificationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-cyan-400" />
                Verificación de Travesía Marítima (THETIS-MRV)
              </h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="fueleu-status-input"
                  className="text-xs text-slate-400 block mb-1"
                >
                  Estado de Auditoría
                </label>
                <select
                  id="fueleu-status-input"
                  name="statusInput"
                  value={statusInput}
                  onChange={(e) =>
                    setStatusInput(e.target.value as VoyageVerificationStatus)
                  }
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="PLANNED">
                    PLANNED (Planificada / Itinerario Previsto)
                  </option>
                  <option value="UNDERWAY">UNDERWAY (En Navegación)</option>
                  <option value="COMPLETED_VERIFIED">
                    COMPLETED_VERIFIED (Finalizada y Verificada por Jefe de
                    Máquinas)
                  </option>
                  <option value="AUDITED_THETIS">
                    AUDITED_THETIS (Auditada por Sociedad de Clasificación y
                    Registrada en THETIS)
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="fueleu-verifier-input"
                  className="text-xs text-slate-400 block mb-1"
                >
                  Auditor Verificador Acreditado
                </label>
                <Input
                  id="fueleu-verifier-input"
                  name="verifierInput"
                  type="text"
                  value={verifierInput}
                  onChange={(e) => setVerifierInput(e.target.value)}
                  placeholder="ej. DNV Marine Lead Auditor / Bureau Veritas..."
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                Confirmar Verificación
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
