/**
 * @file AuditGdp.tsx
 * @description GDP Quality Audit & Batch Release Center tab.
 * @module @atlas/frontend/components/ColdChain/Tab/AuditGdp
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { ShieldCheck, Download } from "lucide-react";
import { ColdChainShipment } from "../../../types/cold-chain.types";

export interface AuditGdpProps {
  shipments: ColdChainShipment[];
}

export const AuditGdp: React.FC<AuditGdpProps> = ({ shipments }) => {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 space-y-4 overflow-y-auto z-10 relative">
      <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-400" />
          Expedientes de Calidad Farmacéutica & Certificados de Liberación GDP
        </h3>

        <div className="space-y-3">
          {shipments.map((s) => (
            <div
              key={s.id}
              className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                s.gdpReleaseVerdict === "RELEASED_FOR_DISTRIBUTION"
                  ? "bg-emerald-950/20 border-emerald-500/30"
                  : s.gdpReleaseVerdict === "QUARANTINE_INVESTIGATION"
                    ? "bg-amber-950/20 border-amber-500/30"
                    : "bg-rose-950/20 border-rose-500/30"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">
                    {s.trackingNumber}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/10 text-slate-200">
                    Lote: {s.batchNumber}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      s.gdpReleaseVerdict === "RELEASED_FOR_DISTRIBUTION"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {s.gdpReleaseVerdict}
                  </span>
                </div>
                <p className="text-xs text-white font-bold mt-1">
                  {s.productDescription}
                </p>
                <p className="text-xs text-slate-400 italic mt-0.5">
                  {s.qualityAuditNotes}
                </p>
                <p className="text-[11px] text-cyan-400 mt-1">
                  Firmante QP/RP:{" "}
                  {s.responsiblePersonName || "Pendiente de dictamen"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/cold-chain/shipments/${s.id}/certificate-pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-1.5"
                >
                  <Download size={14} />
                  Descargar Certificado GDP (PDF)
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
