/**
 * @file KpiStrip.tsx
 * @description 4-card operational KPI summary strip for active Ocean Booking.
 * @module @atlas/frontend/components/bookings/Banner
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import {
  Ship,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  QrCode,
} from "lucide-react";
import type { OceanBooking, validateCutOffDeadlines } from "@atlas/shared";

export interface KpiStripProps {
  activeBooking: OceanBooking;
  countdownSeconds: number;
  formatCountdown: (seconds: number) => string;
  cutOffEval: ReturnType<typeof validateCutOffDeadlines> | null;
}

export function KpiStrip({
  activeBooking,
  countdownSeconds,
  formatCountdown,
  cutOffEval,
}: KpiStripProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Reserva Seleccionada</span>
          <Ship className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-lg font-bold text-white font-mono truncate">
          {activeBooking.bookingNumber || activeBooking.referenceNumber}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {activeBooking.rateLock.carrierName} ({activeBooking.carrierScac})
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Tarifa Spot Bloqueada</span>
          <DollarSign className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-lg font-bold text-emerald-400 font-mono">
          ${activeBooking.rateLock.totalSpotUsd.toLocaleString()} USD
        </div>
        <div className="text-xs text-emerald-400/80 mt-1 font-medium flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Bloqueada: {formatCountdown(countdownSeconds)}
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Estado de Plazos (Cut-Offs)</span>
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
          {cutOffEval?.overallStatus === "SAFE" ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Plazos en Tiempo
            </span>
          ) : cutOffEval?.overallStatus === "URGENT" ? (
            <span className="text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Próximo Vencimiento
            </span>
          ) : (
            <span className="text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Cut-off Vencido
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400 mt-1 font-mono">
          SI Cut-off: {cutOffEval?.siHoursRemaining ?? 24}h restantes
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Liberación de Equipo</span>
          <QrCode className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-sm font-bold text-white mt-0.5">
          {activeBooking.equipmentRelease ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Pase Depósito Emitido
            </span>
          ) : (
            <span className="text-amber-400 flex items-center gap-1">
              <Clock className="w-4 h-4" /> Pendiente de Asignación
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400 mt-1 truncate">
          PIN: {activeBooking.equipmentRelease?.pickupPin || "Sin PIN"}
        </div>
      </div>
    </div>
  );
}
