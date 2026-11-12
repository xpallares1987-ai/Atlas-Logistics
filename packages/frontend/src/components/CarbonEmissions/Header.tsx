/**
 * @file Header.tsx
 * @description Hero header and 4-card Scope 3 KPI summary strip for Carbon Emissions module.
 * @module @atlas/frontend/components/CarbonEmissions
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { motion } from "framer-motion";
import { Leaf, Calculator } from "lucide-react";
import { Button } from "@atlas/ui";
import type { CarbonHeaderProps } from "../../types/carbon-emissions.types";
import { toFixed } from "./hooks/useCarbonEmissions";

export function Header({ summary, onOpenCalculator }: CarbonHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-linear-to-r from-emerald-950 via-teal-900 to-slate-900 p-8 border border-emerald-500/20 shadow-2xl"
    >
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <Leaf size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider text-white">
                CALCULADORA DE HUELLA DE CARBONO SCOPE 3
              </h1>
              <p className="text-xs font-medium text-emerald-300/80">
                Estándar Internacional ISO 14083 & GLEC Framework v3 —
                Descarbonización Multimodal
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl">
            Audita y cuantifica las emisiones de gases de efecto invernadero
            (GEI) de puerta a puerta separando Well-to-Wheel (WTW),
            Tank-to-Wheel (TTW) y Well-to-Tank (WTT), compensa tu impacto con
            proyectos verificados y emite certificados oficiales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={onOpenCalculator}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-2"
          >
            <Calculator size={16} />
            Calcular Corredor Verde
          </Button>
        </div>
      </div>

      {/* Top KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-emerald-500/20">
        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Emisiones Totales (WTW)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-white">
              {toFixed(summary?.totalTco2eWtw, 2)}
            </span>
            <span className="text-xs font-bold text-emerald-400">tCO2e</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Ciclo de vida completo
          </span>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Compensación Realizada
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-emerald-400">
              {summary?.offsetPercentage || "0.0"}%
            </span>
            <span className="text-xs text-slate-400">
              ({toFixed(summary?.totalTco2eOffset, 2)} t)
            </span>
          </div>
          <span className="text-[11px] text-emerald-400/80">
            Proyectos Gold Standard / VCS
          </span>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Intensidad Media de Carbono
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-white">
              {toFixed(summary?.avgCarbonIntensity, 1)}
            </span>
            <span className="text-xs text-slate-400">gCO2e / t-km</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Ponderado ISO 14083
          </span>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Certificados Emitidos
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-white">
              {summary?.issuedCertificatesCount || 0}
            </span>
            <span className="text-xs font-bold text-teal-400">Oficiales</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Descargables con QR de validación
          </span>
        </div>
      </div>
    </motion.div>
  );
}
