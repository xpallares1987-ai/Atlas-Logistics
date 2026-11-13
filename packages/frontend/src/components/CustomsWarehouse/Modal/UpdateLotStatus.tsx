/**
 * @file UpdateLotStatus.tsx
 * @description Modal dialog for updating the inspection status and remarks of a Customs Inventory Lot.
 * @module @atlas/frontend/components/CustomsWarehouse/Modal
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import type { CustomsLotStatus } from "../../../types/customs-warehouse.types";

// ============================================================================
// 1. PROPS INTERFACE
// ============================================================================

export interface UpdateLotStatusProps {
  open: boolean;
  onClose: () => void;
  statusInput: CustomsLotStatus;
  onStatusChange: (status: CustomsLotStatus) => void;
  remarksInput: string;
  onRemarksChange: (remarks: string) => void;
  onSave: () => void;
}

// ============================================================================
// 2. COMPONENT
// ============================================================================

export function UpdateLotStatus({
  open,
  onClose,
  statusInput,
  onStatusChange,
  remarksInput,
  onRemarksChange,
  onSave,
}: UpdateLotStatusProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-amber-400" />
                Actualización de Estado de la Partida Aduanera
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
                  Estado del Lote
                </label>
                <select
                  value={statusInput}
                  onChange={(e) =>
                    onStatusChange(e.target.value as CustomsLotStatus)
                  }
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ACTIVE">
                    ACTIVE (Vinculada en Custodia Completa)
                  </option>
                  <option value="PARTIALLY_DISCHARGED">
                    PARTIALLY_DISCHARGED (Desvinculación Parcial Realizada)
                  </option>
                  <option value="CLOSED_DISCHARGED">
                    CLOSED_DISCHARGED (Lote Totalmente Cancelado / Salida)
                  </option>
                  <option value="EXPIRED_ALERT">
                    EXPIRED_ALERT (Alerta de Plazo ADT Excedido)
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Observaciones de Inspección
                </label>
                <textarea
                  value={remarksInput}
                  onChange={(e) => onRemarksChange(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  placeholder="Detalles sobre el control físico, recuento de bultos o actas de desvinculación..."
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
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                Guardar Estado
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
