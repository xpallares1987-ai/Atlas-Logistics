/**
 * @file ItemCard.tsx
 * @description Work item queue card displaying operational urgency, scoring breakdown, and navigation shortcuts.
 * @module @atlas/frontend/components/Cockpit/Queue/ItemCard
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import type { CockpitWorkItem } from "../../../types/cockpit.types";
import {
  ModeTaskBadge,
  PriorityBadge,
  ServiceIcon,
  UrgencyBadge,
} from "./badges";

// ============================================================================
// 1. COMPONENT PROPS
// ============================================================================

interface ItemCardProps {
  item: CockpitWorkItem;
  isSelected: boolean;
  onSelect: (item: CockpitWorkItem) => void;
  onNavigateResolveIn360: (item: CockpitWorkItem) => void;
}

// ============================================================================
// 2. COMPONENT IMPLEMENTATION
// ============================================================================

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  isSelected,
  onSelect,
  onNavigateResolveIn360,
}) => {
  const isException = item.itemType === "EXCEPTION";

  return (
    <div
      onClick={() => onSelect(item)}
      className={`p-4 rounded-xl border transition cursor-pointer relative ${
        isSelected
          ? "bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-950/50"
          : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900"
      }`}
    >
      {/* Selection Indicator Strip */}
      {isSelected && (
        <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-500 rounded-r" />
      )}

      {/* Card Header: WHAT & WHERE */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isException ? (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
              EXCEPTION
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              TASK
            </span>
          )}
          <span className="text-xs font-mono text-slate-400">
            {item.taskTypeCode}
          </span>
          <ModeTaskBadge item={item} />
        </div>

        <div className="flex items-center gap-1.5">
          <UrgencyBadge urgency={item.urgencyBucket} />
        </div>
      </div>

      {/* Title (WHAT) */}
      <h2 className="text-sm font-bold text-white mt-1.5 line-clamp-1">
        {item.title}
      </h2>

      {/* Where & Impact */}
      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
        <div className="flex items-center gap-1 font-mono text-slate-300">
          <ServiceIcon serviceType={item.serviceType} />
          <span className="hover:text-indigo-400 transition">
            {item.shipmentReference}
          </span>
        </div>
        <span>•</span>
        <div>
          <PriorityBadge priority={item.priority} isBlocked={item.isBlocked} />
        </div>
      </div>

      {/* WHY NOW: Attention Score & Factor Breakdown */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Attention:</span>
            <span
              className={`font-bold px-1.5 py-0.2 rounded text-[11px] ${
                item.attentionScore >= 80
                  ? "bg-rose-950 text-rose-300 border border-rose-800"
                  : item.attentionScore >= 60
                    ? "bg-amber-950 text-amber-300 border border-amber-800"
                    : "bg-slate-800 text-slate-300"
              }`}
            >
              {item.attentionScore}/100
            </span>
          </div>

          <div className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
            <span>{item.primaryAction?.actionLabel || "View Details"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Quick Factors & Direct 360 Action */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/40">
          <div className="flex items-center gap-1 overflow-hidden">
            {item.scoreBreakdown?.slice(0, 2).map((factor, fIdx) => (
              <span
                key={fIdx}
                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60 font-mono truncate max-w-[110px]"
                title={factor.explanation}
              >
                +{factor.points} {factor.factor.replace(/_/g, " ")}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateResolveIn360(item);
            }}
            className="px-2 py-0.5 text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/50 rounded flex items-center gap-1 transition shrink-0"
            title="Open in Shipment 360 with Contextual Action Drawer"
          >
            <span>Resolve in 360</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
