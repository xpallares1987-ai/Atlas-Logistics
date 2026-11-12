/**
 * @file RelationalContext.tsx
 * @description Relational SQLite Booking Selector and DCSA status alert banners.
 * @module @atlas/frontend/components/bookings/Banner
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Database, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@atlas/ui";
import type { OceanBooking } from "@atlas/shared";

export interface RelationalContextProps {
  activeBooking: OceanBooking;
  oceanBookingDetail: any;
  selectedBookingId: string;
  onSelectBookingId: (id: string) => void;
  dbBookings: any[];
  onRefresh: () => void;
  isLoading: boolean;
  siSuccessMsg: string | null;
  draftBlSuccessMsg: string | null;
}

export function RelationalContext({
  activeBooking,
  oceanBookingDetail,
  selectedBookingId,
  onSelectBookingId,
  dbBookings,
  onRefresh,
  isLoading,
  siSuccessMsg,
  draftBlSuccessMsg,
}: RelationalContextProps) {
  return (
    <>
      <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">
                Reserva Relacional Activa (SQLite dev.db)
              </span>
              {oceanBookingDetail ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Detalle DCSA: {oceanBookingDetail.id}
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Sin Detalle DCSA Específico
                </span>
              )}
              {oceanBookingDetail?.siStatus === "CONFIRMED" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  DCSA SI Confirmadas
                </span>
              )}
              {oceanBookingDetail?.draftBlStatus === "ISSUED" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Draft B/L Emitido
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeBooking.bookingNumber} ({activeBooking.originPort} →{" "}
              {activeBooking.destinationPort}) | Buque:{" "}
              {activeBooking.vesselName} | Contrato:{" "}
              {oceanBookingDetail?.serviceContractNumber || "SC-MED-2026-88192"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-medium">
              Reserva:
            </label>
            <select
              value={selectedBookingId}
              onChange={(e) => onSelectBookingId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
            >
              {dbBookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.referenceNumber || b.id} ({b.origin} → {b.destination})
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={onRefresh}
            disabled={isLoading}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            Refrescar DB
          </Button>
        </div>
      </div>

      {siSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{siSuccessMsg}</span>
        </div>
      )}
      {draftBlSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{draftBlSuccessMsg}</span>
        </div>
      )}
    </>
  );
}
