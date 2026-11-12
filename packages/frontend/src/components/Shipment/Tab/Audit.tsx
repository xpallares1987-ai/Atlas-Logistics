/**
 * @file Audit.tsx
 * @description Transactional outbox audit trail and domain event verification for shipment 360 view.
 * Displays forensic history of published events, payloads, timestamps, and outbox delivery status.
 * @module @atlas/frontend/components/Shipment/Tab
 */

import React from "react";
import { FileText, RefreshCw } from "lucide-react";
import type { ShipmentAuditTabProps } from "../../../types/shipment-workspace360.types.js";

export const Audit: React.FC<ShipmentAuditTabProps> = ({
  shipmentDetail,
  auditEvents,
  auditLoading,
  onRefreshAudit,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Outbox Event Stream Audit Log
          </h3>
          <p className="text-xs text-slate-400">
            Immutable event log proving transactional aggregate mutation +
            outbox event consistency.
          </p>
        </div>

        <button
          onClick={() => onRefreshAudit(shipmentDetail.shipmentId)}
          disabled={auditLoading}
          className="px-2.5 py-1 text-[11px] rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1"
        >
          <RefreshCw
            className={`w-3 h-3 ${auditLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {auditLoading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Loading audit records...
        </div>
      ) : auditEvents.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
          No outbox audit records found.
        </div>
      ) : (
        <div className="space-y-2">
          {auditEvents.map((aud) => (
            <div
              key={aud.eventId}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-1"
            >
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold text-indigo-400">
                  {aud.eventType}
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(aud.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                <span>Status: {aud.status}</span>
                <span>•</span>
                <span>Event ID: {aud.eventId.slice(0, 16)}...</span>
              </div>
              <details className="mt-2 text-[10px] text-slate-500">
                <summary className="cursor-pointer hover:text-slate-300">
                  View Payload JSON
                </summary>
                <pre className="p-2 mt-1 rounded bg-slate-950 border border-slate-800 overflow-x-auto text-slate-400">
                  {JSON.stringify(aud.payload, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const AuditTab = Audit;
export const ShipmentAuditTab = Audit;
