/**
 * @file UpdateConsignmentStatus.tsx
 * @description Modal for updating CIM rail consignment circulation status and traction remarks.
 * @module @atlas/frontend/components/RailFreight/Modal/UpdateConsignmentStatus
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { RailConsignment } from "../../../types/rail-freight.types";

export interface UpdateConsignmentStatusProps {
  show: boolean;
  onClose: () => void;
  statusInput: RailConsignment["status"];
  setStatusInput: (val: RailConsignment["status"]) => void;
  remarksInput: string;
  setRemarksInput: (val: string) => void;
  onSave: () => void;
}

export const UpdateConsignmentStatus: React.FC<
  UpdateConsignmentStatusProps
> = ({
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
                <ShieldCheck size={18} className="text-blue-400" />
                Actualización de Estado de Circulación Ferroviaria
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
                  Estado de la Expedición CIM
                </label>
                <select
                  value={statusInput}
                  onChange={(e) =>
                    setStatusInput(e.target.value as RailConsignment["status"])
                  }
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="PLANNED">
                    PLANNED (Planificado en Malla Ferroviaria)
                  </option>
                  <option value="TRAIN_FORMED">
                    TRAIN_FORMED (Tren Formado en Vía de Carga)
                  </option>
                  <option value="IN_TRANSIT">
                    IN_TRANSIT (En Circulación de Tracción)
                  </option>
                  <option value="GAUGE_TRANSFERRED">
                    GAUGE_TRANSFERRED (Transbordo de Ancho Realizado)
                  </option>
                  <option value="DELIVERED">
                    DELIVERED (Entregado en Terminal de Destino)
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Observaciones de Tracción
                </label>
                <textarea
                  value={remarksInput}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  placeholder="Detalles sobre el surco ferroviario, maniobras en terminal y entrega..."
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
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
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
