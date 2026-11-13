/**
 * @file AssetListSidebar.tsx
 * @description Real-time multimodal asset list sidebar for IoT Control Tower.
 * @module @atlas/frontend/components/IoTControlTower/Panel
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import {
  Activity,
  MapPin,
  Navigation as NavigationIcon,
  Plane,
  Ship,
  TrainTrack,
  Truck,
} from "lucide-react";
import type { AssetListSidebarProps } from "../../../types/iot-control-tower.types";
import { getStatusColor } from "../hooks/useIoTControlTower";

function getAssetIcon(type: string, size = 18) {
  switch (type) {
    case "VESSEL":
      return <Ship size={size} />;
    case "CARGO_AIRCRAFT":
      return <Plane size={size} />;
    case "TRUCK_EV":
      return <Truck size={size} />;
    case "TRAIN_WAGON":
      return <TrainTrack size={size} />;
    default:
      return <NavigationIcon size={size} />;
  }
}

export function AssetListSidebar({
  assets,
  selectedAssetId,
  onSelectAsset,
}: AssetListSidebarProps) {
  return (
    <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 flex flex-col gap-3">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <NavigationIcon size={16} className="text-cyan-400" />
        Activos en Tiempo Real
      </h3>
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[600px] pr-1">
        {assets.map((asset) => {
          const isSelected = asset.id === selectedAssetId;
          const isCritical = asset.status === "CRITICAL_ALERT";
          return (
            <div
              key={asset.id}
              onClick={() => onSelectAsset(asset.id)}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? "bg-cyan-950/40 border-cyan-500/50 shadow-lg"
                  : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
              } ${isCritical ? "ring-1 ring-red-500/50 animate-pulse-slow" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${isCritical ? "bg-red-500/20 text-red-400" : "bg-cyan-500/20 text-cyan-400"}`}
                  >
                    {getAssetIcon(asset.assetType, 14)}
                  </div>
                  <span className="font-bold text-xs text-white truncate max-w-[120px]">
                    {asset.assetCode}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${getStatusColor(asset.status)}`}
                >
                  {asset.status === "IN_TRANSIT"
                    ? "EN RUTA"
                    : asset.status === "CRITICAL_ALERT"
                      ? "⚠ CRÍTICO"
                      : asset.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium truncate mb-1.5">
                {asset.name}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin size={9} />{" "}
                  {asset.destinationName.split("(")[0].trim()}
                </span>
                <span className="flex items-center gap-1">
                  <Activity size={9} /> {asset.currentSpeedKnots.toFixed(1)} kn
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
