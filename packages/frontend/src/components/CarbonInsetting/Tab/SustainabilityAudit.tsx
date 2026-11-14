/**
 * @file SustainabilityAudit.tsx
 * @description Certified green fuels technical dossier and RED II / MARPOL sustainability catalog.
 * @module @atlas/frontend/components/CarbonInsetting/Tab
 */

import { Award } from "lucide-react";
import { CERTIFIED_FUELS_CATALOG } from "@atlas/shared";

export function SustainabilityAudit() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-400" />
          <span>
            Dossier Técnico de Combustibles Sostenibles & Esquemas de
            Certificación
          </span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Catálogo auditado de combustibles marinos y terrestres conforme a la
          Directiva RED II y el Código ISM / MARPOL Anexo VI.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.values(CERTIFIED_FUELS_CATALOG).map((fuel) => (
          <div
            key={fuel.fuelType}
            className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                  {fuel.certificationScheme}
                </span>
                <h4 className="text-base font-bold text-white mt-1">
                  {fuel.displayName}
                </h4>
              </div>
              <span className="text-emerald-400 font-extrabold text-sm font-mono">
                {fuel.ghgReductionPercentage}% GHG Abatement
              </span>
            </div>

            <p className="text-xs text-slate-300">
              <strong>Materia Prima (Feedstock):</strong> {fuel.feedstock}
            </p>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[9px]">
                  Factor WtW
                </span>
                <span className="font-bold text-slate-200">
                  {fuel.wtwFactorGCO2ePerMJ} g/MJ
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[9px]">
                  Densidad Energía
                </span>
                <span className="font-bold text-slate-200">
                  {fuel.energyDensityMJPerKg} MJ/kg
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[9px]">
                  Línea Fósil
                </span>
                <span className="font-bold text-slate-200">
                  {fuel.baselineFossilWtwFactorGCO2ePerMJ} g/MJ
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
