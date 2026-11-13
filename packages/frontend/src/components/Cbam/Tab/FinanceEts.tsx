/**
 * @file FinanceEts.tsx
 * @description EU ETS Financial Valuation & Article 9 Foreign Carbon Price Deductions tab.
 * @module @atlas/frontend/components/Cbam/Tab/FinanceEts
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { DollarSign, TrendingDown } from "lucide-react";
import { Input } from "@atlas/ui";
import { CbamLiabilityResult } from "../../../types/cbam.types";

export interface FinanceEtsProps {
  simEmissionsTotal: number;
  setSimEmissionsTotal: (val: number) => void;
  simEtsPrice: number;
  setSimEtsPrice: (val: number) => void;
  simForeignPricePaid: number;
  setSimForeignPricePaid: (val: number) => void;
  liabilityResult: CbamLiabilityResult | null;
  onRunLiabilityCalc: () => void;
}

export const FinanceEts: React.FC<FinanceEtsProps> = ({
  simEmissionsTotal,
  setSimEmissionsTotal,
  simEtsPrice,
  setSimEtsPrice,
  simForeignPricePaid,
  setSimForeignPricePaid,
  liabilityResult,
  onRunLiabilityCalc,
}) => {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Simulator */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-400" />
            Liquidación de Deuda de Certificados CBAM & Deducción Art. 9
          </h3>
          <p className="text-xs text-slate-400">
            Calcula la liquidación neta monetaria tras acreditar precios de
            carbono satisfechos efectivamente en origen.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label
                htmlFor="cbam-sim-emissions"
                className="text-slate-300 block mb-1"
              >
                Total Emisiones Integradas (tCO2e)
              </label>
              <Input
                id="cbam-sim-emissions"
                name="simEmissionsTotal"
                type="number"
                value={simEmissionsTotal}
                onChange={(e) => setSimEmissionsTotal(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="cbam-sim-ets-price"
                  className="text-slate-400 block mb-1"
                >
                  Precio Cotización EU ETS (€/t)
                </label>
                <Input
                  id="cbam-sim-ets-price"
                  name="simEtsPrice"
                  type="number"
                  step="0.1"
                  value={simEtsPrice}
                  onChange={(e) => setSimEtsPrice(Number(e.target.value))}
                />
              </div>
              <div>
                <label
                  htmlFor="cbam-sim-foreign-price"
                  className="text-slate-400 block mb-1"
                >
                  Precio Abonado en Origen (€)
                </label>
                <Input
                  id="cbam-sim-foreign-price"
                  name="simForeignPricePaid"
                  type="number"
                  value={simForeignPricePaid}
                  onChange={(e) =>
                    setSimForeignPricePaid(Number(e.target.value))
                  }
                />
              </div>
            </div>

            <button
              onClick={onRunLiabilityCalc}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
            >
              Estimar Liquidación Neta CBAM
            </button>

            {liabilityResult && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Obligación Bruta EU ETS:
                  </span>
                  <span className="font-bold text-white">
                    {liabilityResult.grossCarbonLiabilityEur?.toLocaleString()}{" "}
                    €
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Deducción Precio en Origen (Art. 9):
                  </span>
                  <span className="font-bold text-teal-400">
                    -
                    {liabilityResult.foreignCarbonPricePaidEur?.toLocaleString()}{" "}
                    €
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/10">
                  <span className="text-slate-300 font-bold">
                    Deuda Neta Liquidable:
                  </span>
                  <span className="font-black text-emerald-400 text-base">
                    {liabilityResult.netCarbonLiabilityEur?.toLocaleString()} €
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 italic pt-1">
                  {liabilityResult.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Regulatory Guidance Box */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <TrendingDown size={18} className="text-teal-400" />
            Marco Legal del Artículo 9 (Reglamento UE 2023/956)
          </h3>
          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              El <strong>Artículo 9</strong> del Reglamento (UE) 2023/956
              establece que el declarante autorizado puede solicitar una
              reducción del número de certificados CBAM a entregar para tener en
              cuenta el <strong>precio del carbono efectivamente pagado</strong>{" "}
              en el país de origen por las emisiones integradas declaradas.
            </p>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
              <span className="font-bold text-emerald-400 block">
                Requisitos de Elegibilidad:
              </span>
              <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                <li>
                  El gravamen debe ser un precio legal de carbono (tasa o
                  derechos ETS en origen).
                </li>
                <li>
                  No debe haberse concedido ninguna devolución o compensación a
                  la exportación en origen.
                </li>
                <li>
                  La prueba debe ser certificada por una entidad auditora
                  independiente.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
