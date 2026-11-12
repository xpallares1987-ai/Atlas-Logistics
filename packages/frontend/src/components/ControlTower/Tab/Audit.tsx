/**
 * @file Audit.tsx
 * @description Carrier invoice 3-way match freight audit table for Control Tower.
 * Automatically reconciles billed freight charges against contracted quotations and B/L proof of delivery.
 * @module @atlas/frontend/components/ControlTower/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import type { ControlTowerAuditTabProps } from "../../../types/control-tower.types.js";

export const Audit: React.FC<ControlTowerAuditTabProps> = ({
  auditMatches,
  onDisputeLine,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white">
            Auditoría 3-Way Match de Facturas de Porteadores
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cotejo automático de facturas de flete vs cotizaciones pactadas y
            albaranes/hitos EDI. Las discrepancias fuera de tolerancia generan
            notas de débito.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-lg">
            Tolerancia: ±25.00 EUR
          </span>
        </div>
      </div>

      <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-700">
            <tr>
              <th className="p-3">Factura Porteador</th>
              <th className="p-3">Documento (BL / CMR)</th>
              <th className="p-3">Concepto Cargo</th>
              <th className="p-3 text-right">Facturado</th>
              <th className="p-3 text-right">Esperado</th>
              <th className="p-3 text-right">Discrepancia</th>
              <th className="p-3 text-center">Estado Auditoría</th>
              <th className="p-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60">
            {auditMatches.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No hay líneas de flete registradas para auditoría.
                </td>
              </tr>
            ) : (
              auditMatches.map((m) => {
                const isDiscrepant = !m.isWithinTolerance;
                return (
                  <tr
                    key={m.lineId}
                    className={`hover:bg-slate-700/30 transition-colors ${
                      isDiscrepant ? "bg-rose-950/10" : ""
                    }`}
                  >
                    <td className="p-3">
                      <div className="font-semibold text-white">
                        {m.carrierName}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {m.invoiceNumber}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-200">
                      {m.documentNumber}
                    </td>
                    <td className="p-3">
                      <span className="font-medium text-slate-200">
                        {m.chargeCode}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {m.description}
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-white">
                      €{m.billedAmount?.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-400">
                      €{m.expectedAmount?.toFixed(2)}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-bold ${
                        isDiscrepant ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {m.varianceAmount > 0 ? "+" : ""}€
                      {m.varianceAmount?.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      {isDiscrepant ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                          DISCREPANCIA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          MATCH EXACTO
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {isDiscrepant && m.disputeStatus !== "DISPUTED" ? (
                        <button
                          onClick={() => onDisputeLine(m)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-md shadow transition-colors"
                        >
                          Emitir Disputa
                        </button>
                      ) : m.disputeStatus === "DISPUTED" ? (
                        <span className="text-[11px] font-mono text-amber-400">
                          {m.disputeCode || "DISPUTADA"}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">
                          Aprobado
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AuditTab = Audit;
export const ControlTowerAuditTab = Audit;
