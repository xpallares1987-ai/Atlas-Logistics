/**
 * @file Navigation.tsx
 * @description Tab navigation bar for IoT Control Tower module.
 * @module @atlas/frontend/components/IoTControlTower
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import type {
  IoTControlTab,
  IoTNavigationProps,
} from "../../types/iot-control-tower.types";

const TABS: IoTControlTab[] = ["MAP", "SENSORS", "ALERTS", "PLAYBACK"];

export function Navigation({
  activeTab,
  onSelectTab,
  activeAlertsCount,
}: IoTNavigationProps) {
  const labels: Record<IoTControlTab, string> = {
    MAP: "🗺 Mapa Global",
    SENSORS: "📡 Telemetría en Vivo",
    ALERTS: `🚨 Alertas Activas (${activeAlertsCount})`,
    PLAYBACK: "⏱ Timeline Playback",
  };

  return (
    <div className="flex items-center gap-2 border-b border-slate-700/60 pb-3 flex-wrap">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onSelectTab(tab)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === tab
              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
              : "bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          {labels[tab]}
        </button>
      ))}
    </div>
  );
}
