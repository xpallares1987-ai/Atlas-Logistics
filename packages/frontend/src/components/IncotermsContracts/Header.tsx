/**
 * @file Header.tsx
 * @description Header hero section, KPI metrics, tab toggle, and simulator launcher.
 * @module @atlas/frontend/components/IncotermsContracts
 */

import {
  FileSignature,
  FileCheck,
  Scale,
  Layers,
  Shield,
  Calculator,
} from "lucide-react";
import { IncotermsTabKey } from "./types/index";

export interface HeaderProps {
  activeTab: IncotermsTabKey;
  onTabChange: (tab: IncotermsTabKey) => void;
  onOpenSimulator: () => void;
  totalContracts: number;
  activeCount: number;
  totalContractValue: number;
  multimodalCount: number;
}

export function Header({
  activeTab,
  onTabChange,
  onOpenSimulator,
  totalContracts,
  activeCount,
  totalContractValue,
  multimodalCount,
}: HeaderProps) {
  return (
    <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.2)]">
              <FileSignature className="w-6 h-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Incoterms® 2020 & Contratación Comercial
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                ICC Official Standard
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Matriz determinista de transferencia de costes y riesgos en 10
            etapas, validación de compatibilidad multimodal y contratos PDF
            certificados.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => onTabChange("CONTRACTS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "CONTRACTS"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Contratos Comerciales
            </button>
            <button
              onClick={() => onTabChange("MATRIX")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "MATRIX"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Matriz 11 Incoterms®
            </button>
          </div>

          <button
            onClick={onOpenSimulator}
            className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-lg shadow-sky-600/25 hover:shadow-sky-600/40 transition-all flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            Matriz & Validador
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Contratos Comerciales
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {totalContracts}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {activeCount} activos bajo Incoterms 2020
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Valor Total Mercancías
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {(totalContractValue / 1000).toFixed(1)} k€
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {totalContractValue.toLocaleString()} € asegurados
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Operaciones Multimodal
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {multimodalCount}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Aéreo, Carretera y Contenedores
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Reglas Oficiales ICC
              </p>
              <h3 className="text-2xl font-black text-white mt-1">11 Reglas</h3>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            7 Multimodal + 4 Marítimas
          </p>
        </div>
      </div>
    </div>
  );
}
