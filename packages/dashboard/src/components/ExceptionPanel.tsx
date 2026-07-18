"use client";

import {
  AlertTriangle,
  Clock,
  XCircle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import type { ExceptionRow } from "../types/dashboard";

interface ExceptionPanelProps {
  data: ExceptionRow[];
}

export function ExceptionPanel({ data }: ExceptionPanelProps) {
  if (data.length === 0) {
    return (
      <div className="panel-empty">
        <ShieldAlert size={48} className="panel-empty__icon text-emerald-400" />
        <h3>No exceptions detected</h3>
        <p>
          Your shipments are running smoothly. Upload an{" "}
          <strong>Exception</strong> report to track issues.
        </p>
      </div>
    );
  }

  const active = data.filter((r) => !r.resolved);
  const resolved = data.filter((r) => r.resolved);

  const critical = active.filter((r) => r.severity === "CRITICAL");
  const high = active.filter((r) => r.severity === "HIGH");
  const medium = active.filter((r) => r.severity === "MEDIUM");

  const getSeverityBadge = (severity?: string) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL":
        return (
          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-bold uppercase tracking-wider animate-pulse">
            CRITICAL
          </span>
        );
      case "HIGH":
        return (
          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded text-[10px] font-bold uppercase tracking-wider">
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold uppercase tracking-wider">
            MEDIUM
          </span>
        );
      case "LOW":
        return (
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[10px] font-bold uppercase tracking-wider">
            LOW
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-700/50 text-slate-400 border border-slate-600/50 rounded text-[10px] font-bold uppercase tracking-wider">
            UNKNOWN
          </span>
        );
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type?.toUpperCase()) {
      case "DELAY":
        return <Clock size={16} className="text-amber-400" />;
      case "SLA_BREACH":
        return <XCircle size={16} className="text-red-400" />;
      case "CUSTOMS_HOLD":
        return <ShieldAlert size={16} className="text-purple-400" />;
      case "DAMAGE":
        return <AlertTriangle size={16} className="text-orange-400" />;
      default:
        return <AlertTriangle size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-2">
        <div className="relative overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-red-500/30 rounded-3xl p-6 shadow-[0_4px_20px_rgba(239,68,68,0.15)] flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-2xl">
            <ShieldAlert size={24} className="text-red-400" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider block mb-1">
              Critical Active
            </span>
            <span className="text-3xl font-black text-white tracking-tight">
              {critical.length}
            </span>
          </div>
        </div>
        <div className="relative overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-6 shadow-[0_4px_20px_rgba(245,158,11,0.15)] flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-2xl">
            <AlertTriangle size={24} className="text-amber-400" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider block mb-1">
              High/Med Active
            </span>
            <span className="text-3xl font-black text-white tracking-tight">
              {high.length + medium.length}
            </span>
          </div>
        </div>
        <div className="relative overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-6 shadow-[0_4px_20px_rgba(59,130,246,0.15)] flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl">
            <Clock size={24} className="text-blue-400" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider block mb-1">
              Total Active
            </span>
            <span className="text-3xl font-black text-white tracking-tight">
              {active.length}
            </span>
          </div>
        </div>
        <div className="relative overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-6 shadow-[0_4px_20px_rgba(16,185,129,0.15)] flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl">
            <CheckCircle2 size={24} className="text-emerald-400" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider block mb-1">
              Resolved
            </span>
            <span className="text-3xl font-black text-white tracking-tight">
              {resolved.length}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Exceptions List */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/30">
            <div>
              <h3 className="text-xl font-black text-red-400">
                Active Exceptions
              </h3>
              <p className="text-slate-400 text-sm font-medium mt-1">
                Needs immediate attention
              </p>
            </div>
            <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider rounded-full border border-red-500/30">
              {active.length}
            </span>
          </div>
          <div className="p-6 space-y-4">
            {active.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">
                No active exceptions
              </p>
            ) : (
              active.map((row, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/50 border border-slate-700 transition-colors hover:bg-slate-800/70"
                >
                  <div className="mt-1 p-2 bg-slate-900/50 rounded-xl border border-slate-700/50">
                    {getTypeIcon(row.exception_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm font-bold text-slate-200">
                        {row.shipment_ref}
                      </span>
                      {getSeverityBadge(row.severity)}
                    </div>
                    <p className="text-sm text-slate-300 font-bold mb-1">
                      {row.exception_type}
                    </p>
                    {row.description && (
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                        {row.description}
                      </p>
                    )}
                    <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mt-3 flex items-center gap-1.5">
                      <Clock size={10} /> Detected:{" "}
                      {row.detected_date ?? "Unknown"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resolved Exceptions List */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/30">
            <div>
              <h3 className="text-xl font-black text-emerald-400">
                Recently Resolved
              </h3>
              <p className="text-slate-400 text-sm font-medium mt-1">
                Historical issues
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-full border border-emerald-500/30">
              {resolved.length}
            </span>
          </div>
          <div className="p-6 space-y-4">
            {resolved.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">
                No resolved exceptions
              </p>
            ) : (
              resolved.map((row, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/20 border border-slate-700/50 opacity-80 transition-opacity hover:opacity-100"
                >
                  <div className="mt-1 p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm font-bold text-slate-300">
                        {row.shipment_ref}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
                        {row.exception_type}
                      </span>
                    </div>
                    {row.description && (
                      <p className="text-xs text-slate-400 leading-relaxed mt-2 line-clamp-1">
                        {row.description}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
