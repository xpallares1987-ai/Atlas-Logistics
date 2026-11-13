/**
 * @file GuaranteesTax.tsx
 * @description Bank Guarantees catalog and Customs Tax Settlement Simulator (Regimes 4071 vs 3171/7171/5171).
 * @module @atlas/frontend/components/CustomsWarehouse/Tab
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { Calculator, Landmark } from "lucide-react";
import { Input } from "@atlas/ui";
import type {
  CustomsBankGuarantee,
  DischargeRegimeCode,
  DischargeSimulationResult,
} from "../../../types/customs-warehouse.types";

// ============================================================================
// 1. PROPS INTERFACE
// ============================================================================

export interface GuaranteesTaxProps {
  guarantees: CustomsBankGuarantee[];
  simDischargeRegime: DischargeRegimeCode;
  onDischargeRegimeChange: (regime: DischargeRegimeCode) => void;
  simDischargedPkgs: number;
  onDischargedPkgsChange: (pkgs: number) => void;
  dischargeResult: DischargeSimulationResult | null;
  onRunDischargeCalc: () => void;
}

// ============================================================================
// 2. COMPONENT
// ============================================================================

export function GuaranteesTax({
  guarantees,
  simDischargeRegime,
  onDischargeRegimeChange,
  simDischargedPkgs,
  onDischargedPkgsChange,
  dischargeResult,
  onRunDischargeCalc,
}: GuaranteesTaxProps) {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tax Settlement Simulator */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Calculator size={18} className="text-amber-400" />
            Liquidación de Salida & Despacho Fiscal
          </h3>
          <p className="text-xs text-slate-400">
            Calcula los tributos a liquidar y el importe liberado del aval
            bancario ante la AEAT según el régimen de salida.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 block mb-1">
                Régimen Aduanero de Desvinculación
              </label>
              <select
                value={simDischargeRegime}
                onChange={(e) =>
                  onDischargeRegimeChange(e.target.value as DischargeRegimeCode)
                }
                className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="4071">
                  4071 — Despacho a Libre Práctica (Entrada a consumo)
                </option>
                <option value="3171">
                  3171 — Reexportación a Tercer País (Exención total)
                </option>
                <option value="7171">
                  7171 — Transferencia a otro Depósito Aduanero
                </option>
                <option value="5171">
                  5171 — Inclusión en Perfeccionamiento Activo
                </option>
                <option value="DOMESTIC_COMMERCE_DDA">
                  DDA — Entrega asimilada con exención IVA
                </option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">
                Bultos a Desvincular
              </label>
              <Input
                type="number"
                value={simDischargedPkgs}
                onChange={(e) => onDischargedPkgsChange(Number(e.target.value))}
              />
            </div>

            <button
              onClick={onRunDischargeCalc}
              className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all shadow-md shadow-amber-600/20"
            >
              Calcular Liquidación de Tributos
            </button>

            {dischargeResult && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Arancel Liquidado:</span>
                  <span className="font-bold text-white">
                    {dischargeResult.settledDutyAmountEur.toLocaleString(
                      "es-ES",
                      { minimumFractionDigits: 2 },
                    )}{" "}
                    €
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IVA Liquidado:</span>
                  <span className="font-bold text-white">
                    {dischargeResult.settledVatAmountEur.toLocaleString(
                      "es-ES",
                      { minimumFractionDigits: 2 },
                    )}{" "}
                    €
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/10">
                  <span className="text-slate-400 font-bold">
                    Total a Pagar en DUA:
                  </span>
                  <span className="font-black text-amber-400">
                    {dischargeResult.totalSettledTaxesEur.toLocaleString(
                      "es-ES",
                      { minimumFractionDigits: 2 },
                    )}{" "}
                    €
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Crédito Liberado en Aval:
                  </span>
                  <span className="font-black text-emerald-400">
                    {dischargeResult.releasedGuaranteeCreditEur.toLocaleString(
                      "es-ES",
                      { minimumFractionDigits: 2 },
                    )}{" "}
                    €
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 italic pt-1 border-t border-white/10">
                  {dischargeResult.taxExemptionRationale}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Comprehensive Guarantees List */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4 lg:col-span-2">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Landmark size={18} className="text-emerald-400" />
            Avales Globales Bancarios & Límite de Garantía AEAT
          </h3>
          <div className="space-y-4 overflow-y-auto max-h-[360px] pr-1">
            {guarantees.map((g) => {
              const utilPercent = Math.round(
                ((g.committedSuspendedDebtEur || 0) /
                  g.totalGuaranteeAmountEur) *
                  100,
              );
              return (
                <div
                  key={g.id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-sm">
                          {g.guaranteeReferenceNumber}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                          {g.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {g.guarantorFinancialInstitution} | Aduana:{" "}
                        {g.customsOfficeCode}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-400">
                        {(g.availableCreditEur || 0).toLocaleString("es-ES")} €
                        Disp.
                      </span>
                      <p className="text-[10px] text-slate-400">
                        de {g.totalGuaranteeAmountEur.toLocaleString("es-ES")} €
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${
                        utilPercent > 80 ? "bg-rose-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, utilPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>
                      Comprometido en Deuda:{" "}
                      {(g.committedSuspendedDebtEur || 0).toLocaleString(
                        "es-ES",
                      )}{" "}
                      €
                    </span>
                    <span>Utilización: {utilPercent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
