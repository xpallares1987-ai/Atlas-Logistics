/**
 * @file Header.tsx
 * @description Header banner, high-level Scope 3 decarbonization KPIs, and tab navigation.
 * @module @atlas/frontend/components/CarbonInsetting
 */

import { Leaf, Award, Ship, Sparkles, Flame, Coins } from "lucide-react";
import { Button } from "@atlas/ui";
import { FuelEuPoolResult, SEED_FUELEU_POOL_VESSELS } from "@atlas/shared";
import { InsettingTabKey } from "./types/index";

export interface HeaderProps {
  activeTab: InsettingTabKey;
  onTabChange: (tab: InsettingTabKey) => void;
  tokensCount: number;
  totalAvoidedCO2e: number;
  totalFuelVolumeMT: number;
  poolResult: FuelEuPoolResult;
}

export function Header({
  activeTab,
  onTabChange,
  tokensCount,
  totalAvoidedCO2e,
  totalFuelVolumeMT,
  poolResult,
}: HeaderProps) {
  return (
    <>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-widest">
            <Leaf className="w-4 h-4 animate-pulse" />
            <span>Digital Twin Registry · Scope 3 Decarbonization</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
            <span>Supply Chain Digital Twin & Scope 3 Carbon Insetting</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tokenized Book-and-Claim Ledger · ISO 14083 / GLEC v3.0 · FuelEU
            Maritime Compliance Pooling (Reg EU 2023/1805)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => onTabChange("ALLOCATION_STUDIO")}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-900/30"
          >
            <Coins className="w-4 h-4" />
            <span>Asignar Insetting & Emitir Token</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Emisiones Scope 3 Evitadas</span>
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">
              {totalAvoidedCO2e}
            </span>
            <span className="text-xs text-slate-400">tCO2e abated</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Certificado ISO 14083 / GLEC v3.0
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Combustible Verde Asignado</span>
            <Flame className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-cyan-400">
              {totalFuelVolumeMT}
            </span>
            <span className="text-xs text-slate-400">toneladas métricas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            B100, e-Metanol, Bio-LNG (ISCC EU)
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Balance Pool FuelEU Maritime</span>
            <Ship className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-300">
              +{poolResult.netPoolBalanceGCO2e.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">gCO2e</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-2">
            Superávit flota:{" "}
            {poolResult.isCompliant ? "100% CUMPLE EU 2023/1805" : "DÉFICIT"}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Penalizaciones Evitadas (Pool)</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400">
              €{poolResult.totalPenaltyAvoidedEur.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">ahorro multas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Ahorro frente a multas de €2.400/t VLSFO
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => onTabChange("TOKENS_LEDGER")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "TOKENS_LEDGER"
              ? "bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Ledger Tokenizado Book-and-Claim</span>
          <span className="bg-emerald-900/60 text-emerald-300 text-xs px-1.5 py-0.5 rounded-full font-mono">
            {tokensCount}
          </span>
        </button>

        <button
          onClick={() => onTabChange("ALLOCATION_STUDIO")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "ALLOCATION_STUDIO"
              ? "bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Asignación & Mass Balance Studio</span>
        </button>

        <button
          onClick={() => onTabChange("FUELEU_POOLING")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "FUELEU_POOLING"
              ? "bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Ship className="w-4 h-4" />
          <span>Motor de Pooling FuelEU Maritime</span>
          <span className="bg-cyan-900/60 text-cyan-300 text-xs px-1.5 py-0.5 rounded-full font-mono">
            {SEED_FUELEU_POOL_VESSELS.length} buques
          </span>
        </button>

        <button
          onClick={() => onTabChange("SUSTAINABILITY_AUDIT")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "SUSTAINABILITY_AUDIT"
              ? "bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Dossier de Sostenibilidad & ISCC</span>
        </button>
      </div>
    </>
  );
}
