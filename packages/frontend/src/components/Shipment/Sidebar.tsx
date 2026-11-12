/**
 * @file Sidebar.tsx
 * @description Operational shipment navigation drawer and search filter sidebar.
 * Enables fast search by reference, mode, or ID with real-time health badges and exception counters.
 * @module @atlas/frontend/components/Shipment
 */

import React from "react";
import { Search, AlertCircle } from "lucide-react";
import type { OperationalShipment360View } from "../../types/shipment-workspace360.types.js";

export interface ShipmentWorkspaceSidebarProps {
  shipmentsList: OperationalShipment360View[];
  selectedShipmentId: string;
  onSelectShipment: (id: string) => void;
  loading: boolean;
  searchFilter: string;
  onSearchFilterChange: (val: string) => void;
  getServiceIcon: (serviceType: string) => React.ReactNode;
}

export const Sidebar: React.FC<ShipmentWorkspaceSidebarProps> = ({
  shipmentsList,
  selectedShipmentId,
  onSelectShipment,
  loading,
  searchFilter,
  onSearchFilterChange,
  getServiceIcon,
}) => {
  const filteredShipments = shipmentsList.filter((s) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      s.shipmentReference?.toLowerCase().includes(term) ||
      s.shipmentId?.toLowerCase().includes(term) ||
      s.serviceType?.toLowerCase().includes(term)
    );
  });

  return (
    <aside className="w-80 border-r border-slate-800 bg-slate-900/30 flex flex-col shrink-0">
      <div className="p-3 border-b border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            id="shipment-360-search"
            name="shipmentFilter"
            aria-label="Filter shipments"
            type="text"
            value={searchFilter}
            onChange={(e) => onSearchFilterChange(e.target.value)}
            placeholder="Filter by ref, ID, mode..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
        {loading && shipmentsList.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Loading shipments...
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No shipments found.
          </div>
        ) : (
          filteredShipments.map((shp) => {
            const isSelected = shp.shipmentId === selectedShipmentId;
            return (
              <button
                key={shp.shipmentId}
                onClick={() => onSelectShipment(shp.shipmentId)}
                className={`w-full text-left p-3 rounded-xl transition flex flex-col gap-1.5 ${
                  isSelected
                    ? "bg-indigo-600/15 border border-indigo-500/40 text-slate-100 shadow-sm"
                    : "hover:bg-slate-800/50 text-slate-400 border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-200">
                    {shp.shipmentReference || shp.shipmentId}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      shp.health?.status === "CRITICAL"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : shp.health?.status === "AT_RISK"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {shp.health?.status || "HEALTHY"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  {getServiceIcon(shp.serviceType || "OCEAN_FCL")}
                  <span>{shp.serviceType || "OCEAN_FCL"}</span>
                  <span>•</span>
                  <span>{shp.lifecycle || "IN_TRANSIT"}</span>
                  {shp.metrics?.activeExceptionsCount ? (
                    <>
                      <span>•</span>
                      <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3" />
                        {shp.metrics.activeExceptionsCount} exc
                      </span>
                    </>
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export const WorkspaceSidebar = Sidebar;
export const ShipmentWorkspaceSidebar = Sidebar;
