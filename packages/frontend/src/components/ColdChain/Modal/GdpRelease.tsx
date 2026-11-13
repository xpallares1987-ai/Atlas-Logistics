/**
 * @file GdpRelease.tsx
 * @description Responsible Person (QP/RP) GDP Batch Release modal.
 * @module @atlas/frontend/components/ColdChain/Modal/GdpRelease
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Input } from "@atlas/ui";
import { GdpReleaseVerdict } from "../../../types/cold-chain.types";

export interface GdpReleaseProps {
  show: boolean;
  onClose: () => void;
  verdictInput: GdpReleaseVerdict;
  setVerdictInput: (verdict: GdpReleaseVerdict) => void;
  rpNameInput: string;
  setRpNameInput: (name: string) => void;
  auditNotesInput: string;
  setAuditNotesInput: (notes: string) => void;
  onSave: () => void;
}

export const GdpRelease: React.FC<GdpReleaseProps> = ({
  show,
  onClose,
  verdictInput,
  setVerdictInput,
  rpNameInput,
  setRpNameInput,
  auditNotesInput,
  setAuditNotesInput,
  onSave,
}) => {
  return (
    <AnimatePresence>
      {show && (
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
                Dictamen de Liberación de Lote GDP
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
                <label className="text-xs text-slate-400 block mb-1">
                  Veredicto Farmacéutico
                </label>
                <select
                  value={verdictInput}
                  onChange={(e) =>
                    setVerdictInput(e.target.value as GdpReleaseVerdict)
                  }
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="RELEASED_FOR_DISTRIBUTION">
                    RELEASED_FOR_DISTRIBUTION (Aprobado para distribución
                    comercial)
                  </option>
                  <option value="QUARANTINE_INVESTIGATION">
                    QUARANTINE_INVESTIGATION (Retenido en Cuarentena para CAPA)
                  </option>
                  <option value="REJECTED_DISPOSAL">
                    REJECTED_DISPOSAL (Rechazado para destrucción segura)
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Persona Responsable (RP / QP)
                </label>
                <Input
                  type="text"
                  value={rpNameInput}
                  onChange={(e) => setRpNameInput(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Observaciones de Auditoría de Estabilidad
                </label>
                <textarea
                  value={auditNotesInput}
                  onChange={(e) => setAuditNotesInput(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Detalles sobre evaluación de MKT, excursiones térmicas toleradas o acciones correctivas CAPA..."
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
                onClick={onSave}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                Guardar y Emitir Dictamen
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
