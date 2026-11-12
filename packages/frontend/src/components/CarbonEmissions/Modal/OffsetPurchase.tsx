/**
 * @file OffsetPurchase.tsx
 * @description Modal dialog for assigning verified carbon offset credits to a Scope 3 journey.
 * @module @atlas/frontend/components/CarbonEmissions/Modal
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button, Input } from "@atlas/ui";
import { AnimatePresence, motion } from "framer-motion";
import { TreePine } from "lucide-react";
import type { OffsetPurchaseModalProps } from "../../../types/carbon-emissions.types";
import { toFixed, toNumber } from "../hooks/useCarbonEmissions";

export function OffsetPurchase({
  isOpen,
  onClose,
  calculations,
  selectedCalculation,
  setSelectedCalculation,
  projects,
  offsetSelectedProjectId,
  setOffsetSelectedProjectId,
  beneficiaryInput,
  setBeneficiaryInput,
  onConfirmOffset,
}: OffsetPurchaseModalProps) {
  const selectedProject = projects.find(
    (project: any) => project.id === offsetSelectedProjectId,
  );
  const selectedCalculationTotal = toNumber(selectedCalculation?.totalTco2eWtw);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 flex flex-col gap-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TreePine size={18} className="text-emerald-400" />
                Neutralizar Huella de Carbono Scope 3
              </h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Expedición a Compensar
                </label>
                <select
                  value={selectedCalculation?.id || ""}
                  onChange={(e) => {
                    const found = calculations.find(
                      (c) => c.id === e.target.value,
                    );
                    setSelectedCalculation(found);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                >
                  {calculations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.referenceCode} ({c.originCity} ➔ {c.destinationCity}) —{" "}
                      {toNumber(c.totalTco2eWtw).toFixed(3)} tCO2e
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Proyecto de Compensación
                </label>
                <select
                  value={offsetSelectedProjectId}
                  onChange={(e) => setOffsetSelectedProjectId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="">Selecciona un proyecto...</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({String(p.standard || "").replace("_", " ")}) —
                      €{toNumber(p.pricePerTco2eEur, 0)}/t
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Empresa Beneficiaria (Titular del Certificado)
                </label>
                <Input
                  value={beneficiaryInput}
                  onChange={(e) => setBeneficiaryInput(e.target.value)}
                  placeholder="Ej. Inditex Logistics S.A."
                  className="bg-slate-950 border-slate-700 text-xs text-white"
                />
              </div>

              {selectedCalculation && offsetSelectedProjectId && (
                <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-500/30 flex items-center justify-between mt-2">
                  <div>
                    <span className="text-[10px] text-emerald-400 uppercase font-bold block">
                      Coste Total Compensación (100% tCO2e)
                    </span>
                    <span className="text-xs text-slate-300">
                      {toFixed(selectedCalculationTotal, 4)} tCO2e neutralizadas
                    </span>
                  </div>
                  <span className="text-xl font-black text-white">
                    €
                    {(
                      selectedCalculationTotal *
                      toNumber(selectedProject?.pricePerTco2eEur)
                    ).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                onClick={onConfirmOffset}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
              >
                Confirmar y Emitir Certificado
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
export default OffsetPurchase;
