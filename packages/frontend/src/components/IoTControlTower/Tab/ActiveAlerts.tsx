/**
 * @file ActiveAlerts.tsx
 * @description Active IoT telemetry alerts matrix and 1-click resolution tab.
 * @module @atlas/frontend/components/IoTControlTower/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button } from "@atlas/ui";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ActiveAlertsTabProps } from "../../../types/iot-control-tower.types";
import { getSeverityColor } from "../hooks/useIoTControlTower";

export function ActiveAlerts({
  selectedAsset,
  assetDetail,
  activeAlertsCount,
  onResolveAlert,
}: ActiveAlertsTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          Matriz de Alertas — {selectedAsset?.name ?? "Selecciona activo"}
        </h3>
        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
          {activeAlertsCount} alertas activas
        </span>
      </div>

      <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
        <AnimatePresence>
          {assetDetail?.alerts?.length > 0 ? (
            assetDetail.alerts.map((alert: any) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={`p-4 rounded-xl border ${getSeverityColor(alert.severity)} ${alert.status === "RESOLVED" ? "opacity-40" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${getSeverityColor(alert.severity)}`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold">
                        {alert.alertType.replace("_", " ")}
                      </span>
                      <span className="text-[9px] text-slate-500 ml-auto">
                        {new Date(alert.createdAt).toLocaleTimeString("es-ES")}
                      </span>
                    </div>
                    <p className="text-xs text-white font-medium leading-snug">
                      {alert.message}
                    </p>
                    {alert.metricValue && (
                      <div className="flex gap-3 mt-2 text-[10px] text-slate-400">
                        <span>
                          Valor:{" "}
                          <strong className="text-white">
                            {alert.metricValue}
                          </strong>
                        </span>
                        <span>
                          Umbral:{" "}
                          <strong className="text-white">
                            {alert.thresholdValue}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                  {alert.status === "ACTIVE" ? (
                    <Button
                      onClick={() => onResolveAlert(alert.id)}
                      className="bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-3 py-1.5 flex items-center gap-1 shrink-0"
                    >
                      <CheckCircle2 size={12} /> Resolver
                    </Button>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Resuelto
                    </span>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 size={40} className="text-emerald-500/40 mb-3" />
              <h4 className="text-sm font-bold text-slate-300">
                Sin alertas activas
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Todos los sensores dentro de parámetros normales
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
export default ActiveAlerts;
