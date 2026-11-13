/**
 * @file RelationalDocumentSelector.tsx
 * @description SQLite shipment and document selector banner for SAT e.firma signing.
 * @module @atlas/frontend/components/EFirmaHub/Banner
 * @see {@link docs/adr/0020-modular-file-size-guardrails.md}
 */

import React from "react";
import { Database, Zap } from "lucide-react";
import { Button } from "@atlas/ui";

interface RelationalDocumentSelectorProps {
  shipments: any[];
  activeShipment: any;
  selectedShipmentId: string;
  onSelectShipmentId: (id: string) => void;
  documents: any[];
  activeDocument: any;
  selectedDocId: string;
  onSelectDocId: (id: string) => void;
  matchingStamp: any;
  isSigning: boolean;
  isVaultUnlocked: boolean;
  onExecuteSign: () => void;
}

export const RelationalDocumentSelector: React.FC<
  RelationalDocumentSelectorProps
> = ({
  shipments,
  activeShipment,
  selectedShipmentId,
  onSelectShipmentId,
  documents,
  activeDocument,
  selectedDocId,
  onSelectDocId,
  matchingStamp,
  isSigning,
  isVaultUnlocked,
  onExecuteSign,
}) => {
  return (
    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Database className="w-5 h-5 text-indigo-400 flex-shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
              Expediente Digital Relacional (SQLite)
            </span>
            {matchingStamp ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Firmado e.firma SAT
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Pendiente de Firma
              </span>
            )}
          </div>
          <span className="text-sm text-slate-200 font-medium">
            {activeDocument
              ? `${activeDocument.name} (${activeDocument.documentReference || activeDocument.id})`
              : activeShipment
                ? `Embarque ${activeShipment.id} (${activeShipment.origin} ➔ ${activeShipment.destination}) — Sin documentos`
                : "Cargando..."}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Embarque:</span>
          <select
            value={selectedShipmentId}
            onChange={(e) => onSelectShipmentId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} ({s.origin} ➔ {s.destination})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Documento:</span>
          <select
            value={selectedDocId}
            onChange={(e) => onSelectDocId(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-xs truncate"
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.type}: {d.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          size="sm"
          onClick={onExecuteSign}
          disabled={isSigning || !isVaultUnlocked}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
        >
          <Zap className="w-3.5 h-3.5" />
          {isSigning ? "Firmando con SAT..." : "Firmar con e.firma SAT"}
        </Button>
      </div>
    </div>
  );
};
