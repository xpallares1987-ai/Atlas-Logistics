/**
 * @file FeeSimulator.tsx
 * @description Bank Fee & Financial Cost Simulator tab for Documentary Credits.
 * @module @atlas/frontend/components/TradeFinance/Tab/FeeSimulator
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { Calculator, Coins } from "lucide-react";
import { Input } from "@atlas/ui";
import { BankFeeCalculationResult } from "../../../types/trade-finance.types";

export interface FeeSimulatorProps {
  simAmount: number;
  setSimAmount: (val: number) => void;
  simCurrency: string;
  setSimCurrency: (val: string) => void;
  simTenorDays: number;
  setSimTenorDays: (val: number) => void;
  simOpeningRate: number;
  setSimOpeningRate: (val: number) => void;
  simConfirmRate: number;
  setSimConfirmRate: (val: number) => void;
  simDiscrepancyCount: number;
  setSimDiscrepancyCount: (val: number) => void;
  simAmendmentCount: number;
  setSimAmendmentCount: (val: number) => void;
  feeSimResult: BankFeeCalculationResult | null;
  onRunFeeSim: () => void;
}

export const FeeSimulator: React.FC<FeeSimulatorProps> = ({
  simAmount,
  setSimAmount,
  simCurrency,
  setSimCurrency,
  simTenorDays,
  setSimTenorDays,
  simOpeningRate,
  setSimOpeningRate,
  simConfirmRate,
  setSimConfirmRate,
  simDiscrepancyCount,
  setSimDiscrepancyCount,
  simAmendmentCount,
  setSimAmendmentCount,
  feeSimResult,
  onRunFeeSim,
}) => {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulator Inputs */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Calculator size={18} className="text-emerald-400" />
            Calculadora de Comisiones Bancarias
          </h3>
          <p className="text-xs text-slate-400">
            Calcula costes de apertura trimestral, diferencial de confirmación y
            recargos por discrepancias.
          </p>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">
                  Importe Crédito
                </label>
                <Input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Divisa</label>
                <select
                  value={simCurrency}
                  onChange={(e) => setSimCurrency(e.target.value)}
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CNY">CNY (¥)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">
                  Plazo Tenor (Días)
                </label>
                <Input
                  type="number"
                  value={simTenorDays}
                  onChange={(e) => setSimTenorDays(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Apertura (% Trimestral)
                </label>
                <Input
                  type="number"
                  step="0.05"
                  value={simOpeningRate}
                  onChange={(e) => setSimOpeningRate(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">
                  Confirmación (% Anual)
                </label>
                <Input
                  type="number"
                  step="0.05"
                  value={simConfirmRate}
                  onChange={(e) => setSimConfirmRate(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">
                  Nº Enmiendas (MT707)
                </label>
                <Input
                  type="number"
                  value={simAmendmentCount}
                  onChange={(e) => setSimAmendmentCount(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">
                Nº Discrepancias UCP 600
              </label>
              <Input
                type="number"
                value={simDiscrepancyCount}
                onChange={(e) => setSimDiscrepancyCount(Number(e.target.value))}
              />
            </div>

            <button
              onClick={onRunFeeSim}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
            >
              Calcular Comisiones Bancarias
            </button>
          </div>
        </div>

        {/* Simulator Output */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4 lg:col-span-2">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Coins size={18} className="text-emerald-400" />
            Desglose Liquidativo de Costes Bancarios
          </h3>

          {feeSimResult ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                  <span className="text-slate-400 block">
                    Comisión de Apertura
                  </span>
                  <p className="text-xl font-black text-white mt-1">
                    {feeSimResult.calculatedOpeningFeeEur.toLocaleString(
                      "es-ES",
                      { minimumFractionDigits: 2 },
                    )}{" "}
                    €
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {feeSimResult.quarterPeriods} trimestre(s) @{" "}
                    {feeSimResult.openingFeeRatePct}%
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                  <span className="text-slate-400 block">
                    Comisión Confirmación
                  </span>
                  <p className="text-xl font-black text-blue-400 mt-1">
                    {feeSimResult.calculatedConfirmationFeeEur.toLocaleString(
                      "es-ES",
                      { minimumFractionDigits: 2 },
                    )}{" "}
                    €
                  </p>
                  <span className="text-[10px] text-slate-400">
                    @ {feeSimResult.confirmationFeeRatePct}% anual
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                  <span className="text-slate-400 block">
                    Total Gastos Bancarios
                  </span>
                  <p className="text-xl font-black text-emerald-400 mt-1">
                    {feeSimResult.totalBankFeesEur.toLocaleString("es-ES", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    €
                  </p>
                  <span className="text-[10px] text-slate-400">
                    Coste efectivo: {feeSimResult.effectiveBankCostPct}%
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
                <span className="font-bold text-white block">
                  Otros Gastos y Recargos:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                  <p>
                    Recargo por Discrepancias:{" "}
                    <strong>
                      {feeSimResult.calculatedDiscrepancyFeeEur.toFixed(2)} €
                    </strong>
                  </p>
                  <p>
                    Comisión de Enmiendas:{" "}
                    <strong>
                      {feeSimResult.calculatedAmendmentFeeEur.toFixed(2)} €
                    </strong>
                  </p>
                  <p>
                    Comisión de Pago/Liquidación:{" "}
                    <strong>
                      {feeSimResult.calculatedPaymentFeeEur.toFixed(2)} €
                    </strong>
                  </p>
                  <p>
                    Coste Financiero sobre Valor:{" "}
                    <strong>{feeSimResult.effectiveBankCostPct}%</strong>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-sm">
              Ajuste los parámetros financieros del crédito y ejecute el cálculo
              para visualizar la liquidación bancaria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
