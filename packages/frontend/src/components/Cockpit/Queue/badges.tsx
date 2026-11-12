/**
 * @file badges.tsx
 * @description Operational visual badges and icons for urgency, priority, and transport mode in Cockpit.
 * @module @atlas/frontend/components/Cockpit/Queue/badges
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { Clock, Flame, Lock, Plane, Ship, Sparkles, Truck } from "lucide-react";
import type { CockpitWorkItem } from "../../../types/cockpit.types";

// ============================================================================
// 1. DOMAIN HELPER FUNCTIONS
// ============================================================================

export function getModeFamily(serviceType?: string): "OCEAN" | "AIR" | "ROAD" {
  const st = (serviceType || "").toUpperCase();
  if (st.includes("AIR")) return "AIR";
  if (st.includes("ROAD")) return "ROAD";
  return "OCEAN";
}

// ============================================================================
// 2. BADGE & ICON COMPONENTS
// ============================================================================

export const ServiceIcon: React.FC<{ serviceType: string }> = ({
  serviceType,
}) => {
  if (serviceType.includes("AIR"))
    return <Plane className="w-4 h-4 text-sky-400" />;
  if (serviceType.includes("ROAD"))
    return <Truck className="w-4 h-4 text-emerald-400" />;
  return <Ship className="w-4 h-4 text-indigo-400" />;
};

export const ModeTaskBadge: React.FC<{ item: CockpitWorkItem }> = ({
  item,
}) => {
  const mode = getModeFamily(item.serviceType);
  const taskCode = (item.taskTypeCode || "").toUpperCase();

  if (mode === "AIR" || taskCode.includes("AWB") || taskCode.includes("AIR")) {
    if (
      taskCode === "VERIFY_AWB_SECURITY_WEIGHT" ||
      taskCode.includes("SECURITY_WEIGHT")
    ) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-700/60 flex items-center gap-1">
          <Plane className="w-3 h-3 text-sky-400" /> AWB Security
        </span>
      );
    }
    if (taskCode === "ISSUE_AIR_WAYBILL" || taskCode.includes("WAYBILL")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-700/60 flex items-center gap-1">
          <Plane className="w-3 h-3 text-sky-400" /> e-AWB Cargo
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950/70 text-sky-300 border border-sky-800/50 flex items-center gap-1">
        <Plane className="w-3 h-3 text-sky-400" /> Air
      </span>
    );
  }

  if (
    mode === "ROAD" ||
    taskCode.includes("CMR") ||
    taskCode.includes("AXLE") ||
    taskCode.includes("ROAD")
  ) {
    if (
      taskCode === "VERIFY_VEHICLE_AXLE_WEIGHT" ||
      taskCode.includes("AXLE_WEIGHT")
    ) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700/60 flex items-center gap-1">
          <Truck className="w-3 h-3 text-amber-400" /> Axle Weight
        </span>
      );
    }
    if (taskCode === "ISSUE_ECMR_WAYBILL" || taskCode.includes("CMR")) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
          <Truck className="w-3 h-3 text-emerald-400" /> e-CMR
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
        <Truck className="w-3 h-3 text-emerald-400" /> Road
      </span>
    );
  }

  // Ocean
  if (taskCode === "VERIFY_VGM_CUTOFF" || taskCode.includes("VGM")) {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-700/60 flex items-center gap-1">
        <Ship className="w-3 h-3 text-blue-400" /> SOLAS VGM
      </span>
    );
  }
  if (
    taskCode === "ISSUE_BILL_OF_LADING" ||
    taskCode.includes("BILL_OF_LADING")
  ) {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-700/60 flex items-center gap-1">
        <Ship className="w-3 h-3 text-blue-400" /> Ocean B/L
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/70 text-blue-300 border border-blue-800/50 flex items-center gap-1">
      <Ship className="w-3 h-3 text-blue-400" /> Ocean
    </span>
  );
};

export const UrgencyBadge: React.FC<{ urgency: string }> = ({ urgency }) => {
  switch (urgency) {
    case "IMMEDIATE_ACTION":
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
          <Flame className="w-3 h-3 text-rose-400 animate-pulse" /> Immediate
        </span>
      );
    case "DUE_TODAY":
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-400" /> Due Today
        </span>
      );
    case "BLOCKED":
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
          <Lock className="w-3 h-3 text-purple-400" /> Blocked
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-300 border border-slate-600/40 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-slate-400" /> Upcoming
        </span>
      );
  }
};

export const PriorityBadge: React.FC<{
  priority: string;
  isBlocked: boolean;
}> = ({ priority, isBlocked }) => {
  if (isBlocked) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-800 text-slate-400 border border-slate-700">
        BLOCKED
      </span>
    );
  }
  switch (priority) {
    case "CRITICAL":
      return (
        <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-950 text-rose-300 border border-rose-800">
          CRITICAL · BLOCKING
        </span>
      );
    case "HIGH":
    case "MAJOR":
      return (
        <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-950 text-amber-300 border border-amber-800">
          HIGH PRIORITY
        </span>
      );
    case "MEDIUM":
    case "MINOR":
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-950 text-blue-300 border border-blue-800">
          MEDIUM
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-800 text-slate-400 border border-slate-700">
          LOW
        </span>
      );
  }
};
