/**
 * @file DraftSurvey.tsx
 * @description 6-point draft survey and hydrostatic displacement calculation tab.
 * @module @atlas/frontend/components/BulkOperations/Tab
 */

import { Scale, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { VesselOperationRecord, DraftSurveyInputs } from "../types/index";

interface DraftSurveyTabProps {
  selectedOp: VesselOperationRecord;
  draftInputs: DraftSurveyInputs;
  setDraftInputs: React.Dispatch<React.SetStateAction<DraftSurveyInputs>>;
  calculations: {
    apparentTrim: number;
    dqm: number;
    c1: number;
    c2: number;
    densityFactor: number;
    correctedDisp: number;
    totalDeductibles: number;
    cargoLoaded: number;
  };
}

export function DraftSurveyTab({
  selectedOp,
  draftInputs,
  setDraftInputs,
  calculations,
}: DraftSurveyTabProps) {
  const updateInput = <K extends keyof DraftSurveyInputs>(
    key: K,
    val: DraftSurveyInputs[K],
  ) => {
    setDraftInputs((prev) => ({ ...prev, [key]: val }));
  };

  const {
    apparentTrim,
    dqm,
    c1,
    c2,
    densityFactor,
    correctedDisp,
    totalDeductibles,
    cargoLoaded,
  } = calculations;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 space-y-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm text-slate-200 flex items-center justify-between">
              <span>
                Lecturas de Calados de 6 Puntos & Parámetros Hidrostáticos
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono">
                Buque: {selectedOp.vesselName} ({selectedOp.vesselType})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            {/* 6 Drafts Inputs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 block text-[11px]">
                  Proa (Forward)
                </span>
                <div>
                  <label className="text-slate-400 block text-[10px]">
                    FP Babor (m):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftInputs.fp}
                    onChange={(e) => updateInput("fp", Number(e.target.value))}
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[10px]">
                    FS Estribor (m):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftInputs.fs}
                    onChange={(e) => updateInput("fs", Number(e.target.value))}
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 block text-[11px]">
                  Centro (Midships)
                </span>
                <div>
                  <label className="text-slate-400 block text-[10px]">
                    MP Babor (m):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftInputs.mp}
                    onChange={(e) => updateInput("mp", Number(e.target.value))}
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[10px]">
                    MS Estribor (m):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftInputs.ms}
                    onChange={(e) => updateInput("ms", Number(e.target.value))}
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 block text-[11px]">
                  Popa (Aft)
                </span>
                <div>
                  <label className="text-slate-400 block text-[10px]">
                    AP Babor (m):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftInputs.ap}
                    onChange={(e) => updateInput("ap", Number(e.target.value))}
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[10px]">
                    AS Estribor (m):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftInputs.asDraft}
                    onChange={(e) =>
                      updateInput("asDraft", Number(e.target.value))
                    }
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Hydrostatic Params */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">
                  Eslora LBP (m):
                </label>
                <input
                  type="number"
                  value={draftInputs.lbp}
                  onChange={(e) => updateInput("lbp", Number(e.target.value))}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">
                  Posición LCF (m):
                </label>
                <input
                  type="number"
                  value={draftInputs.lcf}
                  onChange={(e) => updateInput("lcf", Number(e.target.value))}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">
                  TPC (t/cm):
                </label>
                <input
                  type="number"
                  value={draftInputs.tpc}
                  onChange={(e) => updateInput("tpc", Number(e.target.value))}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">
                  MTC (t·m/cm):
                </label>
                <input
                  type="number"
                  value={draftInputs.mtc}
                  onChange={(e) => updateInput("mtc", Number(e.target.value))}
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">
                  Densidad Agua Medida (t/m³):
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={draftInputs.waterDensity}
                  onChange={(e) =>
                    updateInput("waterDensity", Number(e.target.value))
                  }
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">
                  Desplazamiento Tabla (t):
                </label>
                <input
                  type="number"
                  value={draftInputs.hydroDisp}
                  onChange={(e) =>
                    updateInput("hydroDisp", Number(e.target.value))
                  }
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100"
                />
              </div>
            </div>

            {/* Deductibles */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">
                  Agua de Lastre (t):
                </label>
                <input
                  type="number"
                  value={draftInputs.ballastDed}
                  onChange={(e) =>
                    updateInput("ballastDed", Number(e.target.value))
                  }
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">
                  Combustibles Fuel/Diesel (t):
                </label>
                <input
                  type="number"
                  value={draftInputs.fuelDed}
                  onChange={(e) =>
                    updateInput("fuelDed", Number(e.target.value))
                  }
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">
                  Desp. Neto Inicial Rosca (t):
                </label>
                <input
                  type="number"
                  value={draftInputs.initialNetDisp}
                  onChange={(e) =>
                    updateInput("initialNetDisp", Number(e.target.value))
                  }
                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100"
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
              <Scale className="w-4 h-4 text-amber-400" />
              Resultados del Cálculo de Calados & Masa de Carga
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-xs">
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Asiento Aparente (Trim):</span>
                <span className="font-mono text-slate-200 font-bold">
                  {apparentTrim > 0
                    ? `+${apparentTrim.toFixed(3)} m (Popa)`
                    : `${apparentTrim.toFixed(3)} m`}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">
                  Calado Medio de Medios (DQM):
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {dqm.toFixed(3)} m
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">
                  1ª Corrección de Asiento (C1):
                </span>
                <span className="font-mono text-slate-300">
                  {c1.toFixed(2)} t
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">
                  2ª Corrección de Asiento (C2):
                </span>
                <span className="font-mono text-slate-300">
                  +{c2.toFixed(2)} t
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">
                  Factor de Corrección por Densidad:
                </span>
                <span className="font-mono text-slate-300">
                  {densityFactor.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-slate-300 font-bold">
                  Desplazamiento Corregido:
                </span>
                <span className="font-mono text-slate-100 font-bold">
                  {correctedDisp.toLocaleString("en-US")} t
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">
                  Total Deducibles (Lastre + Consumos):
                </span>
                <span className="font-mono text-rose-400">
                  -{totalDeductibles.toLocaleString("en-US")} t
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="font-bold text-amber-300">
                  TONELAJE NETO DE CARGA EMBARCADA:
                </span>
                <span className="font-bold text-base font-mono text-emerald-400">
                  {cargoLoaded.toLocaleString("en-US")} t
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() =>
                  window.open(
                    `/api/bulk-operations/draft-surveys/draft_survey_final_01/report-pdf`,
                    "_blank",
                  )
                }
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Certificado Draft Survey PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
