/**
 * @file AuditLog.tsx
 * @description HMAC-SHA256 dispatched webhook audit log tab.
 * @module @atlas/frontend/components/OmnichannelNotifications/Tab/AuditLog
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@atlas/ui";
import type { WebhookAuditLog } from "@atlas/shared";

export interface AuditLogProps {
  logs: WebhookAuditLog[];
  onRefresh: () => void;
}

export const AuditLog: React.FC<AuditLogProps> = ({ logs, onRefresh }) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Bitácora de Auditoría de Webhooks Despachados
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300">
              {logs.length} Registros
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verificación de entrega, código HTTP y firmas criptográficas
            HMAC-SHA256
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          className="border-slate-700 text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar Bitácora
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3">ID Despacho</th>
              <th className="p-3">Tipo de Anomalía</th>
              <th className="p-3">GSID</th>
              <th className="p-3">Destino Webhook</th>
              <th className="p-3">Estatus</th>
              <th className="p-3">Firma HMAC-SHA256</th>
              <th className="p-3">Fecha / Hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-800/30">
                <td className="p-3 font-mono text-slate-400">{log.id}</td>
                <td className="p-3 font-semibold text-slate-200">
                  {log.anomalyType}
                </td>
                <td className="p-3 font-mono text-indigo-400">{log.gsid}</td>
                <td className="p-3 text-slate-400 truncate max-w-[180px]">
                  {log.targetUrl}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.status === "DELIVERED"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : log.status === "SIMULATED"
                          ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {log.status} ({log.httpStatus || 200})
                  </span>
                </td>
                <td className="p-3 font-mono text-slate-500 truncate max-w-[150px]">
                  {log.hmacSignature || "N/A"}
                </td>
                <td className="p-3 text-slate-400 font-mono">
                  {new Date(log.dispatchedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
