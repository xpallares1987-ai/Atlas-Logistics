/**
 * @file Header.tsx
 * @description Top header bar for Customs Clearance & TARIC Tariff Engine.
 * @module @atlas/frontend/components/CustomsClearance
 */

import { ShieldCheck, Calculator } from "lucide-react";

interface HeaderProps {
  onOpenCalculator: () => void;
}

export function Header({ onOpenCalculator }: HeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-rose-500" />
          Despacho Aduanero y Motor Arancelario
        </h1>
        <p className="text-slate-400 mt-2 text-sm">
          Gestión determinista de partidas TARIC, cálculo de aranceles/IVA,
          auditoría de cumplimiento y generación oficial de DUA / SAD (PDF y
          XML).
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onOpenCalculator}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 transition-all active:scale-95"
        >
          <Calculator className="w-4 h-4" /> Calculador Arancelario TARIC / Alta
          Despacho
        </button>
      </div>
    </div>
  );
}
