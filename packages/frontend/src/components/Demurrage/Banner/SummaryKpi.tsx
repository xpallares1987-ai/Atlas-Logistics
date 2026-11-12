/**
 * @file SummaryKpi.tsx
 * @description 4-card global Demurrage & Detention financial exposure and FMC compliance KPI strip.
 * @module @atlas/frontend/components/Demurrage/Banner
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import {
  Building2,
  PauseCircle,
  DollarSign,
  Scale,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { CarrierInvoiceData, DemurrageAuditResult } from "@atlas/shared";

interface SummaryKpiProps {
  auditResult: DemurrageAuditResult;
  currentInvoice: CarrierInvoiceData;
}

export function SummaryKpi({ auditResult, currentInvoice }: SummaryKpiProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Contenedor Auditado</span>
          <Building2 className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-xl font-bold text-white font-mono">
          {auditResult.containerNumber}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {auditResult.carrierName} ({currentInvoice.carrierScac})
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Días Pausados (Reloj Suspendido)</span>
          <PauseCircle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-xl font-bold text-amber-400 font-mono">
          {auditResult.totalSuspendedDays} días
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {auditResult.suspensionsApplied.length} evento(s) justificados
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Importe Reclamado / Exención</span>
          <DollarSign className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-xl font-bold text-emerald-400 font-mono">
          {auditResult.disputedWaiverAmount.toLocaleString()}{" "}
          {auditResult.currency}
        </div>
        <div className="text-xs text-emerald-400/80 mt-1 font-medium">
          {auditResult.savingsPercentage}% ahorro sobre factura
        </div>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span>Veredicto de Auditoría</span>
          <Scale className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-sm font-bold text-white">
          {auditResult.auditStatus === "FULL_WAIVER_JUSTIFIED" ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> 100% Exención Justificada
            </span>
          ) : (
            <span className="text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Reducción Parcial
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400 mt-1 truncate">
          {auditResult.fmcCompliance.isCompliant
            ? "FMC Conforme"
            : "FMC Defectuosa (§ 541)"}
        </div>
      </div>
    </div>
  );
}
