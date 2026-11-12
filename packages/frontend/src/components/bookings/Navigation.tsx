/**
 * @file Navigation.tsx
 * @description Tab navigation bar for Ocean Booking & Equipment Control Tower.
 * @module @atlas/frontend/components/bookings
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { DollarSign, Clock, FileText, QrCode } from "lucide-react";
import type { TabKey } from "../../types/booking-management.types";

export interface BookingNavigationProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

const TABS = [
  {
    key: "RATE_LOCK" as const,
    label: "1. Tarifas Spot & Despacho DCSA",
    icon: DollarSign,
  },
  {
    key: "CUTOFF_RADAR" as const,
    label: "2. Radar de Plazos Cut-Off",
    icon: Clock,
  },
  {
    key: "SI_STUDIO" as const,
    label: "3. Instrucciones B/L (EDI 304)",
    icon: FileText,
  },
  {
    key: "EQUIPMENT_RELEASE" as const,
    label: "4. Pase de Equipo Vacío (Depot)",
    icon: QrCode,
  },
];

export function Navigation({ activeTab, onSelectTab }: BookingNavigationProps) {
  return (
    <div className="flex border-b border-slate-800 gap-2">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onSelectTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
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
