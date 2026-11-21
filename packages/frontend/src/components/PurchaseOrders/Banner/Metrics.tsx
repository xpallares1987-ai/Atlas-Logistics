/**
 * @file Metrics.tsx
 * @description KPI Metric Cards for Supply Chain Purchase Orders Module (ADR 0032).
 * @module @atlas/frontend/components/PurchaseOrders/Banner/Metrics
 */

import React from "react";
import { Package, Clock, CheckCircle2, Ship } from "lucide-react";

export interface PoSummaryStats {
  total: number;
  inProduction: number;
  cargoReady: number;
  allocated: number;
}

interface MetricsProps {
  stats: PoSummaryStats;
}

export const Metrics: React.FC<MetricsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total POs */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between shadow-sm backdrop-blur-sm">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Total Purchase Orders
          </p>
          <p className="text-2xl font-bold text-slate-100 mt-1">
            {stats.total}
          </p>
        </div>
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
          <Package className="w-5 h-5" />
        </div>
      </div>

      {/* 2. In Production */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between shadow-sm backdrop-blur-sm">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            In Production
          </p>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {stats.inProduction}
          </p>
        </div>
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Cargo Ready */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between shadow-sm backdrop-blur-sm">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Cargo Ready (Pending Booking)
          </p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {stats.cargoReady}
          </p>
        </div>
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      {/* 4. Booked / Allocated */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between shadow-sm backdrop-blur-sm">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Allocated to Bookings
          </p>
          <p className="text-2xl font-bold text-cyan-400 mt-1">
            {stats.allocated}
          </p>
        </div>
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
          <Ship className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
