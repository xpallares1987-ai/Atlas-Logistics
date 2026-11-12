/**
 * @file GeminiAudit.tsx
 * @description Structured Gemini Flash-Lite CTU Code & IMDG segregation safety verdict banner.
 * @module @atlas/frontend/components/ContainerPlanner/Banner
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { ShieldCheck } from "lucide-react";
import { GeminiStowageAuditResponse } from "../../../types/container-planner.types";

// ============================================================================
// 1. PROPS INTERFACE
// ============================================================================

export interface GeminiAuditProps {
  auditResult: GeminiStowageAuditResponse | null;
  onDismiss: () => void;
}

// ============================================================================
// 2. COMPONENT IMPLEMENTATION
// ============================================================================

export const GeminiAudit: React.FC<GeminiAuditProps> = ({
  auditResult,
  onDismiss,
}) => {
  if (!auditResult) return null;

  return (
    <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-4 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-400" />
          <span className="font-bold text-white">
            Dictamen Estructurado CTU Code & Segregación IMDG (Gemini Free Tier)
          </span>
          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 font-mono text-[10px]">
            {auditResult.source} · {auditResult.model}
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
            Safety Score: {auditResult.audit.safetyScore}/100
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300">
          <span>{auditResult.latencyMs}ms</span>
          <span>RPM Libre: {auditResult.quotaRemainingRpm}/15</span>
          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-white underline font-sans"
          >
            Cerrar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5">
          <div className="text-slate-400 font-semibold mb-0.5">
            Compatibilidad IMDG:
          </div>
          <div className="text-emerald-300">
            {auditResult.audit.imdgCompatibilityStatus}
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5">
          <div className="text-slate-400 font-semibold mb-0.5">
            Centro de Gravedad (CTU Anexo 7):
          </div>
          <div className="text-indigo-200">
            {auditResult.audit.centerOfGravityStatus}
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-2.5">
          <div className="text-slate-400 font-semibold mb-0.5">
            Balance de Ejes (EU 96/53/EC):
          </div>
          <div className="text-cyan-200">
            {auditResult.audit.axleBalanceAssessment}
          </div>
        </div>
      </div>

      <div className="space-y-1 text-[11px] text-slate-300">
        <span className="font-semibold text-indigo-300">
          Recomendaciones Técnicas de Trincaje:
        </span>
        <ul className="list-disc list-inside space-y-0.5">
          {auditResult.audit.recommendations.map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
