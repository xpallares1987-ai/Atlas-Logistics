/**
 * @file StationSelectorPill.tsx
 * @description Global station & branch context selector pill for TopNavbar.
 * @module @atlas/frontend/components/layout/StationSelectorPill
 * @see {@link docs/adr/0022-enterprise-freight-forwarding-organization-schema-and-governance.md}
 */

import React, { useEffect, useState, useRef } from "react";
import {
  Building2,
  Globe,
  ChevronDown,
  Check,
  Anchor,
  Plane,
  Train,
  Sparkles,
  AlertTriangle,
  X,
  Shield,
} from "lucide-react";
import {
  useOrganizationStore,
  BranchStation,
} from "../../store/useOrganizationStore.js";

export const StationSelectorPill: React.FC = () => {
  const {
    myAssignments,
    activeStationId,
    activeStationCode,
    canAccessAllStations,
    warningMessage,
    fetchStations,
    fetchMyAssignments,
    setActiveStation,
    getActiveStation,
    getSelectableStations,
    fallbackToPrimaryStation,
    clearWarning,
  } = useOrganizationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStations();
    fetchMyAssignments();
  }, [fetchStations, fetchMyAssignments]);

  // Handle 403 Forbidden station boundary violations
  useEffect(() => {
    const handleForbidden = (event: Event) => {
      const customEvent = event as CustomEvent;
      const code = customEvent.detail?.stationCode || "requested station";
      fallbackToPrimaryStation(
        `Access to station '${code}' is restricted. Switched automatically to your authorized station.`,
      );
    };

    window.addEventListener("atlas-station-forbidden", handleForbidden);
    return () =>
      window.removeEventListener("atlas-station-forbidden", handleForbidden);
  }, [fallbackToPrimaryStation]);

  // Auto-dismiss warning toast after 6 seconds
  useEffect(() => {
    if (!warningMessage) return;
    const timer = setTimeout(() => {
      clearWarning();
    }, 6000);
    return () => clearTimeout(timer);
  }, [warningMessage, clearWarning]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeStation = getActiveStation();
  const selectableStations = getSelectableStations();

  const getStationIcon = (type?: string) => {
    switch (type) {
      case "AIR_CARGO_HUB":
        return <Plane className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      case "INTERMODAL_RAIL_RAMP":
        return <Train className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case "OCEAN_GATEWAY":
      default:
        return <Anchor className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
  };

  const filteredStations = selectableStations.filter(
    (s) =>
      s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.stationCode.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.unLocode.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (s.address?.city &&
        s.address.city.toLowerCase().includes(searchFilter.toLowerCase())),
  );

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Non-intrusive warning toast for forbidden station access */}
      {warningMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-18 right-6 z-50 max-w-md bg-amber-950/95 border border-amber-600/70 text-amber-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-start gap-3 backdrop-blur-md animate-in slide-in-from-top-2 duration-200"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-semibold block text-amber-100">
              Station Authorization Enforced
            </span>
            <span>{warningMessage}</span>
          </div>
          <button
            type="button"
            onClick={clearWarning}
            className="text-amber-400 hover:text-amber-200 p-0.5"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pill trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 transition-all shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        title="Operating Freight Forwarding Branch Station"
        aria-label="Select Operating Station"
      >
        {activeStationId === "ALL" ? (
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
        ) : (
          getStationIcon(activeStation?.stationType)
        )}
        <span className="font-semibold tracking-wide">
          {activeStationId === "ALL"
            ? "Global Network"
            : activeStation?.stationCode || activeStationCode}
        </span>
        {activeStation && (
          <span className="text-[10px] text-slate-400 hidden lg:inline">
            ({activeStation.unLocode})
          </span>
        )}
        {!canAccessAllStations && (
          <span
            className="text-[9px] text-emerald-400 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-800/50 hidden md:inline-flex items-center gap-0.5"
            title="Operational User Station Context"
          >
            <Shield className="w-2.5 h-2.5" /> Station
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-3 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                Branch Station Context
              </span>
              <span className="text-[10px] text-indigo-400 font-mono bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800/50">
                {selectableStations.length}{" "}
                {canAccessAllStations ? "Gateways" : "Assigned"}
              </span>
            </div>
            <input
              type="text"
              placeholder="Filter by station, UN/LOCODE, city..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-md px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 py-1">
            {/* Global View Option - Available only for Admins with multi-station scope */}
            {canAccessAllStations && (
              <button
                type="button"
                onClick={() => {
                  setActiveStation("ALL", "ALL");
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                  activeStationId === "ALL"
                    ? "bg-indigo-950/50 text-indigo-200 font-semibold"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                      Global Network View
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Aggregated operations across all stations
                    </div>
                  </div>
                </div>
                {activeStationId === "ALL" && (
                  <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                )}
              </button>
            )}

            {/* List of Selectable Stations */}
            {filteredStations.map((stn: BranchStation) => {
              const isSelected = activeStationId === stn.id;
              const isAssigned = myAssignments.some(
                (a) => a.branchId === stn.id,
              );

              return (
                <button
                  key={stn.id}
                  type="button"
                  onClick={() => {
                    setActiveStation(stn.id, stn.stationCode);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-indigo-950/50 text-indigo-200"
                      : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-800/90 border border-slate-700/60 flex items-center justify-center shrink-0">
                      {getStationIcon(stn.stationType)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5 truncate">
                        <span>{stn.stationCode}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1 rounded">
                          {stn.unLocode}
                        </span>
                        {isAssigned && (
                          <span className="text-[9px] text-emerald-400 bg-emerald-950/80 px-1 py-0.2 rounded border border-emerald-800/60 font-medium inline-flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Assigned
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {stn.name} &bull; {stn.primaryCurrency}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}

            {filteredStations.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500">
                No matching branch stations found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
