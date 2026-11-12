/**
 * @file Header.tsx
 * @description Top header banner for Demurrage & Detention Control Tower with FMC § 541 badge and active container indicator.
 * @module @atlas/frontend/components/Demurrage
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { Clock, Database } from "lucide-react";
import type { CarrierInvoiceData } from "@atlas/shared";

interface HeaderProps {
  currentInvoice: CarrierInvoiceData;
}

export function Header({ currentInvoice }: HeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              Demurrage & Detention Control Tower
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                FMC § 541 / OSRA 2022
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Motor de Resolución de Disputas D&D, Auditoría de Factura vs.
              Hitos EDI 315 y Suspensión de Reloj Legal
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400 font-medium">
            Contenedor en Foco:
          </span>
          <span className="font-mono font-bold text-white">
            {currentInvoice.containerNumber}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300 text-[11px]">
            {currentInvoice.pod} {currentInvoice.terminalName}
          </span>
        </div>
      </div>
    </div>
  );
}
