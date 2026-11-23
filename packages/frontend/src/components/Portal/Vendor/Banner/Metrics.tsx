/**
 * @file Metrics.tsx
 * @description Summary KPI cards for B2B Vendor Portal (ADR 0035).
 * Displays sanitized operational counts for supplier commitments and factory execution.
 * @module @atlas/frontend/components/Portal/Vendor/Banner/Metrics
 * @see {@link docs/adr/0035-b2b-customer-and-vendor-portal-architecture.md}
 */

import React from "react";
import { Package, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import type { VendorPortalStats } from "../types";

interface MetricsProps {
  stats: VendorPortalStats;
}

export const Metrics: React.FC<MetricsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Assigned Orders */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
        <div className="p-3 bg-blue-950/60 border border-blue-800/50 rounded-lg text-blue-400">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Total Orders
          </p>
          <p className="text-2xl font-bold text-slate-100">
            {stats.totalOrders}
          </p>
        </div>
      </div>

      {/* 2. Pending Supplier Confirmation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
        <div className="p-3 bg-amber-950/60 border border-amber-800/50 rounded-lg text-amber-400">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Pending Confirmation
          </p>
          <p className="text-2xl font-bold text-amber-400">
            {stats.pendingConfirmation}
          </p>
        </div>
      </div>

      {/* 3. Confirmed & Locked */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/50 rounded-lg text-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Confirmed & Locked
          </p>
          <p className="text-2xl font-bold text-emerald-400">
            {stats.confirmed}
          </p>
        </div>
      </div>

      {/* 4. Active Exceptions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
        <div className="p-3 bg-rose-950/60 border border-rose-800/50 rounded-lg text-rose-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Active Alerts
          </p>
          <p className="text-2xl font-bold text-rose-400">
            {stats.withExceptions}
          </p>
        </div>
      </div>
    </div>
  );
};
