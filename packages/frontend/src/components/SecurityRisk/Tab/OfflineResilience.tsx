/**
 * @file OfflineResilience.tsx
 * @description Tab 4: IndexedDB Offline Document Queue & Dead-Letter Queue (DLQ) manager.
 * @module @atlas/frontend/components/SecurityRisk/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { motion } from "framer-motion";
import { Wifi, WifiOff, RefreshCw, Trash2, FileText } from "lucide-react";
import { Button } from "@atlas/ui";
import type { OfflineResilienceTabProps } from "../../../types/security-risk.types";

export function OfflineResilience({
  isOnline,
  offlineStats,
  offlineDocs,
  isSyncingQueue,
  onAddSampleOfflineDoc,
  onProcessSyncQueue,
  onClearDeadLetter,
}: OfflineResilienceTabProps) {
  return (
    <motion.div
      key="offline_resilience"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">
            Estado de Conexión
          </span>
          <span
            className={`text-lg font-bold flex items-center gap-2 mt-1 ${
              isOnline ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
            {isOnline ? "En Línea (Conectado)" : "Sin Conexión (Offline)"}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">
            Total en Cola
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            {offlineStats.total}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">
            Pendientes de Sincronización
          </span>
          <span className="text-2xl font-black text-amber-500 mt-1 block">
            {offlineStats.pending}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">
            Dead-Letter Queue (Fallidos)
          </span>
          <span className="text-2xl font-black text-red-500 mt-1 block">
            {offlineStats.deadLetter}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Gestor de Cola de Documentos y Manifiestos Offline
            </h3>
            <p className="text-xs text-slate-500">
              Almacenamiento persistente en IndexedDB con reintentos con backoff
              exponencial y limitación de tasa (rate limiting)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={onAddSampleOfflineDoc}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2 rounded-xl"
            >
              + Encolar Escaneo Offline
            </Button>
            <Button
              onClick={onProcessSyncQueue}
              disabled={isSyncingQueue || offlineStats.total === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded-xl flex items-center gap-1.5"
            >
              <RefreshCw
                size={14}
                className={isSyncingQueue ? "animate-spin" : ""}
              />
              Sincronizar Cola
            </Button>
            {offlineStats.deadLetter > 0 && (
              <Button
                onClick={onClearDeadLetter}
                variant="outline"
                className="text-xs text-red-500 hover:text-red-700 border-red-300 px-3 py-2 rounded-xl flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Limpiar DLQ
              </Button>
            )}
          </div>
        </div>

        {/* Table of Queued Documents */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
              <tr>
                <th className="p-3">ID Local</th>
                <th className="p-3">Envío</th>
                <th className="p-3">Documento</th>
                <th className="p-3">Tamaño</th>
                <th className="p-3">Reintentos</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Comentarios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {offlineDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No hay documentos pendientes en la cola local. Todas las
                    operaciones están sincronizadas con el servidor.
                  </td>
                </tr>
              ) : (
                offlineDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                  >
                    <td className="p-3 font-mono text-[11px] text-slate-900 dark:text-slate-100">
                      {doc.id}
                    </td>
                    <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {doc.shipmentId}
                    </td>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <FileText size={14} className="text-slate-400" />
                      {doc.fileName}
                    </td>
                    <td className="p-3 font-mono">{doc.fileSize}</td>
                    <td className="p-3 font-mono">{doc.retryCount} / 5</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.status === "pending"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                            : doc.status === "dead_letter"
                              ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                        }`}
                      >
                        {doc.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 truncate max-w-xs">{doc.comments}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
