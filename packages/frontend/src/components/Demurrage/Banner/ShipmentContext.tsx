/**
 * @file ShipmentContext.tsx
 * @description Relational SQLite shipment selector and active demurrage invoice context banner.
 * @module @atlas/frontend/components/Demurrage/Banner
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { Database, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@atlas/ui";

interface ShipmentContextProps {
  shipments: any[];
  activeShipment: any;
  selectedShipmentId: string;
  onSelectShipment: (shipmentId: string) => void;
  activeDbInvoice: any;
  isLoadingInvoices: boolean;
  onRefreshInvoices: () => void;
  disputeSuccessMessage: string | null;
}

export function ShipmentContext({
  shipments,
  activeShipment,
  selectedShipmentId,
  onSelectShipment,
  activeDbInvoice,
  isLoadingInvoices,
  onRefreshInvoices,
  disputeSuccessMessage,
}: ShipmentContextProps) {
  return (
    <>
      <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">
                Expedición Relacional Activa (SQLite dev.db)
              </span>
              {activeDbInvoice ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Factura Vinculada: {activeDbInvoice.invoiceNumber}
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Sin Factura D&D
                </span>
              )}
              {activeDbInvoice?.status === "DISPUTED" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Disputa FMC Activa
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeShipment
                ? `${activeShipment.trackingNumber} (${activeShipment.origin} → ${activeShipment.destination}) | Buque: ${activeShipment.vesselName || "MSC ISABELLA"}`
                : "Expedición canónica sh_demo_01 (BK-2026-67116)"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-medium">
              Expedición:
            </label>
            <select
              value={selectedShipmentId}
              onChange={(e) => onSelectShipment(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            >
              {shipments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.trackingNumber} ({s.origin} → {s.destination})
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={onRefreshInvoices}
            disabled={isLoadingInvoices}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoadingInvoices ? "animate-spin" : ""}`}
            />
            Refrescar DB
          </Button>
        </div>
      </div>

      {disputeSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{disputeSuccessMessage}</span>
        </div>
      )}
    </>
  );
}
