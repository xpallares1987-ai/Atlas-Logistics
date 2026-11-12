/**
 * @file NewIcs2.tsx
 * @description Dialog for filing EU ICS2 Release 3 Entry Summary Declarations (ENS) with customs authorities.
 * Captures Declarant EORI, Customs Office code, shipment identifier, and safety risk notes.
 * @module @atlas/frontend/components/ControlTower/Modal
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { FileCheck2, X } from "lucide-react";

export interface Ics2FormData {
  declarantEori: string;
  customsOfficeCode: string;
  shipmentId: string;
  notes: string;
}

export interface NewIcs2ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  data: Ics2FormData;
  onChangeData: (data: Ics2FormData) => void;
}

export const NewIcs2: React.FC<NewIcs2ModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  data,
  onChangeData,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-xs"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileCheck2 size={18} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Presentar Declaración ENS (EU ICS2 Release 3)
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

        <div className="flex flex-col gap-1.5">
          <label className="text-slate-400 font-medium">
            EORI del Declarante:
          </label>
          <input
            type="text"
            required
            value={data.declarantEori}
            onChange={(e) =>
              onChangeData({ ...data, declarantEori: e.target.value })
            }
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-slate-400 font-medium">
            Código de Aduana de Entrada:
          </label>
          <input
            type="text"
            required
            value={data.customsOfficeCode}
            onChange={(e) =>
              onChangeData({
                ...data,
                customsOfficeCode: e.target.value,
              })
            }
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-slate-400 font-medium">
            Expediente / Envío:
          </label>
          <input
            type="text"
            value={data.shipmentId}
            onChange={(e) =>
              onChangeData({ ...data, shipmentId: e.target.value })
            }
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-slate-400 font-medium">
            Notas de Seguridad:
          </label>
          <textarea
            rows={2}
            value={data.notes}
            onChange={(e) => onChangeData({ ...data, notes: e.target.value })}
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
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            Transmitir ENS a la AEAT
          </button>
        </div>
      </form>
    </div>
  );
};

export const NewIcs2Modal = NewIcs2;
