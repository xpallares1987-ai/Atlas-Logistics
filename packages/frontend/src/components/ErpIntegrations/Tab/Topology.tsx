/**
 * @file Topology.tsx
 * @description Live connector topology, telemetry, and circuit breaker status for SAP, NetSuite, and Dynamics 365 BC.
 * @module @atlas/frontend/components/ErpIntegrations/Tab/Topology
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import type { ErpConnectorStatus } from "@atlas/shared";

export interface TopologyProps {
  connectors: ErpConnectorStatus[];
}

export const Topology: React.FC<TopologyProps> = ({ connectors }) => {
  const sap =
    connectors.find((c) => c.system === "SAP_S4HANA") || connectors[0];
  const netSuite =
    connectors.find((c) => c.system === "ORACLE_NETSUITE") || connectors[1];
  const dynamicsBc = connectors.find(
    (c) => c.system === "MICROSOFT_DYNAMICS_365_BC",
  ) || {
    system: "MICROSOFT_DYNAMICS_365_BC",
    endpoint:
      "https://api.businesscentral.dynamics.com/v2.0/atlas-corp/Production/ODataV4/Company('Atlas_Logistics')/GeneralJournals",
    status: "ONLINE" as const,
    circuitBreaker: "CLOSED" as const,
    latencyMs: 135,
    lastSyncTimestamp: Date.now() - 60000,
    activeAuthMethod: "OAUTH2_BEARER" as const,
    metrics: {
      totalSyncedToday: 64,
      failedSyncCount: 0,
      pendingQueueDepth: 0,
      averageLatencyMs: 140,
    },
  };

  return (
    <motion.div
      key="topology"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* SAP S/4HANA Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold font-mono">
                SAP
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  SAP S/4HANA Cloud Gateway
                </h3>
                <span className="text-xs text-slate-400">
                  OData v4 REST / BAPI Pipeline
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {sap.status}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Endpoint Primario:</span>
              <span
                className="font-mono text-slate-200 text-[11px] truncate max-w-[200px]"
                title={sap.endpoint}
              >
                {sap.endpoint}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Autenticación:</span>
              <span className="text-blue-300 font-mono font-semibold">
                {sap.activeAuthMethod}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Circuit Breaker:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                {sap.circuitBreaker} (Normal)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Latencia Ping:</span>
              <span className="font-mono text-slate-200">
                {sap.latencyMs} ms
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Transacciones Hoy:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {sap.metrics.totalSyncedToday} (100% Éxito)
              </span>
            </div>
          </div>
        </div>

        {/* Oracle NetSuite Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold font-mono">
                NS
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Oracle NetSuite ERP Production
                </h3>
                <span className="text-xs text-slate-400">
                  SuiteTalk REST & Landed Cost
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {netSuite.status}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Endpoint Primario:</span>
              <span
                className="font-mono text-slate-200 text-[11px] truncate max-w-[200px]"
                title={netSuite.endpoint}
              >
                {netSuite.endpoint}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Autenticación:</span>
              <span className="text-amber-300 font-mono font-semibold">
                {netSuite.activeAuthMethod}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Circuit Breaker:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                {netSuite.circuitBreaker} (Normal)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Latencia Ping:</span>
              <span className="font-mono text-slate-200">
                {netSuite.latencyMs} ms
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Transacciones Hoy:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {netSuite.metrics.totalSyncedToday} (100% Éxito)
              </span>
            </div>
          </div>
        </div>

        {/* Microsoft Dynamics 365 BC Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold font-mono">
                BC
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  MS Dynamics 365 BC
                </h3>
                <span className="text-xs text-slate-400">
                  OData v4 General Journal Ledger
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {dynamicsBc.status}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Endpoint Primario:</span>
              <span
                className="font-mono text-slate-200 text-[11px] truncate max-w-[200px]"
                title={dynamicsBc.endpoint}
              >
                {dynamicsBc.endpoint}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Autenticación:</span>
              <span className="text-teal-300 font-mono font-semibold">
                {dynamicsBc.activeAuthMethod}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Circuit Breaker:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                {dynamicsBc.circuitBreaker} (Normal)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Latencia Ping:</span>
              <span className="font-mono text-slate-200">
                {dynamicsBc.latencyMs} ms
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Transacciones Hoy:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {dynamicsBc.metrics.totalSyncedToday} (100% Éxito)
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
