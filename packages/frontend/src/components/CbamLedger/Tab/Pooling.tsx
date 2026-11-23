/**
 * @file Pooling.tsx
 * @description FuelEU Maritime compliance balance pooling tab under Article 21 of Regulation EU 2023/1805.
 * @module @atlas/frontend/components/CbamLedger/Tab/Pooling
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import React from "react";
import { Ship, CheckCircle2, AlertOctagon, Sparkles } from "lucide-react";

export interface PooledVessel {
  imoNumber: string;
  vesselName: string;
  carrier: string;
  actualGhgIntensity: number; // gCO2e/MJ
  targetGhgIntensity: number; // 89.3368 gCO2e/MJ
  totalEnergyMj: number;
  complianceBalanceMj: number;
  isSurplus: boolean;
  poolSharePercent: number;
}

export interface PoolingProps {
  vessels: PooledVessel[];
  totalPoolBalanceMj: number;
  statutoryPenaltyRateEurPerTon: number; // €2,400 / t VLSFO-eq
  onExecutePool: () => void;
  isExecuting: boolean;
}

export const Pooling: React.FC<PoolingProps> = ({
  vessels,
  totalPoolBalanceMj,
  statutoryPenaltyRateEurPerTon,
  onExecutePool,
  isExecuting,
}) => {
  const isNetSurplus = totalPoolBalanceMj >= 0;
  // Energy density of VLSFO: 41,000 MJ/metric ton
  const grossDeficitMj = vessels
    .filter((v) => !v.isSurplus)
    .reduce((acc, v) => acc + Math.abs(v.complianceBalanceMj), 0);
  const potentialGrossPenaltyEur =
    (grossDeficitMj / 41000) * statutoryPenaltyRateEurPerTon;
  const netPenaltyEur = isNetSurplus
    ? 0
    : (Math.abs(totalPoolBalanceMj) / 41000) * statutoryPenaltyRateEurPerTon;
  const savedPenaltyEur = Math.max(0, potentialGrossPenaltyEur - netPenaltyEur);

  return (
    <div className="space-y-6">
      {/* Pooling Banner & Financial Savings */}
      <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900/60 to-emerald-950/60 p-6 rounded-2xl border border-cyan-800/40 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                <Ship className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white">
                FuelEU Maritime Multi-Vessel Compliance Pool
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Art. 21 Regulation (EU) 2023/1805
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Combines compliance balances of low-carbon vessels (bio-LNG,
              e-Methanol) with conventional tonnage, eliminating individual
              non-compliance penalties under the €2,400/t VLSFO statutory fund.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-right">
              <span className="text-xs text-slate-400 font-semibold uppercase block">
                Statutory Penalties Avoided
              </span>
              <span className="text-xl font-black text-emerald-400">
                €
                {savedPenaltyEur.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <button
              onClick={onExecutePool}
              disabled={isExecuting}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {isExecuting ? "Optimizing Pool..." : "Execute Pool Allocation"}
            </button>
          </div>
        </div>
      </div>

      {/* Pool Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Pool Net Compliance Balance
          </span>
          <div
            className={`text-2xl font-black mt-1 ${isNetSurplus ? "text-emerald-400" : "text-rose-400"}`}
          >
            {isNetSurplus ? "+" : ""}
            {totalPoolBalanceMj.toLocaleString("en-US")}{" "}
            <span className="text-sm font-normal text-slate-400">MJ</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
            {isNetSurplus ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            )}
            Status:{" "}
            {isNetSurplus
              ? "Compliant (Zero Statutory Penalty)"
              : "Deficit (Statutory Fee Due)"}
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Gross Deficit Offset
          </span>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {grossDeficitMj.toLocaleString("en-US")}{" "}
            <span className="text-sm font-normal text-slate-400">MJ</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Absorbed by over-compliant bio-fuelled tonnage
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Statutory Fuel Penalty Rate
          </span>
          <div className="text-2xl font-black text-slate-200 mt-1">
            €{statutoryPenaltyRateEurPerTon.toLocaleString("en-US")}{" "}
            <span className="text-sm font-normal text-slate-400">
              / t VLSFO-eq
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Per Art. 23 of Regulation (EU) 2023/1805
          </div>
        </div>
      </div>

      {/* Pooled Fleet Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Ship className="w-4 h-4 text-cyan-400" />
            Participating Fleet Vessels ({vessels.length})
          </h3>
          <span className="text-xs text-slate-400">
            Target Intensity: 89.3368 gCO₂e/MJ
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">IMO / Vessel</th>
                <th className="px-4 py-3.5">Carrier</th>
                <th className="px-4 py-3.5 text-right">Actual Intensity</th>
                <th className="px-4 py-3.5 text-right">Total Energy (MJ)</th>
                <th className="px-4 py-3.5 text-right">Compliance Balance</th>
                <th className="px-4 py-3.5 text-center">Position</th>
                <th className="px-4 py-3.5 text-right">Pool Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {vessels.map((v) => (
                <tr
                  key={v.imoNumber}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-white">
                      {v.vesselName}
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                      IMO: {v.imoNumber}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-300">
                    {v.carrier}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span
                      className={
                        v.actualGhgIntensity <= v.targetGhgIntensity
                          ? "text-emerald-400 font-bold"
                          : "text-rose-400"
                      }
                    >
                      {v.actualGhgIntensity.toFixed(2)}
                    </span>{" "}
                    <span className="text-xs text-slate-500">gCO₂e/MJ</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {v.totalEnergyMj.toLocaleString("en-US")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    <span
                      className={
                        v.isSurplus ? "text-emerald-400" : "text-rose-400"
                      }
                    >
                      {v.isSurplus ? "+" : ""}
                      {v.complianceBalanceMj.toLocaleString("en-US")} MJ
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                        v.isSurplus
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      }`}
                    >
                      {v.isSurplus ? "Surplus" : "Deficit"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">
                    {v.poolSharePercent.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
