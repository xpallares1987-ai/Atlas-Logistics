/**
 * @file Navigation.tsx
 * @description Tab navigation bar for Demurrage & Detention Control Tower views.
 * @module @atlas/frontend/components/Demurrage
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { Clock, PauseCircle, Scale, FileText } from "lucide-react";
import type { DemurrageTabKey } from "../../types/demurrage.types";

interface NavigationProps {
  activeTab: DemurrageTabKey;
  onTabChange: (tab: DemurrageTabKey) => void;
}

const TABS: Array<{ key: DemurrageTabKey; label: string; icon: any }> = [
  {
    key: "RADAR",
    label: "1. Radar de Free-Time & Clocks",
    icon: Clock,
  },
  {
    key: "SUSPENSIONS",
    label: "2. Motor de Suspensión de Reloj",
    icon: PauseCircle,
  },
  {
    key: "AUDIT",
    label: "3. Auditoría Factura vs. EDI 315",
    icon: Scale,
  },
  {
    key: "DOSSIER",
    label: "4. Dossier Evidencial & Disputa",
    icon: FileText,
  },
];

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              isActive
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
