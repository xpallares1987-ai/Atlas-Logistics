/**
 * @file UcpDiscrepancies.tsx
 * @description UCP 600 & ISBP 745 Discrepancy Auditor and SWIFT MT734 Notice of Refusal tab.
 * @module @atlas/frontend/components/TradeFinance/Tab/UcpDiscrepancies
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { Scale, FileX2, FileCheck2 } from "lucide-react";
import { Input } from "@atlas/ui";
import {
  TradeInstrument,
  UcpValidationResult,
} from "../../../types/trade-finance.types";

export interface UcpDiscrepanciesProps {
  currentInst: TradeInstrument | null;
  auditDateInput: string;
  setAuditDateInput: (val: string) => void;
  auditResult: UcpValidationResult | null;
  isAuditing: boolean;
  onRunUcpAudit: () => void;
}

export const UcpDiscrepancies: React.FC<UcpDiscrepanciesProps> = ({
  currentInst,
  auditDateInput,
  setAuditDateInput,
  auditResult,
  isAuditing,
  onRunUcpAudit,
}) => {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Audit Trigger & Settings */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Scale size={18} className="text-blue-400" />
            Auditoría UCP 600 & ISBP 745
          </h3>
          <p className="text-xs text-slate-400">
            Evalúa automáticamente la conformidad estricta de documentos según
            los Artículos 14–33 de la UCP 600.
          </p>

          {currentInst ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10">
                <p className="font-bold text-white">
                  {currentInst.instrumentReference}
                </p>
                <p className="text-slate-400">{currentInst.beneficiaryName}</p>
                <p className="text-emerald-400 font-bold mt-1">
                  {currentInst.creditAmount.toLocaleString("es-ES")}{" "}
                  {currentInst.currency}
                </p>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">
                  Fecha de Presentación al Banco
                </label>
                <Input
                  type="date"
                  value={auditDateInput}
                  onChange={(e) => setAuditDateInput(e.target.value)}
                />
              </div>

              <button
                onClick={onRunUcpAudit}
                disabled={isAuditing}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                <Scale size={16} />
                {isAuditing
                  ? "Examinando Documentos..."
                  : "Ejecutar Examen UCP 600"}
              </button>

              <div className="flex gap-2 pt-2">
                <a
                  href={`/api/trade-finance/instruments/${currentInst.id}/discrepancy-report-pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] rounded-xl text-center border border-white/10 transition-all"
                >
                  Informe PDF
                </a>
                <a
                  href={`/api/trade-finance/instruments/${currentInst.id}/swift-mt734`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-[11px] rounded-xl text-center border border-rose-500/30 transition-all"
                >
                  SWIFT MT734
                </a>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Seleccione un instrumento en la primera pestaña.
            </p>
          )}
        </div>

        {/* Audit Findings Display */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4 lg:col-span-2">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <FileX2 size={18} className="text-rose-400" />
            Resultados del Examen & Discrepancias Detectadas
          </h3>

          {auditResult && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
              Examen ejecutado:{" "}
              <strong className="text-white">
                {auditResult.complianceStatus}
              </strong>{" "}
              ({auditResult.totalDiscrepanciesCount} discrepancias). Días
              transcurridos: {auditResult.presentationDaysElapsed} de{" "}
              {auditResult.maxAllowedPresentationDays} días permitidos.
            </div>
          )}

          {currentInst?.discrepancies &&
          currentInst.discrepancies.length > 0 ? (
            <div className="space-y-3 overflow-y-auto max-h-[420px]">
              {currentInst.discrepancies.map((disc, index) => (
                <div
                  key={disc.id || index}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/30 space-y-2 text-xs"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {index + 1}. {disc.articleReference}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          disc.severity === "CRITICAL_REFUSAL"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {disc.severity}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {disc.status}
                    </span>
                  </div>

                  <p className="text-slate-300">{disc.description}</p>
                  <p className="text-slate-400 italic pt-1 border-t border-white/10">
                    <strong className="text-cyan-400 not-italic">
                      Subsanación / Waiver:
                    </strong>{" "}
                    {disc.suggestedRemedy}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
              <FileCheck2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h4 className="text-base font-bold text-white">
                Presentación Conforme (Clean Presentation)
              </h4>
              <p className="text-xs text-slate-300">
                No se han detectado discrepancias documentarias bajo las reglas
                de la UCP 600 e ISBP 745. El crédito está listo para pago /
                negociación.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
