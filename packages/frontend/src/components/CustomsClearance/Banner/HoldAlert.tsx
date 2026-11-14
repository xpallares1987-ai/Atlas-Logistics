/**
 * @file HoldAlert.tsx
 * @description Channel statistical summary cards and Red Channel physical inspection alert banner.
 * @module @atlas/frontend/components/CustomsClearance/Banner
 */

import { FileText, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CustomsDeclaration } from "../types/index";

interface HoldAlertProps {
  totalCount: number;
  greens: CustomsDeclaration[];
  oranges: CustomsDeclaration[];
  holds: CustomsDeclaration[];
  onFilterHolds: () => void;
}

export function HoldAlert({
  totalCount,
  greens,
  oranges,
  holds,
  onFilterHolds,
}: HoldAlertProps) {
  return (
    <>
      {/* Quick Channel Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Declaraciones
            </p>
            <h3 className="text-2xl font-black text-white mt-1">
              {totalCount}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Canal Verde (Levante)
            </p>
            <h3 className="text-2xl font-black text-emerald-300 mt-1">
              {greens.length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Canal Naranja (Docs)
            </p>
            <h3 className="text-2xl font-black text-amber-300 mt-1">
              {oranges.length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              Canal Rojo (Inspección)
            </p>
            <h3 className="text-2xl font-black text-rose-300 mt-1">
              {holds.length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Hold Alert Banner */}
      <AnimatePresence>
        {holds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_30px_rgba(244,63,94,0.1)] mb-2"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-rose-300">
                  Alerta de Inspección Física Aduanera (Canal Rojo)
                </h3>
                <p className="text-xs text-rose-200/80">
                  Existen {holds.length} despacho(s) con requerimiento de
                  reconocimiento físico por sanciones de origen o mercancía de
                  doble uso.
                </p>
              </div>
            </div>
            <button
              onClick={onFilterHolds}
              className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-bold transition-colors border border-rose-500/30"
            >
              Filtrar Canal Rojo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
