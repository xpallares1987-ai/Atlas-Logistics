/**
 * @file KanbanSummary.tsx
 * @description 4-column Kanban overview strip for Ocean Booking & Equipment Control Tower.
 * @module @atlas/frontend/components/bookings/Banner
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Clock, CheckCircle2, Ship, ShieldCheck } from "lucide-react";

export interface KanbanSummaryProps {
  dbBookings: any[];
}

export function KanbanSummary({ dbBookings }: KanbanSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Pending
        </h3>
        <div className="text-sm font-semibold text-white mt-1">
          {dbBookings.filter((b) => b.status === "PENDING").length || 1} En
          Asignación
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
        </h3>
        <div className="text-sm font-semibold text-white mt-1">
          {dbBookings.filter((b) => b.status === "CONFIRMED").length + 3}{" "}
          Reservas DCSA
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
          <Ship className="w-3.5 h-3.5" /> In Transit
        </h3>
        <div className="text-sm font-semibold text-white mt-1">
          2 Buques en Navegación
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
        <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> Delivered
        </h3>
        <div className="text-sm font-semibold text-white mt-1">Completadas</div>
      </div>
    </div>
  );
}
