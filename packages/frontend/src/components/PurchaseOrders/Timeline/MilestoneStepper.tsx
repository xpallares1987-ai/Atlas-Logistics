/**
 * @file MilestoneStepper.tsx
 * @description End-to-End visual supply chain milestone stepper tracking factory production,
 * international carrier transit (DCSA/AIS), and final mile delivery with delay badges (ADR 0033).
 * @module @atlas/frontend/components/PurchaseOrders/Timeline/MilestoneStepper
 * @see {@link docs/adr/0033-supply-chain-visibility-and-predictive-milestone-tracking.md}
 */

import React from "react";
import {
  Factory,
  Ship,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export interface SupplyChainMilestoneItem {
  id: string;
  milestoneCode: string;
  milestoneCategory: "SUPPLIER_PRODUCTION" | "CARRIER_TRANSIT" | "FINAL_DELIVERY";
  status: "PLANNED" | "ESTIMATED" | "ACTUAL" | "CANCELLED";
  plannedTimestamp: string;
  estimatedTimestamp?: string | null;
  actualTimestamp?: string | null;
  delayHours: number;
  locationCode?: string | null;
  locationName?: string | null;
  vesselName?: string | null;
  carrierCode?: string | null;
  dataSource?: string;
  notes?: string | null;
}

export interface SupplyChainExceptionSummary {
  id: string;
  exceptionCode: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "ACKNOWLEDGED" | "IN_MITIGATION" | "RESOLVED" | "IGNORED";
  title: string;
  delayEstimateHours: number;
  financialRiskAmount?: string | null;
}

interface MilestoneStepperProps {
  milestones: SupplyChainMilestoneItem[];
  activeExceptions?: SupplyChainExceptionSummary[];
  onSelectException?: (exception: SupplyChainExceptionSummary) => void;
  className?: string;
}

const CATEGORY_CONFIG = {
  SUPPLIER_PRODUCTION: {
    title: "1. Origin & Factory",
    icon: Factory,
    accentColor: "blue",
    badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  CARRIER_TRANSIT: {
    title: "2. International Transit",
    icon: Ship,
    accentColor: "indigo",
    badgeBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  },
  FINAL_DELIVERY: {
    title: "3. Customs & Final Mile",
    icon: MapPin,
    accentColor: "emerald",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
} as const;

export const MilestoneStepper: React.FC<MilestoneStepperProps> = ({
  milestones,
  activeExceptions = [],
  onSelectException,
  className = "",
}) => {
  const categories: Array<"SUPPLIER_PRODUCTION" | "CARRIER_TRANSIT" | "FINAL_DELIVERY"> = [
    "SUPPLIER_PRODUCTION",
    "CARRIER_TRANSIT",
    "FINAL_DELIVERY",
  ];

  // Calculate cumulative delay across all actual or estimated milestones
  const maxDelay = milestones.reduce((max, m) => Math.max(max, m.delayHours), 0);

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return "—";
    try {
      const d = new Date(ts);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return ts;
    }
  };

  const getStatusDot = (status: SupplyChainMilestoneItem["status"], delay: number) => {
    if (status === "ACTUAL") {
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
    if (status === "CANCELLED") {
      return <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />;
    }
    if (delay > 24) {
      return <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />;
    }
    if (delay > 0) {
      return <Clock className="w-4 h-4 text-amber-400" />;
    }
    return <div className="w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-500" />;
  };

  return (
    <div className={`p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4 ${className}`}>
      {/* Header & Overall Health Badge */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            End-to-End Visibility Stream (ADR 0033)
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {maxDelay <= 0 ? (
            <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" /> On Track
            </span>
          ) : maxDelay <= 24 ? (
            <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> +{maxDelay}h Latency Risk
            </span>
          ) : (
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-3 h-3" /> +{maxDelay}h Critical Delay
            </span>
          )}

          {activeExceptions.length > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              {activeExceptions.length} Exception{activeExceptions.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Active Exceptions Alert Banners */}
      {activeExceptions.length > 0 && (
        <div className="space-y-1.5">
          {activeExceptions.map((exc) => (
            <button
              key={exc.id}
              onClick={() => onSelectException?.(exc)}
              className="w-full text-left p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 hover:border-rose-600/60 transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-rose-200 group-hover:text-rose-100">
                    {exc.title}
                  </span>
                  <span className="text-[10px] text-rose-400/80 ml-2 font-mono">
                    [{exc.exceptionCode}]
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-900/60 text-rose-300 uppercase">
                  {exc.severity}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 3 Macro-Phase Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
        {categories.map((catKey) => {
          const config = CATEGORY_CONFIG[catKey];
          const Icon = config.icon;
          const catMilestones = milestones.filter((m) => m.milestoneCategory === catKey);

          return (
            <div
              key={catKey}
              className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between space-y-3"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md border ${config.badgeBg}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-200">{config.title}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {catMilestones.filter((m) => m.status === "ACTUAL").length}/
                  {catMilestones.length}
                </span>
              </div>

              {/* Milestones Vertical Sequence */}
              <div className="space-y-2">
                {catMilestones.length === 0 ? (
                  <div className="text-[11px] text-slate-600 italic py-2">
                    Awaiting carrier allocation
                  </div>
                ) : (
                  catMilestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="flex items-start justify-between text-xs py-1 border-b border-slate-900/80 last:border-0"
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 flex-shrink-0">
                          {getStatusDot(milestone.status, milestone.delayHours)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-300 leading-tight">
                            {milestone.milestoneCode.replace(/_/g, " ")}
                          </div>
                          {milestone.locationCode && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5" /> {milestone.locationCode}
                              {milestone.vesselName ? ` • ${milestone.vesselName}` : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-2">
                        <span className="font-mono text-[11px] text-slate-400 block">
                          {formatTimestamp(milestone.actualTimestamp || milestone.estimatedTimestamp || milestone.plannedTimestamp)}
                        </span>
                        {milestone.delayHours > 0 && (
                          <span className="text-[10px] font-semibold text-rose-400 font-mono">
                            +{milestone.delayHours}h
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
