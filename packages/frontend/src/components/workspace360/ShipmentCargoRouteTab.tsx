import React from "react";
import { Boxes, Compass } from "lucide-react";
import { ShipmentCargoRouteTabProps } from "../../types/shipment-workspace360.types";

export const ShipmentCargoRouteTab: React.FC<ShipmentCargoRouteTabProps> = ({
  shipmentDetail,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Physical Cargo */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Boxes className="w-4 h-4 text-indigo-400" />
          Cargo Specifications & Containers
        </h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-slate-400 block text-[11px]">
              Total Weight
            </span>
            <span className="font-bold text-slate-200 mt-1 block">
              {shipmentDetail.shipment?.cargoDetails?.totalWeightKg ?? 18450} kg
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-slate-400 block text-[11px]">Volume</span>
            <span className="font-bold text-slate-200 mt-1 block">
              {shipmentDetail.shipment?.cargoDetails?.totalVolumeCbm ?? 42.5}{" "}
              CBM
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-slate-400 block text-[11px]">
              Package Count
            </span>
            <span className="font-bold text-slate-200 mt-1 block">
              {shipmentDetail.shipment?.cargoDetails?.packageCount ?? 24}{" "}
              Packages / Pallets
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-slate-400 block text-[11px]">
              Cargo Classification
            </span>
            <span className="font-bold text-slate-200 mt-1 block">
              {shipmentDetail.shipment?.cargoDetails?.cargoType ??
                "GENERAL_COMMODITY"}
            </span>
          </div>
        </div>
      </div>

      {/* Route Legs */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo-400" />
          Multi-Modal Route Execution Legs
        </h3>
        {shipmentDetail.routePlan?.legs &&
        shipmentDetail.routePlan.legs.length > 0 ? (
          <div className="space-y-2">
            {shipmentDetail.routePlan.legs.map((leg) => (
              <div
                key={leg.legId}
                className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                    {leg.sequence}
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">
                      {leg.originLocode} → {leg.destinationLocode}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Carrier: {leg.carrierCode || "MAEU"}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                  {leg.mode}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500 py-6 text-center">
            No legs planned yet.
          </div>
        )}
      </div>
    </div>
  );
};
