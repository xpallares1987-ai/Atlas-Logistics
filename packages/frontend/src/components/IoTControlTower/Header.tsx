/**
 * @file Header.tsx
 * @description Hero header and 4-card KPI strip for IoT Control Tower module.
 * @module @atlas/frontend/components/IoTControlTower
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { motion } from "framer-motion";
import { Satellite } from "lucide-react";
import type { IoTHeaderProps } from "../../types/iot-control-tower.types";

export function Header({ summary, assetsCount }: IoTHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-cyan-950 to-slate-900 p-8 border border-cyan-500/20 shadow-2xl"
    >
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
              <Satellite size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider text-white">
                TORRE DE CONTROL IoT
              </h1>
              <p className="text-xs font-medium text-cyan-300/80">
                Tracking Satelital AIS · Telemetría Sensores en Vivo · Geocercas
                Activas · Predictor ETA
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl">
            Monitorización continua y en tiempo real de activos multimodales
            (marítimo, aéreo, terrestre y ferroviario) con detección automática
            de anomalías, alertas predictivas y reproductor de ruta histórica.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-400">LIVE</span>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-cyan-500/20">
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Activos Rastreados
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-white">
              {summary?.totalTrackedAssets ?? assetsCount}
            </span>
            <span className="text-xs font-bold text-cyan-400">en tránsito</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Multimodal · AIS/GPS/Rail
          </span>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Alertas Críticas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-extrabold ${summary?.criticalAlertsCount > 0 ? "text-red-400" : "text-emerald-400"}`}
            >
              {summary?.criticalAlertsCount ?? 0}
            </span>
            <span className="text-xs text-amber-400">
              {summary?.warningAlertsCount ?? 0} warn
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Resolución en 1 clic
          </span>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Salud Dispositivos IoT
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-white">
              {summary?.deviceHealthPercentage ?? 100}%
            </span>
            <span className="text-xs text-slate-400">
              {summary?.healthyDevicesCount ?? 0}/{summary?.totalDevices ?? 0}
            </span>
          </div>
          <span className="text-[11px] text-emerald-400/80">
            Batería y señal OK
          </span>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Estado Flota
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-emerald-400">
              {summary?.inTransitCount ?? 0}
            </span>
            <span className="text-xs text-red-400">
              {summary?.criticalAssetsCount ?? 0} críticos
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            En ruta / Incidencias
          </span>
        </div>
      </div>
    </motion.div>
  );
}
