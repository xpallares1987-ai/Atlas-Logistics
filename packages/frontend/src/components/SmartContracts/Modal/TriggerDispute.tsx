/**
 * @file TriggerDispute.tsx
 * @description Modal dialog for declaring a dispute and freezing funds in Smart Escrow.
 * @module @atlas/frontend/components/SmartContracts/Modal
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button, Input } from "@atlas/ui";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { TriggerDisputeModalProps } from "../../../types/smart-contracts.types";

export function TriggerDispute({
  isOpen,
  onClose,
  totalAmountUsd,
  disputeReason,
  setDisputeReason,
  onSubmitDispute,
  isPending,
}: TriggerDisputeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-rose-500/40 shadow-2xl text-slate-100"
          >
            <div className="flex items-center gap-2.5 mb-3 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">
                Declarar Disputa en Smart Escrow
              </h3>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              El depósito contractual de ${totalAmountUsd.toLocaleString()} USD
              será congelado preventivamente en el ledger inmutable hasta
              resolución pericial.
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label
                  htmlFor="dispute-reason"
                  className="text-xs font-semibold text-slate-300 block mb-1"
                >
                  Motivo o Hallazgo de la Disputa
                </label>
                <Input
                  id="dispute-reason"
                  name="disputeReason"
                  placeholder="Ej. Violación de precinto ISO 17712 / Faltante de carga de 2,400 kg..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-slate-800 text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={onSubmitDispute}
                disabled={!disputeReason.trim() || isPending}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                {isPending ? "Congelando..." : "Congelar Fondos"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export default TriggerDispute;
