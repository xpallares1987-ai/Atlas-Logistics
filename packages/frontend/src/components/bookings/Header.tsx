/**
 * @file Header.tsx
 * @description Header bar for the Ocean Booking & Equipment Control Tower module.
 * @module @atlas/frontend/components/bookings
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Ship, Plus, RefreshCw } from "lucide-react";
import { Button } from "@atlas/ui";

export interface BookingHeaderProps {
  onOpenNewBooking: () => void;
  onRefreshInbox: () => void;
}

export function Header({
  onOpenNewBooking,
  onRefreshInbox,
}: BookingHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Ship className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
              <span>Ocean Booking & Equipment Control Tower</span>
              <span className="text-slate-400 font-normal text-base">
                | Booking & B/L Management
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
                DCSA v2.0 / EDI 301 & 304
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Motor de Reserva Multi-Naviera Autónomo, Bloqueo de Tarifa Spot y
              Despacho de Instrucciones B/L
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          onClick={onOpenNewBooking}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 py-1.5 px-3"
        >
          <Plus className="w-3.5 h-3.5" />
          New Booking
        </Button>
        <Button
          onClick={onRefreshInbox}
          variant="outline"
          className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800 flex items-center gap-1.5 py-1.5 px-3"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar Bandeja
        </Button>
      </div>
    </div>
  );
}
