/**
 * @file Calculator.tsx
 * @description Specific Embedded Emissions (SE) calculator, CBAM regulated goods catalog, and verified installations tab.
 * @module @atlas/frontend/components/Cbam/Tab/Calculator
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { Factory, Scale, Globe2 } from "lucide-react";
import { Input } from "@atlas/ui";
import {
  CbamCatalogItem,
  CbamEmissionsResult,
  CbamInstallation,
} from "../../../types/cbam.types";

export interface CalculatorProps {
  calcNetWeight: number;
  setCalcNetWeight: (val: number) => void;
  calcDirectFactor: number;
  setCalcDirectFactor: (val: number) => void;
  calcIndirectFactor: number;
  setCalcIndirectFactor: (val: number) => void;
  calcEuDefaultDirect: number;
  setCalcEuDefaultDirect: (val: number) => void;
  calcEuDefaultIndirect: number;
  setCalcEuDefaultIndirect: (val: number) => void;
  emissionsResult: CbamEmissionsResult | null;
  onRunEmissionsCalc: () => void;
  catalog: CbamCatalogItem[];
  installations: CbamInstallation[];
}

export const Calculator: React.FC<CalculatorProps> = ({
  calcNetWeight,
  setCalcNetWeight,
  calcDirectFactor,
  setCalcDirectFactor,
  calcIndirectFactor,
  setCalcIndirectFactor,
  calcEuDefaultDirect,
  setCalcEuDefaultDirect,
  calcEuDefaultIndirect,
  setCalcEuDefaultIndirect,
  emissionsResult,
  onRunEmissionsCalc,
  catalog,
  installations,
}) => {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulator 1: Direct & Indirect Emissions */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Factory size={18} className="text-emerald-400" />
            Cálculo de Emisiones Específicas Integradas (SE)
          </h3>
          <p className="text-xs text-slate-400">
            Calcula las emisiones específicas directas (Alcance 1) e indirectas
            (Alcance 2) para cualquier lote de importación.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label
                htmlFor="cbam-calc-net-weight"
                className="text-slate-300 block mb-1"
              >
                Masa Neta Importada (t)
              </label>
              <Input
                id="cbam-calc-net-weight"
                name="calcNetWeight"
                type="number"
                value={calcNetWeight}
                onChange={(e) => setCalcNetWeight(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="cbam-calc-direct-factor"
                  className="text-slate-400 block mb-1"
                >
                  Factor Directo (tCO2e/t)
                </label>
                <Input
                  id="cbam-calc-direct-factor"
                  name="calcDirectFactor"
                  type="number"
                  step="0.01"
                  value={calcDirectFactor}
                  onChange={(e) => setCalcDirectFactor(Number(e.target.value))}
                />
              </div>
              <div>
                <label
                  htmlFor="cbam-calc-indirect-factor"
                  className="text-slate-400 block mb-1"
                >
                  Factor Indirecto (tCO2e/t)
                </label>
                <Input
                  id="cbam-calc-indirect-factor"
                  name="calcIndirectFactor"
                  type="number"
                  step="0.01"
                  value={calcIndirectFactor}
                  onChange={(e) =>
                    setCalcIndirectFactor(Number(e.target.value))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="cbam-calc-default-direct"
                  className="text-slate-400 block mb-1"
                >
                  Default Directo UE
                </label>
                <Input
                  id="cbam-calc-default-direct"
                  name="calcEuDefaultDirect"
                  type="number"
                  step="0.01"
                  value={calcEuDefaultDirect}
                  onChange={(e) =>
                    setCalcEuDefaultDirect(Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="cbam-calc-default-indirect"
                  className="text-slate-400 block mb-1"
                >
                  Default Indirecto UE
                </label>
                <Input
                  id="cbam-calc-default-indirect"
                  name="calcEuDefaultIndirect"
                  type="number"
                  step="0.01"
                  value={calcEuDefaultIndirect}
                  onChange={(e) =>
                    setCalcEuDefaultIndirect(Number(e.target.value))
                  }
                />
              </div>
            </div>

            <button
              onClick={onRunEmissionsCalc}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
            >
              Calcular Emisiones Integradas
            </button>

            {emissionsResult && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Total Emisiones Integradas:
                  </span>
                  <span className="font-black text-emerald-400 text-sm">
                    {emissionsResult.totalEmbeddedEmissionsTco2e} tCO2e
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Factor Específico Total:
                  </span>
                  <span className="font-bold text-white">
                    {emissionsResult.totalSpecificFactor} tCO2e / t
                  </span>
                </div>
                {emissionsResult.comparisonWithEuDefaults && (
                  <div className="pt-1 border-t border-white/10 space-y-1">
                    <div className="flex justify-between text-emerald-400">
                      <span>Ahorro vs. Valores por Defecto UE:</span>
                      <span className="font-black">
                        {
                          emissionsResult.comparisonWithEuDefaults
                            .percentageSavingsVsDefault
                        }
                        % (
                        {Math.abs(
                          emissionsResult.comparisonWithEuDefaults.deltaTco2e,
                        )}{" "}
                        tCO2e)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Catalog Reference Box */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Scale size={18} className="text-teal-400" />
            Catálogo de Bienes Regulados CBAM
          </h3>
          <p className="text-xs text-slate-400">
            Factores por defecto de la Comisión Europea para los 6 sectores bajo
            el Reglamento (UE) 2023/956.
          </p>

          <div className="space-y-2 overflow-y-auto max-h-[300px] text-xs pr-1">
            {catalog.map((cat) => (
              <div
                key={cat.id}
                className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-white">{cat.cnCode}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    {cat.sector}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] truncate">
                  {cat.description}
                </p>
                <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>Directo: {cat.defaultDirectEmissionFactor} t/t</span>
                  <span>
                    Indirecto: {cat.defaultIndirectEmissionFactor} t/t
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verified Installations Reference Box */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Globe2 size={18} className="text-blue-400" />
            Instalaciones Productoras Verificadas
          </h3>
          <p className="text-xs text-slate-400">
            Plantas industriales con certificación de emisiones auditada por
            verificadores acreditados en la UE.
          </p>

          <div className="space-y-2 overflow-y-auto max-h-[300px] text-xs pr-1">
            {installations.map((inst) => (
              <div
                key={inst.id}
                className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white truncate max-w-[180px]">
                    {inst.installationName}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                    {inst.countryCode}
                  </span>
                </div>
                <p className="text-slate-400 text-[10px]">
                  {inst.operatorName}
                </p>
                <p className="text-[10px] text-teal-400 truncate">
                  Verificador: {inst.verifierName}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
