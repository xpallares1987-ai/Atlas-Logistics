/**
 * @file Navigation.tsx
 * @description Tab navigation bar for the North American Cross-Border Corridor module.
 * @module @atlas/frontend/components/CrossBorder
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import React from "react";
import { FileText, Percent, Clock } from "lucide-react";
import type { CrossBorderTab } from "../../types/cross-border.types";

export interface CrossBorderNavigationProps {
  activeTab: CrossBorderTab;
  onSelectTab: (tab: CrossBorderTab) => void;
}

export function Navigation({
  activeTab,
  onSelectTab,
}: CrossBorderNavigationProps) {
  const select = (tab: CrossBorderTab) => {
    React.startTransition(() => onSelectTab(tab));
  };

  return (
    <div className="flex border-b border-slate-800 gap-2">
      <button
        onClick={() => select("CARTA_PORTE")}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 border-b-2 ${
          activeTab === "CARTA_PORTE"
            ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
            : "border-transparent text-slate-400 hover:text-slate-200"
        }`}
      >
        <FileText className="w-4 h-4" />
        SAT Carta Porte 3.1 & CFDI 4.0
      </button>

      <button
        onClick={() => select("USMCA_IMMEX")}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 border-b-2 ${
          activeTab === "USMCA_IMMEX"
            ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
            : "border-transparent text-slate-400 hover:text-slate-200"
        }`}
      >
        <Percent className="w-4 h-4" />
        Reglas de Origen T-MEC & IMMEX
      </button>

      <button
        onClick={() => select("CUSTOMS_ML")}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 border-b-2 ${
          activeTab === "CUSTOMS_ML"
            ? "border-amber-500 text-amber-400 bg-amber-500/5"
            : "border-transparent text-slate-400 hover:text-slate-200"
        }`}
      >
        <Clock className="w-4 h-4" />
        Predictor ML de Permanencia y Aforo
      </button>
    </div>
  );
}
