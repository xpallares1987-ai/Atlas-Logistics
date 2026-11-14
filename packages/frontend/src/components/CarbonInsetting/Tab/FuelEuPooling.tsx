/**
 * @file FuelEuPooling.tsx
 * @description Fleet FuelEU Maritime compliance pooling simulator (Reg EU 2023/1805).
 * @module @atlas/frontend/components/CarbonInsetting/Tab
 */

import { Ship, RefreshCw } from "lucide-react";
import { Button } from "@atlas/ui";
import { FuelEuPoolResult, SEED_FUELEU_POOL_VESSELS } from "@atlas/shared";

export interface FuelEuPoolingProps {
  poolResult: FuelEuPoolResult;
  onExecutePool: () => void;
}

export function FuelEuPooling({
  poolResult,
  onExecutePool,
}: FuelEuPoolingProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Ship className="w-5 h-5 text-indigo-400" />
            <span>
              Motor de Pooling de Flota FuelEU Maritime (Reglamento UE
              2023/1805)
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Transfiere excedentes de intensidad de GEI desde buques alimentados
            con biocombustibles/e-metanol hacia buques convencionales en
            déficit, anulando multas comunitarias.
          </p>
        </div>
        <Button
          onClick={onExecutePool}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-900/40"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Ejecutar & Sellar Pool de Cumplimiento</span>
        </Button>
      </div>

      {/* Pool Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs block">
            Superávit Bruto Generado (Buques Verdes)
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
            +{(poolResult.grossSurplusGCO2e / 1000000).toFixed(2)} MtCO2e
          </span>
          <span className="text-[10px] text-slate-500">
            e-Metanol & Bio-LNG blends
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs block">
            Déficit Bruto Compensado (Buques Fósiles)
          </span>
          <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
            -{(poolResult.grossDeficitGCO2e / 1000000).toFixed(2)} MtCO2e
          </span>
          <span className="text-[10px] text-slate-500">
            VLSFO convencional en rutas UE
          </span>
        </div>

        <div className="bg-slate-950 border border-indigo-500/40 rounded-xl p-4">
          <span className="text-slate-400 text-xs block">
            Multas FuelEU Evitadas en Flota
          </span>
          <span className="text-2xl font-extrabold font-mono text-indigo-400 mt-1 block">
            €{poolResult.totalPenaltyAvoidedEur.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-400">
            Tasa sancionadora €2.400 / ton VLSFO equiv
          </span>
        </div>
      </div>

      {/* Vessel Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
            <tr>
              <th className="p-3">Buque & IMO</th>
              <th className="p-3">Combustible Bunkered</th>
              <th className="p-3">Intensidad GEI</th>
              <th className="p-3">Balance Pre-Pool</th>
              <th className="p-3">Multa Pre-Pool</th>
              <th className="p-3">Compensación del Pool</th>
              <th className="p-3">Balance Post-Pool</th>
              <th className="p-3">Estatus Final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {poolResult.vessels.map((v) => {
              const vesselInput = SEED_FUELEU_POOL_VESSELS.find(
                (iv) => iv.imo === v.imo,
              );
              return (
                <tr key={v.imo} className="hover:bg-slate-800/50">
                  <td className="p-3">
                    <span className="font-bold text-white block">
                      {v.vesselName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      IMO {v.imo}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-slate-200">
                    {vesselInput?.fuelType || "CONVENTIONAL_VLSFO"}
                  </td>
                  <td className="p-3 font-mono">
                    <span className="text-white font-bold">
                      {vesselInput?.actualGhgIntensity}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      vs meta 89.34 g/MJ
                    </span>
                  </td>
                  <td className="p-3 font-mono">
                    <span
                      className={`font-bold ${
                        v.prePoolBalanceMJ >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {v.prePoolBalanceMJ >= 0 ? "+" : ""}
                      {(v.prePoolBalanceMJ / 1000000).toFixed(2)} Mt
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-400">
                    {v.penaltyPrePoolEur > 0 ? (
                      <span className="text-red-400 font-bold">
                        €{v.penaltyPrePoolEur.toLocaleString()}
                      </span>
                    ) : (
                      "€0"
                    )}
                  </td>
                  <td className="p-3 font-mono text-cyan-300">
                    {v.allocatedFromPoolGCO2e > 0
                      ? `+${(v.allocatedFromPoolGCO2e / 1000000).toFixed(2)} Mt transferidos`
                      : "Aportador neto"}
                  </td>
                  <td className="p-3 font-mono font-bold text-emerald-400">
                    {(v.postPoolBalanceGCO2e / 1000000).toFixed(2)} Mt
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {v.penaltyPostPoolEur === 0
                        ? "COMPLIANT (0 MULTA)"
                        : "DEFICIT"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-slate-400">
        <span>Sello Criptográfico del Contrato de Pooling:</span>
        <span className="text-indigo-400 font-bold">
          {poolResult.contractSealHash}
        </span>
      </div>
    </div>
  );
}
