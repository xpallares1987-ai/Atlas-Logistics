/**
 * @file Header.tsx
 * @description Header bar with global navigation actions and operational execution triggers for Cockpit.
 * @module @atlas/frontend/components/Cockpit/Header
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { Compass, RefreshCw, ShieldAlert, Zap } from "lucide-react";

// ============================================================================
// 1. COMPONENT PROPS
// ============================================================================

interface HeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onNavigateExceptions: () => void;
  onNavigateShipment360: () => void;
}

// ============================================================================
// 2. COMPONENT IMPLEMENTATION
// ============================================================================

export const Header: React.FC<HeaderProps> = ({
  loading,
  onRefresh,
  onNavigateExceptions,
  onNavigateShipment360,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
            <Zap className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Operations Cockpit 2.0
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Work-to-User
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Prioritized operational inbox: Explain → Decide → Act → Confirm
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />{" "}
          Refresh
        </button>
        <button
          onClick={onNavigateExceptions}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-lg border border-rose-800/40 transition"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Exception Center
        </button>
        <button
          onClick={onNavigateShipment360}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-indigo-300 rounded-lg border border-indigo-800/40 transition"
        >
          <Compass className="w-3.5 h-3.5 text-indigo-400" /> Shipment 360
        </button>
      </div>
    </div>
  );
};
