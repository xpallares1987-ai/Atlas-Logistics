/**
 * @file DisputeLine.tsx
 * @description Dialog for issuing formal carrier freight disputes and automated debit notes.
 * Captures discrepancy reason codes and technical justifications to record in the audit ledger.
 * @module @atlas/frontend/components/ControlTower/Modal
 */

import React from "react";
import { Scale, X } from "lucide-react";
import type { FreightAuditMatch } from "../../../types/control-tower.types.js";

export interface DisputeLineModalProps {
  line: FreightAuditMatch | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  disputeReason: string;
  onDisputeReasonChange: (reason: string) => void;
  disputeNote: string;
  onDisputeNoteChange: (note: string) => void;
}

export const DisputeLine: React.FC<DisputeLineModalProps> = ({
  line,
  onClose,
  onSubmit,
  disputeReason,
  onDisputeReasonChange,
  disputeNote,
  onDisputeNoteChange,
}) => {
  if (!line) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-xs"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Emitir Disputa de Flete & Nota de Débito
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="bg-slate-800/60 p-3 rounded-lg text-slate-300">
          <div>
            Porteador:{" "}
            <strong className="text-white">{line.carrierName}</strong>
          </div>
          <div>
            Factura:{" "}
            <span className="font-mono text-indigo-400">
              {line.invoiceNumber}
            </span>
          </div>
          <div>
            Discrepancia a Disputar:{" "}
            <strong className="text-rose-400">€{line.varianceAmount}</strong>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-slate-400 font-medium">
            Motivo de la Disputa:
          </label>
          <select
            value={disputeReason}
            onChange={(e) => onDisputeReasonChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="UNJUSTIFIED_DEMURRAGE">
              Demoras no justificadas (días libres vigentes)
            </option>
            <option value="BAF_INDEX_MISMATCH">
              Recargo combustible BAF excede índice contractual
            </option>
            <option value="DUPLICATE_THC">
              Cargo duplicado de manipulación portuaria (THC)
            </option>
            <option value="INCORRECT_CURRENCY_CONVERSION">
              Tipo de cambio FX incorrecto
            </option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-slate-400 font-medium">
            Detalle y Justificación Técnica:
          </label>
          <textarea
            rows={3}
            value={disputeNote}
            onChange={(e) => onDisputeNoteChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
          >
            Confirmar y Emitir Nota de Débito
          </button>
        </div>
      </form>
    </div>
  );
};

export const DisputeLineModal = DisputeLine;
