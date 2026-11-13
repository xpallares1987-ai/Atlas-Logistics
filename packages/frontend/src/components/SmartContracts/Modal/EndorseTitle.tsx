/**
 * @file EndorseTitle.tsx
 * @description Modal dialog for endorsing e-BL legal title under UNCITRAL MLETR.
 * @module @atlas/frontend/components/SmartContracts/Modal
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button, Input } from "@atlas/ui";
import { AnimatePresence, motion } from "framer-motion";
import { FileSignature } from "lucide-react";
import type { EndorseTitleModalProps } from "../../../types/smart-contracts.types";

export function EndorseTitle({
  isOpen,
  onClose,
  currentTitleHolder,
  endorseToParty,
  setEndorseToParty,
  endorseType,
  setEndorseType,
  endorseSigner,
  setEndorseSigner,
  onSubmitEndorse,
  isPending,
}: EndorseTitleModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <FileSignature className="w-5 h-5 text-sky-400" />
              <h3 className="text-lg font-bold">
                Endosar Título de Propiedad (MLETR)
              </h3>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Transmita legalmente la titularidad del conocimiento de embarque
              electrónico conforme a la Ley Modelo CNUDMI (UNCITRAL MLETR).
            </p>

            <div className="space-y-3.5 mb-6">
              <div>
                <label
                  htmlFor="endorse-to-party"
                  className="text-xs font-semibold text-slate-300 block mb-1"
                >
                  Nuevo Tenedor Legal (Endosatario)
                </label>
                <Input
                  id="endorse-to-party"
                  name="endorseToParty"
                  placeholder="Ej. Banco Santander S.A., CMA CGM France..."
                  value={endorseToParty}
                  onChange={(e) => setEndorseToParty(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="endorse-type"
                  className="text-xs font-semibold text-slate-300 block mb-1"
                >
                  Tipo de Transmisión de Título
                </label>
                <select
                  id="endorse-type"
                  name="endorseType"
                  value={endorseType}
                  onChange={(e) => setEndorseType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs p-2 text-slate-200"
                >
                  <option value="SPECIAL_ENDORSEMENT">
                    Endoso Nominativo (Special Endorsement)
                  </option>
                  <option value="PLEDGE_TO_BANK">
                    Pignoración Bancaria (Pledge to Bank / Carta de Crédito)
                  </option>
                  <option value="BLANK_ENDORSEMENT">
                    Endoso en Blanco (Al Portador)
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="endorse-signer"
                  className="text-xs font-semibold text-slate-300 block mb-1"
                >
                  Firmante Autorizado (Opcional)
                </label>
                <Input
                  id="endorse-signer"
                  name="endorseSigner"
                  placeholder={currentTitleHolder}
                  value={endorseSigner}
                  onChange={(e) => setEndorseSigner(e.target.value)}
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
                onClick={onSubmitEndorse}
                disabled={!endorseToParty.trim() || isPending}
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
              >
                {isPending ? "Firmando..." : "Firmar & Endosar Título"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export default EndorseTitle;
