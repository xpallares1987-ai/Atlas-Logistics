/**
 * @file Navigation.tsx
 * @description Tab navigation bar for the Scope 3 Carbon Footprint Calculator module.
 * @module @atlas/frontend/components/CarbonEmissions
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Layers, Calculator, TreePine, Award } from "lucide-react";
import type { CarbonNavigationProps } from "../../types/carbon-emissions.types";

export function Navigation({
  activeTab,
  onSelectTab,
  calculationsCount,
  projectsCount,
  certificatesCount,
}: CarbonNavigationProps) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-700/60 pb-3">
      <button
        onClick={() => onSelectTab("JOURNEYS")}
        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
          activeTab === "JOURNEYS"
            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
            : "bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800"
        }`}
      >
        <Layers size={15} />
        Expediciones Auditadas ({calculationsCount})
      </button>

      <button
        onClick={() => onSelectTab("CALCULATOR")}
        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
          activeTab === "CALCULATOR"
            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
            : "bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800"
        }`}
      >
        <Calculator size={15} />
        Calculadora Multimodal GLEC v3
      </button>

      <button
        onClick={() => onSelectTab("MARKETPLACE")}
        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
          activeTab === "MARKETPLACE"
            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
            : "bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800"
        }`}
      >
        <TreePine size={15} />
        Marketplace de Compensación ({projectsCount})
      </button>

      <button
        onClick={() => onSelectTab("CERTIFICATES")}
        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
          activeTab === "CERTIFICATES"
            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
            : "bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800"
        }`}
      >
        <Award size={15} />
        Certificados Emitidos ({certificatesCount})
      </button>
    </div>
  );
}
