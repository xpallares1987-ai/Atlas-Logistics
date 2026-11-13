/**
 * @file EblMletrTracker.tsx
 * @description Negotiable e-BL (UNCITRAL MLETR) digital title tracker and endorsement history panel.
 * @module @atlas/frontend/components/SmartContracts/Panel
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button } from "@atlas/ui";
import { Check, Copy, FileSignature } from "lucide-react";
import type { EblMletrTrackerProps } from "../../../types/smart-contracts.types";

export function EblMletrTracker({
  ebl,
  copiedHash,
  onCopyHash,
  onOpenEndorseModal,
}: EblMletrTrackerProps) {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <FileSignature className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-bold text-white">
            e-BL Negociable (MLETR)
          </h2>
        </div>
        <span
          className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
            ebl.status === "SURRENDERED"
              ? "bg-slate-800 text-slate-300 border-slate-700"
              : ebl.status === "ENDORSED"
                ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                : "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
          }`}
        >
          {ebl.status === "SURRENDERED"
            ? "CARTA DE PORTE ENTREGADA"
            : ebl.status === "ENDORSED"
              ? "TÍTULO ENDOSADO"
              : "EMITIDO"}
        </span>
      </div>

      {/* Current Legal Title Holder */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-950/40 to-indigo-950/40 border border-sky-500/30 my-4">
        <span className="text-[11px] text-sky-300 font-semibold uppercase tracking-wider block">
          Tenedor Legal Legítimo de la Mercancía (Title Holder)
        </span>
        <div className="flex items-center justify-between mt-1">
          <span className="text-base font-extrabold text-white">
            {ebl.currentTitleHolder}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
            {ebl.isNegotiable ? "NEGOCIABLE A LA ORDEN" : "NO NEGOCIABLE"}
          </span>
        </div>
      </div>

      {/* e-BL Core Parameters */}
      <div className="text-xs space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/40 mb-4">
        <div className="flex justify-between">
          <span className="text-slate-500">e-BL Number:</span>
          <span className="font-mono text-slate-200">{ebl.eblNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Naviera (Carrier):</span>
          <span className="text-slate-200">{ebl.carrierName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Buque / Viaje:</span>
          <span className="text-slate-200">
            {ebl.vesselName} (Viaje {ebl.voyageNumber})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Ruta:</span>
          <span className="text-slate-200">
            {ebl.portOfLoading} ➔ {ebl.portOfDischarge}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Contenedor / Precinto:</span>
          <span className="font-mono text-slate-200">
            {ebl.containerNumber} / {ebl.isoSealNumber}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Hash de Registro MLETR:</span>
          <button
            onClick={() => onCopyHash(ebl.electronicRecordHash, "ebl-hash")}
            className="font-mono text-indigo-400 hover:text-indigo-300 truncate max-w-[200px] flex items-center gap-1"
          >
            <span className="truncate">{ebl.electronicRecordHash}</span>
            {copiedHash === "ebl-hash" ? (
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* Endorsement History */}
      <div className="space-y-2 mb-4">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Historial de Endosos Criptográficos ({(ebl.endorsements || []).length}
          )
        </span>
        {(ebl.endorsements || []).length === 0 ? (
          <p className="text-xs text-slate-500 italic p-2 rounded bg-slate-950/20">
            No se han registrado endosos. El título permanece con el emisor
            original.
          </p>
        ) : (
          (ebl.endorsements || []).map((end, idx) => (
            <div
              key={end.endorsementId || idx}
              className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sky-400">
                  Endoso #{idx + 1}: {end.transferType}
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(end.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-[11px] text-slate-300">
                De:{" "}
                <span className="font-medium text-slate-400">
                  {end.fromParty}
                </span>{" "}
                ➔ A:{" "}
                <span className="font-medium text-white">{end.toParty}</span>
              </div>
              <div className="font-mono text-[10px] text-slate-500 truncate">
                Sig: {end.digitalSignature}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Transmit Title Button */}
      {ebl.status !== "SURRENDERED" && (
        <Button
          variant="outline"
          className="w-full border-sky-500/40 text-sky-300 hover:bg-sky-950/30 text-xs flex items-center justify-center gap-1.5"
          onClick={onOpenEndorseModal}
        >
          <FileSignature className="w-4 h-4" />
          Transmitir / Endosar Título MLETR
        </Button>
      )}
    </div>
  );
}
