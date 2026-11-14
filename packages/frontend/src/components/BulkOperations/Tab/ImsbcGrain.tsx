/**
 * @file ImsbcGrain.tsx
 * @description Solid bulk cargo evaluation under the IMSBC Code and IMO Grain Code.
 * @module @atlas/frontend/components/BulkOperations/Tab
 */

import { Flame, Wheat, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { ImsbcGrainInputs } from "../types/index";

interface ImsbcGrainTabProps {
  inputs: ImsbcGrainInputs;
  setInputs: React.Dispatch<React.SetStateAction<ImsbcGrainInputs>>;
  imsbcCalculations: {
    tml: number | undefined;
    isImsbcOk: boolean;
  };
  grainCalculations: {
    grainHm: number;
    grainTheta: number;
    isGrainOk: boolean;
  };
}

export function ImsbcGrainTab({
  inputs,
  setInputs,
  imsbcCalculations,
  grainCalculations,
}: ImsbcGrainTabProps) {
  const updateInput = <K extends keyof ImsbcGrainInputs>(
    key: K,
    val: ImsbcGrainInputs[K],
  ) => {
    setInputs((prev) => ({ ...prev, [key]: val }));
  };

  const { tml, isImsbcOk } = imsbcCalculations;
  const { grainTheta, isGrainOk } = grainCalculations;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* IMSBC Evaluator */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-800">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              Evaluador de Licuefacción IMSBC Code (Grupo A/B/C)
            </CardTitle>
            <Button
              onClick={() =>
                window.open(
                  `/api/bulk-operations/imsbc-declarations/imsbc_dec_01/declaration-pdf`,
                  "_blank",
                )
              }
              className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] flex items-center gap-1 border border-slate-700"
            >
              <Download className="w-3 h-3" />
              Declaración IMSBC PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block text-[11px] mb-1">
                Nombre Carga a Granel (BCSN):
              </label>
              <input
                type="text"
                value={inputs.imsbcCargoName}
                onChange={(e) => updateInput("imsbcCargoName", e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="text-slate-400 block text-[11px] mb-1">
                Grupo IMSBC:
              </label>
              <select
                value={inputs.imsbcGroup}
                onChange={(e) => updateInput("imsbcGroup", e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
              >
                <option value="GROUP_A_LIQUEFACTION">
                  Grupo A (Susceptible de Licuefacción)
                </option>
                <option value="GROUP_B_CHEMICAL_HAZARD">
                  Grupo B (Peligro Químico / MHB)
                </option>
                <option value="GROUP_C_NON_HAZARDOUS">
                  Grupo C (No Peligroso ni Licuable)
                </option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block text-[11px] mb-1">
                Contenido de Humedad Real (%):
              </label>
              <input
                type="number"
                step="0.1"
                value={inputs.imsbcMoisture}
                onChange={(e) =>
                  updateInput("imsbcMoisture", Number(e.target.value))
                }
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block text-[11px] mb-1">
                Punto de Fluidez FMP (%):
              </label>
              <input
                type="number"
                step="0.1"
                value={inputs.imsbcFmp}
                onChange={(e) =>
                  updateInput("imsbcFmp", Number(e.target.value))
                }
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
              />
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isImsbcOk
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-rose-500/10 border-rose-500/30"
            } space-y-2`}
          >
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-bold">
                Límite de Humedad Transportable (TML):
              </span>
              <span className="font-mono text-base font-bold text-amber-400">
                {tml !== undefined ? `${tml}%` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">
                Margen de Seguridad (TML - Humedad):
              </span>
              <span
                className={`font-mono font-bold ${
                  isImsbcOk ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {tml !== undefined
                  ? `${(tml - inputs.imsbcMoisture).toFixed(2)}%`
                  : "N/A"}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800/80">
              <span
                className={`font-bold block ${
                  isImsbcOk ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isImsbcOk
                  ? "✔ CARGAMENTO APTO PARA EMBARQUE"
                  : "❌ RECHAZO MANDATORIO: PROHIBIDO EMBARCAR"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IMO Grain Code Evaluator */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-800">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
              <Wheat className="w-4 h-4 text-amber-400" />
              Estabilidad de Cereales (IMO Grain Code / SOLAS Cap. VI)
            </CardTitle>
            <Button
              onClick={() =>
                window.open(
                  `/api/bulk-operations/grain-stability-plans/grain_plan_01/plan-pdf`,
                  "_blank",
                )
              }
              className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] flex items-center gap-1 border border-slate-700"
            >
              <Download className="w-3 h-3" />
              Plan Grain Code PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block text-[11px] mb-1">
                Tipo de Cereal:
              </label>
              <input
                type="text"
                value={inputs.grainType}
                onChange={(e) => updateInput("grainType", e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="text-slate-400 block text-[11px] mb-1">
                Masa Total de Grano (t):
              </label>
              <input
                type="number"
                value={inputs.grainTonnage}
                onChange={(e) =>
                  updateInput("grainTonnage", Number(e.target.value))
                }
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block text-[11px] mb-1">
                Factor Estiba (m³/t):
              </label>
              <input
                type="number"
                step="0.05"
                value={inputs.grainSf}
                onChange={(e) => updateInput("grainSf", Number(e.target.value))}
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block text-[11px] mb-1">
                Momento Volumétrico (m⁴):
              </label>
              <input
                type="number"
                value={inputs.grainVhm}
                onChange={(e) =>
                  updateInput("grainVhm", Number(e.target.value))
                }
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block text-[11px] mb-1">
                Desplazamiento Salida (t):
              </label>
              <input
                type="number"
                value={inputs.grainDisp}
                onChange={(e) =>
                  updateInput("grainDisp", Number(e.target.value))
                }
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block text-[11px] mb-1">
                GM₀ Inicial (m):
              </label>
              <input
                type="number"
                step="0.05"
                value={inputs.grainGm0}
                onChange={(e) =>
                  updateInput("grainGm0", Number(e.target.value))
                }
                className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
              />
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isGrainOk
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-rose-500/10 border-rose-500/30"
            } space-y-2`}
          >
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-bold">
                Ángulo de Escora Residual (θ):
              </span>
              <span className="font-mono text-base font-bold text-amber-400">
                {grainTheta}° (≤ 12.0°)
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Altura Metacéntrica GM₀:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {inputs.grainGm0.toFixed(2)} m (≥ 0.30 m)
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800/80">
              <span
                className={`font-bold block ${
                  isGrainOk ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isGrainOk
                  ? "✔ ESTABILIDAD APROBADA CONFORME SOLAS CAP. VI"
                  : "❌ ESCORA EXCESIVA / NO CUMPLE GRAIN CODE"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
