'use client';

import { AlertTriangle, Clock, XCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { ExceptionRow } from '../types/dashboard';

interface ExceptionPanelProps {
  data: ExceptionRow[];
}

export function ExceptionPanel({ data }: ExceptionPanelProps) {
  if (data.length === 0) {
    return (
      <div className="panel-empty">
        <ShieldAlert size={48} className="panel-empty__icon text-emerald-400" />
        <h3>No exceptions detected</h3>
        <p>Your shipments are running smoothly. Upload an <strong>Exception</strong> report to track issues.</p>
      </div>
    );
  }

  const active = data.filter((r) => !r.resolved);
  const resolved = data.filter((r) => r.resolved);
  
  const critical = active.filter((r) => r.severity === 'CRITICAL');
  const high = active.filter((r) => r.severity === 'HIGH');
  const medium = active.filter((r) => r.severity === 'MEDIUM');


  const getSeverityBadge = (severity?: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return <span className="badge badge--danger animate-pulse">CRITICAL</span>;
      case 'HIGH': return <span className="badge badge--warning text-red-300">HIGH</span>;
      case 'MEDIUM': return <span className="badge badge--warning">MEDIUM</span>;
      case 'LOW': return <span className="badge badge--info">LOW</span>;
      default: return <span className="badge badge--muted">UNKNOWN</span>;
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type?.toUpperCase()) {
      case 'DELAY': return <Clock size={16} className="text-amber-400" />;
      case 'SLA_BREACH': return <XCircle size={16} className="text-red-400" />;
      case 'CUSTOMS_HOLD': return <ShieldAlert size={16} className="text-purple-400" />;
      case 'DAMAGE': return <AlertTriangle size={16} className="text-orange-400" />;
      default: return <AlertTriangle size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="exception-panel">
      {/* Summary Stats */}
      <div className="exception-summary grid grid-cols-4 gap-4 mb-6">
        <div className="fin-stat fin-stat--danger border-red-500/30 bg-red-500/10">
          <ShieldAlert size={20} className="text-red-400" />
          <div>
            <span className="fin-stat__label text-red-200">Critical Active</span>
            <span className="fin-stat__value text-red-400">{critical.length}</span>
          </div>
        </div>
        <div className="fin-stat fin-stat--warning border-amber-500/30 bg-amber-500/10">
          <AlertTriangle size={20} className="text-amber-400" />
          <div>
            <span className="fin-stat__label text-amber-200">High/Med Active</span>
            <span className="fin-stat__value text-amber-400">{high.length + medium.length}</span>
          </div>
        </div>
        <div className="fin-stat fin-stat--info border-blue-500/30 bg-blue-500/10">
          <Clock size={20} className="text-blue-400" />
          <div>
            <span className="fin-stat__label text-blue-200">Total Active</span>
            <span className="fin-stat__value text-blue-400">{active.length}</span>
          </div>
        </div>
        <div className="fin-stat fin-stat--success border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 size={20} className="text-emerald-400" />
          <div>
            <span className="fin-stat__label text-emerald-200">Resolved</span>
            <span className="fin-stat__value text-emerald-400">{resolved.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Exceptions List */}
        <div className="fin-table-card">
          <div className="card-header flex justify-between items-center">
            <div>
              <h3 className="text-red-400">Active Exceptions</h3>
              <p>Needs immediate attention</p>
            </div>
            <span className="badge badge--danger">{active.length}</span>
          </div>
          <div className="p-4 space-y-3">
            {active.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No active exceptions</p>
            ) : (
              active.map((row, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="mt-0.5">{getTypeIcon(row.exception_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-semibold text-slate-200">{row.shipment_ref}</span>
                      {getSeverityBadge(row.severity)}
                    </div>
                    <p className="text-sm text-slate-300 font-medium">{row.exception_type}</p>
                    {row.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{row.description}</p>}
                    <div className="text-[10px] text-slate-500 mt-2">
                      Detected: {row.detected_date ?? 'Unknown'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resolved Exceptions List */}
        <div className="fin-table-card">
          <div className="card-header flex justify-between items-center">
            <div>
              <h3 className="text-emerald-400">Recently Resolved</h3>
              <p>Historical issues</p>
            </div>
            <span className="badge badge--success">{resolved.length}</span>
          </div>
          <div className="p-4 space-y-3">
            {resolved.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No resolved exceptions</p>
            ) : (
              resolved.map((row, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/20 border border-slate-700/50 opacity-75">
                  <div className="mt-0.5"><CheckCircle2 size={16} className="text-emerald-500" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-semibold text-slate-300">{row.shipment_ref}</span>
                      <span className="text-[10px] text-slate-500">{row.exception_type}</span>
                    </div>
                    {row.description && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{row.description}</p>}
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
