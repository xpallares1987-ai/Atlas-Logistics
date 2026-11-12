/**
 * @file ShipmentSelector.tsx
 * @description Relational SQLite shipment selector & Carta Porte 3.1 generator banner.
 * @module @atlas/frontend/components/CrossBorder/Banner
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Database, Zap } from "lucide-react";
import { Button } from "@atlas/ui";

export interface ShipmentSelectorProps {
  shipments: any[];
  activeShipment: any;
  selectedShipmentId: string;
  onSelectShipmentId: (id: string) => void;
  dbDeclaration: any;
  isGenerating: boolean;
  onGenerateCartaPorte: () => void;
}

export function ShipmentSelector({
  shipments,
  activeShipment,
  selectedShipmentId,
  onSelectShipmentId,
  dbDeclaration,
  isGenerating,
  onGenerateCartaPorte,
}: ShipmentSelectorProps) {
  return (
    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Database className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">
              Embarque Relacional Activo (SQLite)
            </span>
            {dbDeclaration ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Timbrada: {dbDeclaration.cfdiFolio}
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Pendiente de Carta Porte
              </span>
            )}
          </div>
          <span className="text-sm text-slate-200 font-medium">
            {activeShipment
              ? `${activeShipment.id} — ${activeShipment.origin || "CNSHA"} ➔ ${activeShipment.destination || "ESVLC"} (${activeShipment.status})`
              : "Cargando embarques..."}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedShipmentId}
          onChange={(e) => onSelectShipmentId(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {shipments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} ({s.origin} ➔ {s.destination})
            </option>
          ))}
        </select>

        <Button
          size="sm"
          onClick={onGenerateCartaPorte}
          disabled={isGenerating}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
        >
          <Zap className="w-3.5 h-3.5" />
          {isGenerating ? "Generando..." : "Generar Carta Porte 3.1"}
        </Button>
      </div>
    </div>
  );
}
