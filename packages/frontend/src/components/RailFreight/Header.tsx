/**
 * @file Header.tsx
 * @description Header, KPI summary cards, and tab bar for the Intermodal Rail Freight & TEN-T Corridors module.
 * @module @atlas/frontend/components/RailFreight
 * @see {@link docs/adr/0020-modular-file-size-guardrails.md}
 */

import React from "react";
import {
  TrainTrack,
  Calculator,
  Navigation,
  Scale,
  Layers,
  ArrowRightLeft,
} from "lucide-react";
import type { RailFreightTab } from "../../types/rail-freight.types";

export interface HeaderProps {
  consignmentsCount: number;
  inTransitCount: number;
  totalGrossMassSum: number;
  totalTeuSum: number;
  trainsCount: number;
  activeTab: RailFreightTab;
  onSelectTab: (tab: RailFreightTab) => void;
  onOpenConsistCalculator: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  consignmentsCount,
  inTransitCount,
  totalGrossMassSum,
  totalTeuSum,
  trainsCount,
  activeTab,
  onSelectTab,
  onOpenConsistCalculator,
}) => {
  return (
    <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <TrainTrack className="w-6 h-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Ferrocarril Intermodal & Corredores TEN-T
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                COTIF / CIM (UIC 992) & TAF-TSI
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Gestión integral de trenes bloque, composición de convoyes TEN-T
            (750m), cálculo de masa frenada, cargas por eje UIC (A-D) e
            interoperabilidad transfronteriza (Ancho Ibérico 1.668 mm / UIC
            1.435 mm).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenConsistCalculator}
            className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            Cálculo de Composición & Frenado
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Expediciones Activas CIM
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {consignmentsCount}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Navigation className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {inTransitCount} convoyes en circulación
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Masa Bruta Transportada
              </p>
              <h3 className="text-2xl font-black text-blue-400 mt-1">
                {totalGrossMassSum.toLocaleString()} t
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {totalTeuSum} UTIs / TEUs asignados
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Trenes Bloque Formados
              </p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">
                {trainsCount}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            100% conformes TEN-T 750m
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Nodos Cambio de Ancho
              </p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">
                Hendaye & Portbou
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            1.668 mm (Ibérico) ⇄ 1.435 mm (UIC)
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-6 border-b border-white/10 pb-2">
        {(
          [
            {
              id: "CONSIGNMENTS",
              label: "Expedientes CIM & Seguimiento Corredores",
            },
            {
              id: "TRAIN_CONSIST",
              label: "Composición de Trenes Bloque & Boletín de Frenado",
            },
            {
              id: "AXLE_AUDIT",
              label: "Auditoría de Cargas por Eje UIC & Gálibo P400",
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeTab === tab.id
                ? "bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-lg shadow-blue-500/10"
                : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};
