/**
 * @file EdgdStudio.tsx
 * @description IATA DGR 65th Edition e-DGD Dangerous Goods Declaration Studio tab.
 * @module @atlas/frontend/components/IataOneRecord/Tab/EdgdStudio
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import {
  ShieldCheck,
  Download,
  Check,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@atlas/ui";
import type { DangerousGoodsItem, EDgdValidationResult } from "@atlas/shared";

export interface EdgdStudioProps {
  dgItem: DangerousGoodsItem;
  setDgItem: (item: DangerousGoodsItem) => void;
  dgdFeedback: string;
  liveDgValidation: EDgdValidationResult;
  onDownloadEdgdPDF: (
    item: DangerousGoodsItem,
    val: EDgdValidationResult,
  ) => void;
}

export const EdgdStudio: React.FC<EdgdStudioProps> = ({
  dgItem,
  setDgItem,
  dgdFeedback,
  liveDgValidation,
  onDownloadEdgdPDF,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Declaration Input Form */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Declaración e-DGD de Mercancías Peligrosas
            </h3>
            <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
              IATA DGR 65th
            </span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  UN Number (IATA DGR)
                </label>
                <input
                  id="inputDgUnNumber"
                  type="text"
                  value={dgItem.unNumber}
                  onChange={(e) =>
                    setDgItem({
                      ...dgItem,
                      unNumber: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Clase de Peligro
                </label>
                <input
                  id="inputDgClass"
                  type="text"
                  value={dgItem.hazardClass}
                  onChange={(e) =>
                    setDgItem({ ...dgItem, hazardClass: e.target.value })
                  }
                  className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Proper Shipping Name
              </label>
              <input
                id="inputDgShippingName"
                type="text"
                value={dgItem.properShippingName}
                onChange={(e) =>
                  setDgItem({
                    ...dgItem,
                    properShippingName: e.target.value,
                  })
                }
                className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Instrucción de Embalaje (PI)
                </label>
                <input
                  id="inputDgPackingInstruction"
                  type="text"
                  value={dgItem.packingInstruction}
                  onChange={(e) =>
                    setDgItem({
                      ...dgItem,
                      packingInstruction: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. PI 954, PI 967"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Restricción de Aeronave
                </label>
                <select
                  id="selectDgAircraftRestriction"
                  value={dgItem.aircraftRestriction}
                  onChange={(e) =>
                    setDgItem({
                      ...dgItem,
                      aircraftRestriction: e.target.value as
                        "PAX_AND_CARGO" | "CARGO_AIRCRAFT_ONLY",
                    })
                  }
                  className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="PAX_AND_CARGO">
                    Passenger & Cargo Aircraft (PAX)
                  </option>
                  <option value="CARGO_AIRCRAFT_ONLY">
                    Cargo Aircraft Only (CAO)
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Cantidad de Bultos
                </label>
                <input
                  id="inputDgPackages"
                  type="number"
                  value={dgItem.packageQuantity}
                  onChange={(e) =>
                    setDgItem({
                      ...dgItem,
                      packageQuantity: Number(e.target.value) || 1,
                    })
                  }
                  className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Peso Neto Total (kg)
                </label>
                <input
                  id="inputDgTotalKg"
                  type="number"
                  value={dgItem.totalNetQuantityKg}
                  onChange={(e) =>
                    setDgItem({
                      ...dgItem,
                      totalNetQuantityKg: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                id="btnExportEdgdPdf"
                onClick={() => onDownloadEdgdPDF(dgItem, liveDgValidation)}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white text-sm flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Certificar y Descargar e-DGD (PDF)
              </Button>
            </div>

            {dgdFeedback && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{dgdFeedback}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Compliance Result */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Veredicto de Cumplimiento IATA DGR
            </h3>
            {liveDgValidation.isCompliant ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4" />
                CONFORME / APTO PARA VUELO
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                <AlertTriangle className="w-4 h-4" />
                RECHAZADO / INFRACCIÓN DGR
              </span>
            )}
          </div>

          {/* Violations Box */}
          {liveDgValidation.violations.length > 0 && (
            <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl space-y-2">
              <h4 className="text-xs font-bold uppercase text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Infracciones Detectadas ({liveDgValidation.violations.length})
              </h4>
              <ul className="text-xs text-red-300 space-y-1 list-disc list-inside">
                {liveDgValidation.violations.map((vio, i) => (
                  <li key={i}>{vio}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Advisories Box */}
          <div className="p-4 bg-blue-950/40 border border-blue-800/50 rounded-xl space-y-2">
            <h4 className="text-xs font-bold uppercase text-blue-400 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-400" />
              Instrucciones de Manipulación y Etiquetado (IATA DGR)
            </h4>
            <ul className="text-xs text-blue-300 space-y-1 list-disc list-inside">
              {liveDgValidation.handlingAdvisories.map((adv, i) => (
                <li key={i}>{adv}</li>
              ))}
            </ul>
          </div>

          {/* Digital Seal */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium block mb-1">
              Sello Criptográfico e-DGD SHA-256
            </span>
            <p className="text-xs font-mono text-cyan-400 break-all">
              {liveDgValidation.validationSealHash}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
