/**
 * @file ValidateStatus.tsx
 * @description Modal for validating and updating CBAM quarterly declaration registry status.
 * @module @atlas/frontend/components/Cbam/Modal/ValidateStatus
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { CbamDeclarationStatus } from "../../../types/cbam.types";

export interface ValidateStatusProps {
  show: boolean;
  onClose: () => void;
  statusInput: CbamDeclarationStatus;
  setStatusInput: (status: CbamDeclarationStatus) => void;
  remarksInput: string;
  setRemarksInput: (remarks: string) => void;
  onSave: () => void;
}

export const ValidateStatus: React.FC<ValidateStatusProps> = ({
  show,
  onClose,
  statusInput,
  setStatusInput,
  remarksInput,
  setRemarksInput,
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
                <ShieldCheck size={18} className="text-emerald-400" />
                Validación y Estado de Declaración CBAM
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
                  htmlFor="cbam-status-input"
                  className="text-xs text-slate-400 block mb-1"
                >
                  Estado de Tramitación
                </label>
                <select
                  id="cbam-status-input"
                  name="statusInput"
                  value={statusInput}
                  onChange={(e) =>
                    setStatusInput(e.target.value as CbamDeclarationStatus)
                  }
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="SUBMITTED_REGISTRY">
                    SUBMITTED_REGISTRY (Presentada en el Registro Transitorio de
                    la UE)
                  </option>
                  <option value="VALIDATED">
                    VALIDATED (Auditada y Validada por Declarante Autorizado)
                  </option>
                  <option value="AMENDED">
                    AMENDED (Rectificada / Modificación de Datos de Emisiones)
                  </option>
                  <option value="DRAFT">
                    DRAFT (Borrador Interno en Preparación)
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="cbam-remarks-input"
                  className="text-xs text-slate-400 block mb-1"
                >
                  Observaciones de Auditoría
                </label>
                <textarea
                  id="cbam-remarks-input"
                  name="remarksInput"
                  value={remarksInput}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Detalles sobre certificados de instalación, verificación de datos y referencias aduaneras..."
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
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                Guardar Estado
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
