/**
 * @file Customs.tsx
 * @description European Single Window Environment for Customs and ICS2 Entry Summary Declaration (ENS) radar.
 * Categorizes risk circuits (Green, Orange, Red) and monitors security assessment scores for active consignments.
 * @module @atlas/frontend/components/ControlTower/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { PlusCircle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import type { ControlTowerCustomsTabProps } from "../../../types/control-tower.types.js";

export const Customs: React.FC<ControlTowerCustomsTabProps> = ({
  customsRadar,
  onOpenNewIcs2Modal,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white">
            Radar de Ventanilla Única Aduanera & Declaraciones ICS2 ENS
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Seguimiento telemático de declaraciones de entrada (ENS) de la UE y
            clasificación automática de circuito de inspección.
          </p>
        </div>
        <button
          onClick={onOpenNewIcs2Modal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-colors"
        >
          <PlusCircle size={14} />+ Presentar Declaración ENS
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>🟢 Circuito Verde (Levante Inmediato)</span>
            <CheckCircle2 size={16} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Despacho telemático automático sin intervención documental ni física
            de aduanas.
          </p>
        </div>

        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>🟠 Circuito Naranja (Revisión Documental)</span>
            <Clock size={16} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Requiere comprobación de factura comercial, certificados EUR.1 o
            licencias de importación.
          </p>
        </div>

        <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
            <span>🔴 Circuito Rojo (Inspección Física)</span>
            <ShieldAlert size={16} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Contenedor retenido en muelle para reconocimiento ocular o paso por
            escáner no intrusivo.
          </p>
        </div>
      </div>

      {/* Declarations Table */}
      <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-700">
            <tr>
              <th className="p-3">Número MRN</th>
              <th className="p-3">Envío</th>
              <th className="p-3">EORI Declarante</th>
              <th className="p-3">Aduana de Entrada</th>
              <th className="p-3 text-center">Score de Seguridad</th>
              <th className="p-3 text-center">Circuito de Riesgo</th>
              <th className="p-3">Estado / Observaciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60">
            {customsRadar.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No hay declaraciones aduaneras ICS2 activas.
                </td>
              </tr>
            ) : (
              customsRadar.map((d) => (
                <tr
                  key={d.id}
                  className="hover:bg-slate-700/30 transition-colors"
                >
                  <td className="p-3 font-mono font-bold text-indigo-400">
                    {d.mrn}
                  </td>
                  <td className="p-3 font-mono text-slate-300">
                    {d.shipmentId || "N/A"}
                  </td>
                  <td className="p-3 font-mono text-slate-300">
                    {d.declarantEori}
                  </td>
                  <td className="p-3 text-slate-300">{d.customsOfficeCode}</td>
                  <td className="p-3 text-center">
                    <span className="font-mono font-bold text-slate-200 bg-slate-700 px-2 py-0.5 rounded">
                      {d.securityAssessmentScore ?? 95}/100
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                        d.riskCircuit === "GREEN"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : d.riskCircuit === "ORANGE"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {d.riskCircuit}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300 text-[11px]">{d.notes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const CustomsTab = Customs;
export const ControlTowerCustomsTab = Customs;
