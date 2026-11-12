/**
 * @file ControlPlane.tsx
 * @description CQRS read model projections, outbox reconciliation, and platform governance tab.
 * @module @atlas/frontend/components/SystemPanel/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { Server, RotateCcw, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@atlas/ui";

interface ControlPlaneProps {
  canManageControlPlane: boolean;
  isRebuilding: boolean;
  rebuildSuccess: boolean;
  onRebuildProjections: () => void;
}

export function ControlPlane({
  canManageControlPlane,
  isRebuilding,
  rebuildSuccess,
  onRebuildProjections,
}: ControlPlaneProps) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Server size={18} className="text-indigo-400" />
              <span>CQRS Read Model Projections & Outbox Health</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Authoritative materialization for Operations Cockpit, Shipment
              360, and Dead-Letter Queue reconciliation.
            </p>
          </div>

          {canManageControlPlane && (
            <Button
              onClick={onRebuildProjections}
              disabled={isRebuilding}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
            >
              <RotateCcw
                size={14}
                className={isRebuilding ? "animate-spin" : ""}
              />
              <span>
                {isRebuilding
                  ? "Rebuilding Projections..."
                  : "Trigger Full Rebuild"}
              </span>
            </Button>
          )}
        </div>

        {rebuildSuccess && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>
              CQRS read models successfully synchronized from immutable event
              store.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase text-slate-500">
              Operations Cockpit Projections
            </span>
            <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
              <CheckCircle2 size={16} /> HEALTHY (0ms lag)
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase text-slate-500">
              Shipment 360 Aggregates
            </span>
            <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
              <CheckCircle2 size={16} /> 324 Synced Views
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] font-bold uppercase text-slate-500">
              Dead-Letter Queue (DLQ)
            </span>
            <div className="text-sm font-bold text-slate-200 flex items-center gap-1.5 mt-1">
              <ShieldCheck size={16} className="text-emerald-400" /> 0 Unhandled
              Errors
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ControlPlane;
