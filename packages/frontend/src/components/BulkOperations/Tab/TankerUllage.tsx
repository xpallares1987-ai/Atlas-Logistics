/**
 * @file TankerUllage.tsx
 * @description Tank ullage and ASTM Table 54B petroleum measurement calculation tab.
 * @module @atlas/frontend/components/BulkOperations/Tab
 */

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Droplets, Download } from "lucide-react";
import { TankerUllageInputs } from "../types/index";

export interface TankerUllageProps {
  ullageInputs: TankerUllageInputs;
  setUllageInputs: React.Dispatch<React.SetStateAction<TankerUllageInputs>>;
  gov: number;
  vcf: number;
  gsv: number;
  massAir: number;
}

export function TankerUllage({
  ullageInputs,
  setUllageInputs,
  gov,
  vcf,
  gsv,
  massAir,
}: TankerUllageProps) {
  const updateInput = <K extends keyof TankerUllageInputs>(
    key: K,
    value: TankerUllageInputs[K],
  ) => {
    setUllageInputs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm text-slate-200 flex items-center justify-between">
              <span>
                Parámetros de Sondeo de Tanques (Tank Ullage & ASTM Table 54)
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 font-mono">
                Buque: MT Atlantic Energy (Decal Huelva)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block text-[11px] mb-1">
                  Producto Líquido:
                </label>
                <input
                  type="text"
                  value={ullageInputs.ullageProduct}
                  onChange={(e) => updateInput("ullageProduct", e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[11px] mb-1">
                  Temperatura Observada (°C):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={ullageInputs.ullageObsTemp}
                  onChange={(e) =>
                    updateInput("ullageObsTemp", Number(e.target.value))
                  }
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[11px] mb-1">
                  Densidad a 15°C (t/m³):
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={ullageInputs.ullageDensity15}
                  onChange={(e) =>
                    updateInput("ullageDensity15", Number(e.target.value))
                  }
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[11px] mb-1">
                  Volumen Observado TOV (m³):
                </label>
                <input
                  type="number"
                  value={ullageInputs.ullageTov}
                  onChange={(e) =>
                    updateInput("ullageTov", Number(e.target.value))
                  }
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[11px] mb-1">
                  Agua Libre Free Water (m³):
                </label>
                <input
                  type="number"
                  value={ullageInputs.ullageFreeWater}
                  onChange={(e) =>
                    updateInput("ullageFreeWater", Number(e.target.value))
                  }
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-5 space-y-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-sky-400" />
              Liquidación de Volumen Estándar & Masa en Aire
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">
                  Volumen Bruto Observado (GOV):
                </span>
                <span className="font-mono text-slate-200 font-bold">
                  {gov.toLocaleString("en-US")} m³
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">
                  Factor VCF (ASTM 54B a {ullageInputs.ullageObsTemp}°C):
                </span>
                <span className="font-mono text-sky-400 font-bold">{vcf}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">
                  Volumen Estándar Neto (NSV a 15°C):
                </span>
                <span className="font-mono text-slate-200 font-bold">
                  {gsv.toLocaleString("en-US")} m³
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="font-bold text-sky-300">
                  MASA COMERCIAL EN AIRE (FACTURACIÓN):
                </span>
                <span className="font-bold text-base font-mono text-emerald-400">
                  {massAir.toLocaleString("en-US")} t
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() =>
                  window.open(
                    `/api/bulk-operations/ullage-surveys/ullage_surv_01/survey-pdf`,
                    "_blank",
                  )
                }
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Informe Ullage ASTM PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
