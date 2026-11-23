/**
 * @file Queue.tsx
 * @description Offline mutation queue and background sync manager for Dexie/IndexedDB transactions.
 * @module @atlas/frontend/components/ErpIntegrations/Tab/Queue
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { motion } from "framer-motion";
import { Database, RefreshCw, Send } from "lucide-react";
import { Button } from "@atlas/ui";
import type { ErpQueuedMutation } from "@atlas/shared";

export interface QueueProps {
  queueItems: ErpQueuedMutation[];
  onEnqueueManual: () => void;
  onFlushQueue: () => void;
  isFlushing: boolean;
}

export const Queue: React.FC<QueueProps> = ({
  queueItems,
  onEnqueueManual,
  onFlushQueue,
  isFlushing,
}) => {
  return (
    <motion.div
      key="queue"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            Bandeja de Mutaciones Offline (Dexie.js / IndexedDB)
          </h3>
          <p className="text-xs text-slate-400">
            Almacenamiento local desacoplado de transacciones pendientes con
            drenaje garantizado al restaurar red
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={onEnqueueManual}
            size="sm"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
          >
            + Encolar Transacción Manual
          </Button>
          <Button
            onClick={onFlushQueue}
            disabled={isFlushing || queueItems.length === 0}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1.5"
          >
            {isFlushing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Drenar Cola hacia el Servidor
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {queueItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No hay transacciones pendientes en la cola local IndexedDB.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                <th className="p-3">ID Mutación</th>
                <th className="p-3">Sistema ERP</th>
                <th className="p-3">Operación</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Reintentos</th>
                <th className="p-3">Idempotency Key</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {queueItems.map((q) => (
                <tr key={q.id}>
                  <td className="p-3 text-slate-300">{q.id}</td>
                  <td className="p-3 text-blue-300 font-bold">{q.erpSystem}</td>
                  <td className="p-3 text-slate-200">{q.operation}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                      {q.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{q.retryCount}</td>
                  <td className="p-3 text-[10px] text-slate-500">
                    {q.idempotencyKey}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
};
