/**
 * @file Header.tsx
 * @description Top operational banner and action controls for the 3D Container Stowage & Axle Load Planner.
 * @module @atlas/frontend/components/ContainerPlanner
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { Package, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@atlas/ui";

// ============================================================================
// 1. PROPS INTERFACE
// ============================================================================

export interface HeaderProps {
  hasCargo: boolean;
  isAuditingGemini: boolean;
  isCertifying: boolean;
  onClearCargo: () => void;
  onRecalculate: () => void;
  onRunGeminiAudit: () => void;
  onCertifyStability: () => void;
}

// ============================================================================
// 2. COMPONENT IMPLEMENTATION
// ============================================================================

export const Header: React.FC<HeaderProps> = ({
  hasCargo,
  isAuditingGemini,
  isCertifying,
  onClearCargo,
  onRecalculate,
  onRunGeminiAudit,
  onCertifyStability,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl gap-4">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Package size={22} />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-0.5 rounded-full border border-indigo-500/20">
            Multimodal 3D Bin Packing & Axle Load Engine
          </span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Motor de Estiba 3D & Reparto de Pesos por Eje
        </h1>
        <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
          Optimización heurística 3D de cubicaje para contenedores ISO, furgones
          y megatrailers con cálculo del Centro de Gravedad (CoG), análisis de
          sobrecarga de ejes (Directiva 96/53/CE) y segregación de mercancías
          peligrosas IMDG 7.2.4.
        </p>
      </div>

      {/* Operational Optimizer Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {hasCargo && (
          <Button
            onClick={onClearCargo}
            variant="ghost"
            className="text-xs text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl px-3 py-1.5"
          >
            Vaciar Carga
          </Button>
        )}
        <Button
          onClick={onRecalculate}
          variant="ghost"
          className="text-xs text-indigo-300 hover:text-white border border-indigo-500/30 bg-indigo-500/10 rounded-xl px-3 py-1.5 flex items-center gap-1.5"
        >
          <RefreshCw size={14} />
          Recalcular Heurística
        </Button>
        <Button
          onClick={onRunGeminiAudit}
          disabled={isAuditingGemini}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
        >
          <RefreshCw
            size={14}
            className={isAuditingGemini ? "animate-spin" : ""}
          />
          {isAuditingGemini
            ? "Auditando CTU/IMDG..."
            : "✨ Auditar Seguridad CTU/IMDG (Gemini Flash-Lite)"}
        </Button>
        <Button
          onClick={onCertifyStability}
          disabled={isCertifying}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
        >
          <ShieldCheck size={15} />
          {isCertifying
            ? "Certificando..."
            : "Calcular CoG y Certificar Plan de Carga 3D"}
        </Button>
      </div>
    </div>
  );
};
