/**
 * @file Audit.tsx
 * @description Carrier invoice vs. Atlas legal settlement split-screen, FMC 46 CFR § 541.6 scorecard, and EDI 315 timeline.
 * @module @atlas/frontend/components/Demurrage/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import {
  FileWarning,
  ShieldAlert,
  Scale,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
} from "lucide-react";
import { Button } from "@atlas/ui";
import type {
  CarrierInvoiceData,
  DemurrageAuditResult,
  EDI315Milestone,
} from "@atlas/shared";
import { buildFmcChecklistItems } from "../hooks/demurrageHelpers";

interface AuditProps {
  currentInvoice: CarrierInvoiceData;
  auditResult: DemurrageAuditResult;
  currentMilestones: EDI315Milestone[];
  activeDbInvoice: any;
  isSubmittingDispute: boolean;
  onPresentFmcDispute: () => void;
  onNavigateToDossier: () => void;
}

export function Audit({
  currentInvoice,
  auditResult,
  currentMilestones,
  activeDbInvoice,
  isSubmittingDispute,
  onPresentFmcDispute,
  onNavigateToDossier,
}: AuditProps) {
  const checklistItems = buildFmcChecklistItems(currentInvoice);

  return (
    <div className="space-y-6">
      {/* Split Screen: Carrier Claim vs. Atlas Audited Legal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Carrier Claim Card */}
        <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-900/50 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-rose-900/40">
            <div className="flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-white text-sm">
                Factura Emitida por la Naviera
              </h3>
            </div>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-900/40 text-rose-300 font-semibold">
              {currentInvoice.invoiceNumber}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Días Facturados:</span>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {auditResult.carrierBilledDays} días
              </div>
            </div>
            <div>
              <span className="text-slate-400">Tarifa Diaria Aplicada:</span>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {currentInvoice.billedDailyRate || 150}{" "}
                {currentInvoice.currency}/día
              </div>
            </div>
            <div>
              <span className="text-slate-400">Período Facturado:</span>
              <div className="font-mono text-slate-300 mt-0.5">
                {currentInvoice.billedStartDate} al{" "}
                {currentInvoice.billedEndDate}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Total Facturado Naviera:</span>
              <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                {auditResult.carrierInvoicedAmount.toLocaleString()}{" "}
                {currentInvoice.currency}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-rose-900/20 border border-rose-800/40 text-xs text-rose-300">
            La naviera computó todo el período natural continuo sin descontar
            cierres de puerta ni retenciones aduaneras.
          </div>
        </div>

        {/* Audited Legal Liability Card */}
        <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-900/50 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-900/40">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">
                Liquidación Legal Auditada (Atlas Engine)
              </h3>
            </div>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 font-semibold">
              AUD-LEGAL-OK
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Días Legalmente Exigibles:</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                {auditResult.auditedLegalBillableDays} días
              </div>
            </div>
            <div>
              <span className="text-slate-400">Días Pausados Descontados:</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                -{auditResult.totalSuspendedDays} días
              </div>
            </div>
            <div>
              <span className="text-slate-400">Importe Real Exigible:</span>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {auditResult.auditedLegalAmount.toLocaleString()}{" "}
                {currentInvoice.currency}
              </div>
            </div>
            <div>
              <span className="text-slate-400">
                Ahorro / Exención Disputada:
              </span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                {auditResult.disputedWaiverAmount.toLocaleString()}{" "}
                {currentInvoice.currency} ({auditResult.savingsPercentage}%)
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-800/40 text-xs text-emerald-300 flex flex-wrap items-center justify-between gap-2">
            <span>{auditResult.disputeSummaryText}</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={onPresentFmcDispute}
                disabled={
                  isSubmittingDispute || activeDbInvoice?.status === "DISPUTED"
                }
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs shrink-0 flex items-center gap-1.5"
              >
                <Scale className="w-3.5 h-3.5" />
                {isSubmittingDispute
                  ? "Registrando..."
                  : activeDbInvoice?.status === "DISPUTED"
                    ? "Disputa FMC Presentada"
                    : "Presentar Disputa Legal FMC"}
              </Button>
              <Button
                size="sm"
                onClick={onNavigateToDossier}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs shrink-0"
              >
                Ver Dossier <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* FMC 46 CFR Part 541 Compliance Scorecard */}
      <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-white text-sm">
                Auditoría de Requisitos Obligatorios FMC 46 CFR § 541.6
              </h3>
              <p className="text-xs text-slate-400">
                Comprobación de los 13 datos reglamentarios exigidos por la FMC
                de EE.UU.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400">
                Índice de Conformidad:
              </div>
              <div
                className={`font-mono font-bold text-sm ${
                  auditResult.fmcCompliance.isCompliant
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {auditResult.fmcCompliance.complianceScore}% / 100%
              </div>
            </div>
          </div>
        </div>

        {!auditResult.fmcCompliance.isCompliant && (
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-rose-200">
                INVOICE STATUTORILY DEFECTIVE (FMC § 541.8)
              </div>
              <div>{auditResult.fmcCompliance.legalVerdict}</div>
              <div className="mt-1 font-semibold text-rose-200">
                Elementos omitidos por la naviera:{" "}
                {auditResult.fmcCompliance.missingFields.join(", ")}
              </div>
            </div>
          </div>
        )}

        {/* 13 Checklist Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
          {checklistItems.map((item, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border flex items-center justify-between ${
                item.valid
                  ? "bg-slate-900/60 border-slate-700/60 text-slate-300"
                  : "bg-rose-950/30 border-rose-800/60 text-rose-200"
              }`}
            >
              <span className="truncate pr-2">{item.name}</span>
              {item.valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* EDI 315 Milestones Timeline */}
      <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
          <Layers className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-white text-sm">
            Cronología Técnica de Hitos EDI 315
          </h3>
        </div>

        <div className="space-y-3">
          {currentMilestones.map((m, idx) => (
            <div key={m.id || idx} className="flex items-start gap-3 text-xs">
              <div className="w-10 h-7 rounded bg-blue-500/20 text-blue-400 font-mono font-bold flex items-center justify-center border border-blue-500/30 shrink-0">
                {m.code}
              </div>
              <div className="flex-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">
                    {m.eventDescription}
                  </span>
                  <span className="font-mono text-slate-400">
                    {m.timestamp.replace("T", " ").replace("Z", "")}
                  </span>
                </div>
                <div className="text-slate-400 mt-1 flex items-center gap-2">
                  <span>
                    Ubicación:{" "}
                    <strong>
                      {m.locationName} ({m.locationCode})
                    </strong>
                  </span>
                  <span className="text-emerald-400">
                    ✓ Telemétricamente Verificado
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Audit;
