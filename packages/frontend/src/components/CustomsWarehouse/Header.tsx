/**
 * @file Header.tsx
 * @description Header, KPI summary cards, and tab navigation bar for the Customs Warehouse module.
 * @module @atlas/frontend/components/CustomsWarehouse
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { Building2, Download, Scale, Landmark, Boxes } from "lucide-react";
import { formatCurrencyEs } from "./hooks/useCustomsWarehouse";
import type { CustomsWarehouseTab } from "../../types/customs-warehouse.types";

// ============================================================================
// 1. PROPS INTERFACE
// ============================================================================

export interface HeaderProps {
  activeTab: CustomsWarehouseTab;
  onSelectTab: (tab: CustomsWarehouseTab) => void;
  lotsCount: number;
  totalPackagesSum: number;
  totalSuspendedDebtSum: number;
  totalAvailableCreditSum: number;
  guaranteesCount: number;
  facilitiesCount: number;
}

// ============================================================================
// 2. COMPONENT
// ============================================================================

export function Header({
  activeTab,
  onSelectTab,
  lotsCount,
  totalPackagesSum,
  totalSuspendedDebtSum,
  totalAvailableCreditSum,
  guaranteesCount,
  facilitiesCount,
}: HeaderProps) {
  return (
    <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Depósito Aduanero, Zona Franca & Regímenes Especiales
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                CAU (Arts. 210–242) & AEAT
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Gestión de Depósito Aduanero (DA 7100), Depósito Distinto del
            Aduanero (DDA 7600), Depósito Temporal (ADT 90 días), Libro Oficial
            de Existencias AEAT y Avales Globales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/customs-warehouse/stock-certificate-pdf"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-600/25 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Certificado Oficial de Existencias (PDF)
          </a>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Partidas Vinculadas
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {lotsCount} Lotes
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {totalPackagesSum} bultos bajo custodia
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Deuda Aduanera Suspendida
              </p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">
                {formatCurrencyEs(totalSuspendedDebtSum)} €
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Arancel + IVA diferido sin devengo
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Aval Global Disponible (AEAT)
              </p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">
                {formatCurrencyEs(totalAvailableCreditSum)} €
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {guaranteesCount} avales bancarios activos
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Instalaciones Autorizadas
              </p>
              <h3 className="text-2xl font-black text-blue-400 mt-1">
                {facilitiesCount} Recintos
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            DA, DDA, ADT & Zona Franca
          </p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 mt-6 border-b border-white/10 pb-2">
        {(
          [
            {
              id: "LOTS_LEDGER",
              label: "Libro Oficial de Existencias & Lotes Aduaneros",
            },
            {
              id: "GUARANTEES_TAX",
              label: "Gestión de Avales & Liquidación Fiscal (4071 vs 3171)",
            },
            {
              id: "FACILITIES_HANDLING",
              label: "Instalaciones & Manipulaciones Usuales (Art. 220 CAU)",
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeTab === tab.id
                ? "bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-lg shadow-amber-500/10"
                : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
