/**
 * @file Hero.tsx
 * @description Hero banner summary component for operational shipment 360 view.
 * Displays shipment reference, service mode, customer party, and linear workflow progress.
 * @module @atlas/frontend/components/Shipment/Banner
 */

import React from "react";
import { Compass } from "lucide-react";
import type { OperationalShipment360View } from "../../../types/shipment-workspace360.types.js";

export interface ShipmentHeroBannerProps {
  shipmentDetail: OperationalShipment360View;
  healthBadge?: React.ReactNode;
}

export const Hero: React.FC<ShipmentHeroBannerProps> = ({
  shipmentDetail,
  healthBadge,
}) => {
  return (
    <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black tracking-tight text-white">
            {shipmentDetail.shipmentReference || shipmentDetail.shipmentId}
          </h2>
          {healthBadge}
          <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
            v{shipmentDetail.projectionVersion}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            {shipmentDetail.serviceType}
          </span>
          <span>•</span>
          <span className="font-semibold text-slate-300">
            Lifecycle: {shipmentDetail.lifecycle}
          </span>
          <span>•</span>
          <span>
            Customer: {shipmentDetail.customerPartyId || "ACME Global Shipping"}
          </span>
          <span>•</span>
          <span className="text-slate-500">
            Updated:{" "}
            {new Date(shipmentDetail.lastUpdatedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Quick Progress Indicator */}
      <div className="flex items-center gap-6 bg-slate-950/60 px-5 py-3 rounded-xl border border-slate-800">
        <div className="text-right">
          <div className="text-[10px] uppercase font-bold text-slate-400">
            Workflow Progress
          </div>
          <div className="text-xl font-black text-indigo-400">
            {shipmentDetail.metrics?.progressPercentage ?? 0}%
          </div>
        </div>
        <div className="w-24 bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-indigo-500 h-full rounded-full transition-all duration-500"
            style={{
              width: `${shipmentDetail.metrics?.progressPercentage ?? 0}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export const HeroBanner = Hero;
export const ShipmentHeroBanner = Hero;
