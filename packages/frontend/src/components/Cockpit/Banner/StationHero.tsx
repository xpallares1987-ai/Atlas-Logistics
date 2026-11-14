/**
 * @file StationHero.tsx
 * @description Operational hero banner displaying active station context, local timezone clock, currency, and auditor oversight mode.
 * @module @atlas/frontend/components/Cockpit/Banner/StationHero
 * @see {@link docs/adr/0022-enterprise-freight-forwarding-organization-schema-and-governance.md}
 */

import React, { useEffect, useState } from "react";
import {
  Clock,
  Coins,
  Globe,
  ShieldAlert,
  Anchor,
  Plane,
  Train,
  MapPin,
} from "lucide-react";
import type { BranchStation } from "../../../store/useOrganizationStore.js";

// ============================================================================
// 1. COMPONENT PROPS
// ============================================================================

interface StationHeroProps {
  station: BranchStation;
  isAuditorMode: boolean;
  onResetStation: () => void;
}

// ============================================================================
// 2. COMPONENT IMPLEMENTATION
// ============================================================================

export const StationHero: React.FC<StationHeroProps> = ({
  station,
  isAuditorMode,
  onResetStation,
}) => {
  const [localTime, setLocalTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      try {
        const timeStr = new Intl.DateTimeFormat(undefined, {
          timeZone: station.timezone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date());
        setLocalTime(timeStr);
      } catch {
        setLocalTime(new Date().toLocaleTimeString());
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [station.timezone]);

  const getStationTypeIcon = (type?: string) => {
    switch (type) {
      case "AIR_CARGO_HUB":
        return <Plane className="w-5 h-5 text-sky-400" />;
      case "INTERMODAL_RAIL_RAMP":
        return <Train className="w-5 h-5 text-amber-400" />;
      case "OCEAN_GATEWAY":
      default:
        return <Anchor className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-800/40 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-indigo-950/20">
      {/* Station Identity & Location */}
      <div className="flex items-start md:items-center gap-3.5">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shrink-0 mt-0.5 md:mt-0">
          {getStationTypeIcon(station.stationType)}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
              {station.stationCode}
            </span>
            <h2 className="text-base font-bold text-white tracking-tight">
              {station.name}
            </h2>
            {isAuditorMode && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <ShieldAlert className="w-3.5 h-3.5" />
                Auditor Mode (Oversight View)
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              {station.address?.city || station.unLocode} (UN/LOCODE:{" "}
              <strong className="text-slate-300">{station.unLocode}</strong>)
            </span>
            <span>&bull;</span>
            <span className="text-slate-400">
              Type:{" "}
              <span className="text-slate-300 font-medium">
                {station.stationType.replace(/_/g, " ")}
              </span>
            </span>
            {station.fmcOtiNumber && (
              <>
                <span>&bull;</span>
                <span className="text-slate-400">
                  FMC OTI:{" "}
                  <strong className="text-slate-300">
                    {station.fmcOtiNumber}
                  </strong>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Live Operational Metrics & Clock */}
      <div className="flex flex-wrap items-center gap-4 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
        <div className="flex items-center gap-3">
          {/* Timezone Live Clock */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
                Station Local Time
              </span>
              <span className="font-bold text-white text-xs tracking-wider">
                {localTime || "--:--:--"}
              </span>
            </div>
          </div>

          {/* Currency Pill */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 shadow-inner">
            <Coins className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans">
                Currency
              </span>
              <span className="font-bold text-white text-xs">
                {station.primaryCurrency}
              </span>
            </div>
          </div>
        </div>

        {/* Reset to Global Scope Button */}
        <button
          onClick={onResetStation}
          title="Switch view to All Global Stations"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 transition shadow-sm"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span>All Stations</span>
        </button>
      </div>
    </div>
  );
};
