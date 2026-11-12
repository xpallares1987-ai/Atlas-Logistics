/**
 * @file Header.tsx
 * @description Top command toolbar for Shipment Workspace 360.
 * Hosts dynamic shipment selector, HBL download triggers, drayage dispatch, and exception buttons.
 * @module @atlas/frontend/components/Shipment
 */

import React from "react";
import { Layers, FileText, Truck, PlusCircle, RefreshCw } from "lucide-react";
import type { OperationalShipment360View } from "../../types/shipment-workspace360.types.js";

export interface ShipmentWorkspaceHeaderProps {
  selectedShipmentId: string;
  shipmentsList: OperationalShipment360View[];
  onSelectShipment: (id: string) => void;
  shipmentDetail: OperationalShipment360View | null;
  healthBadge?: React.ReactNode;
  onDownloadHBL: () => void;
  downloadingHBL: boolean;
  onOpenDrayage: () => void;
  onOpenRaiseException: () => void;
  onRefresh: () => void;
  refreshDisabled: boolean;
  refreshSpinning: boolean;
}

export const Header: React.FC<ShipmentWorkspaceHeaderProps> = ({
  selectedShipmentId,
  shipmentsList,
  onSelectShipment,
  shipmentDetail,
  healthBadge,
  onDownloadHBL,
  downloadingHBL,
  onOpenDrayage,
  onOpenRaiseException,
  onRefresh,
  refreshDisabled,
  refreshSpinning,
}) => {
  return (
    <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Shipment 360 Command Center
            </h1>
            <span className="text-[10px] px-2 py-0.5 font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              CQRS Authoritative
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Operational mission control, explainable attention telemetry &
            in-situ action dispatch
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Dynamic Shipment Selector with Canonical Fallback */}
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">
            Expedición:
          </span>
          <select
            aria-label="Seleccionar expedición activa"
            value={selectedShipmentId || "sh_demo_01"}
            onChange={(e) => onSelectShipment(e.target.value)}
            className="bg-transparent text-xs font-bold text-indigo-300 focus:outline-none cursor-pointer pr-2"
          >
            {shipmentsList.length === 0 ? (
              <option
                value="sh_demo_01"
                className="bg-slate-900 text-slate-200"
              >
                BK-2026-67116 (sh_demo_01)
              </option>
            ) : (
              shipmentsList.map((s) => (
                <option
                  key={s.shipmentId}
                  value={s.shipmentId}
                  className="bg-slate-900 text-slate-200"
                >
                  {s.shipmentReference || s.shipmentId} •{" "}
                  {s.serviceType || "OCEAN"} • {s.health?.status || "HEALTHY"}
                </option>
              ))
            )}
          </select>
          {shipmentDetail && healthBadge}
        </div>

        {shipmentDetail && (
          <>
            <button
              onClick={onDownloadHBL}
              disabled={downloadingHBL}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/40 flex items-center gap-1.5 transition disabled:opacity-50"
              title="Descargar House Bill of Lading (PDF DCSA/FIATA)"
            >
              <FileText
                className={`w-3.5 h-3.5 ${downloadingHBL ? "animate-spin" : ""}`}
              />
              {downloadingHBL ? "Generando..." : "Descargar HBL"}
            </button>

            <button
              onClick={onOpenDrayage}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/40 flex items-center gap-1.5 transition"
              title="Dispatch Port Drayage & Container Haulage (GLEC v3.0)"
            >
              <Truck className="w-3.5 h-3.5 text-indigo-400" />
              Dispatch Drayage
            </button>

            <button
              onClick={onOpenRaiseException}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/40 flex items-center gap-1.5 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Raise Exception
            </button>
          </>
        )}

        <button
          onClick={onRefresh}
          disabled={refreshDisabled}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshSpinning ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>
    </header>
  );
};

export const WorkspaceHeader = Header;
export const ShipmentWorkspaceHeader = Header;
