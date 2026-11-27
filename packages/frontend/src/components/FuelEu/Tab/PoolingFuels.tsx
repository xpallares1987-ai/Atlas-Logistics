/**
 * @file PoolingFuels.tsx
 * @description Tab 3: Fleet Compliance Pooling (Art. 21) & Multi-Fuel Well-to-Wake Simulator.
 * @module @atlas/frontend/components/FuelEu/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { useState } from "react";
import { Flame, ShieldCheck, CheckCircle2, Plus, Sparkles } from "lucide-react";
import { Input } from "@atlas/ui";
import type { PoolingFuelsTabProps } from "../../../types/fueleu.types";

export function PoolingFuels({
  fuels,
  simFuelCode,
  setSimFuelCode,
  simFuelTonnes,
  setSimFuelTonnes,
  simOpsKwh,
  setSimOpsKwh,
  fuelSimResult,
  onRunFuelSim,
  pools,
  vessels = [],
  onSettlePool,
  onCreatePool,
}: PoolingFuelsTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [poolCodeInput, setPoolCodeInput] = useState("");
  const [poolNameInput, setPoolNameInput] = useState("");
  const [operatorInput, setOperatorInput] = useState(
    "Atlas Maritime Pooling AG",
  );
  const [reportingYearInput, setReportingYearInput] = useState(2025);
  const [selectedVessels, setSelectedVessels] = useState<string[]>([]);
  const [isSettlingId, setIsSettlingId] = useState<string | null>(null);

  const toggleVessel = (vId: string) => {
    setSelectedVessels((prev) =>
      prev.includes(vId) ? prev.filter((id) => id !== vId) : [...prev, vId],
    );
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !poolCodeInput ||
      !poolNameInput ||
      selectedVessels.length === 0 ||
      !onCreatePool
    )
      return;
    await onCreatePool({
      poolCode: poolCodeInput,
      poolName: poolNameInput,
      reportingYear: reportingYearInput,
      managingOperatorName: operatorInput,
      vesselIds: selectedVessels,
    });
    setShowCreateModal(false);
    setPoolCodeInput("");
    setPoolNameInput("");
    setSelectedVessels([]);
  };

  const handleSettle = async (poolId: string) => {
    if (!onSettlePool) return;
    setIsSettlingId(poolId);
    try {
      await onSettlePool(poolId);
    } finally {
      setIsSettlingId(null);
    }
  };
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Fuel Simulator */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Flame size={18} className="text-cyan-400" />
            Balance de Combustibles Verdes & Cumplimiento FuelEU
          </h3>
          <p className="text-xs text-slate-400">
            Evalúa el impacto de combustibles alternativos (E-Metanol, Bio-LNG,
            HVO) y conexión OPS en el balance de cumplimiento (CB).
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label
                htmlFor="fueleu-sim-fuel-code"
                className="text-slate-300 block mb-1"
              >
                Tipo de Combustible Principal
              </label>
              <select
                id="fueleu-sim-fuel-code"
                name="simFuelCode"
                value={simFuelCode}
                onChange={(e) => setSimFuelCode(e.target.value)}
                className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {fuels.map((f) => (
                  <option key={f.id} value={f.fuelCode}>
                    {f.fuelName} ({f.totalWtwFactorGco2eqPerMj} g/MJ)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="fueleu-sim-fuel-tonnes"
                  className="text-slate-400 block mb-1"
                >
                  Consumo Combustible (t)
                </label>
                <Input
                  id="fueleu-sim-fuel-tonnes"
                  name="simFuelTonnes"
                  type="number"
                  value={simFuelTonnes}
                  onChange={(e) => setSimFuelTonnes(Number(e.target.value))}
                />
              </div>
              <div>
                <label
                  htmlFor="fueleu-sim-ops-kwh"
                  className="text-slate-400 block mb-1"
                >
                  Electricidad OPS Muelle (kWh)
                </label>
                <Input
                  id="fueleu-sim-ops-kwh"
                  name="simOpsKwh"
                  type="number"
                  value={simOpsKwh}
                  onChange={(e) => setSimOpsKwh(Number(e.target.value))}
                />
              </div>
            </div>

            <button
              onClick={onRunFuelSim}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-md shadow-cyan-600/20"
            >
              Calcular Intensidad GEI & Balance
            </button>

            {fuelSimResult && (
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Intensidad WtW Obtenida:
                  </span>
                  <span className="font-bold text-white">
                    {Number(
                      fuelSimResult.ghgMetrics
                        ?.calculatedGhgIntensityGco2eqPerMj ??
                        fuelSimResult.ghgIntensity ??
                        0,
                    ).toFixed(2)}{" "}
                    gCO2eq/MJ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Objetivo Regulatorio 2025:
                  </span>
                  <span className="font-bold text-slate-300">
                    {Number(
                      fuelSimResult.complianceMetrics
                        ?.targetGhgIntensityGco2eqPerMj ?? 89.34,
                    ).toFixed(2)}{" "}
                    gCO2eq/MJ
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/10">
                  <span className="text-slate-400 font-bold">
                    Estado de Cumplimiento:
                  </span>
                  <span
                    className={`font-black ${
                      (fuelSimResult.complianceMetrics?.isCompliant ??
                      fuelSimResult.isCompliant)
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {fuelSimResult.complianceMetrics?.complianceStatus ||
                      "SURPLUS"}{" "}
                    (
                    {Number(
                      fuelSimResult.complianceMetrics
                        ?.complianceBalanceTonnesCo2eq ?? 0,
                    ).toFixed(2)}{" "}
                    tCO2e)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Penalización Prevista:</span>
                  <span className="font-black text-amber-400">
                    {Number(
                      fuelSimResult.complianceMetrics?.fuelEuPenaltyEur ??
                        fuelSimResult.penaltyEur ??
                        0,
                    ).toLocaleString("es-ES", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    €
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Compliance Pools */}
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              Agrupaciones de Cumplimiento de Flota (Pools - Art. 21)
            </h3>
            {onCreatePool && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus size={14} />
                Nuevo Pool
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400">
            La agrupación permite compensar déficits de buques convencionales
            con superávits de buques a metanol verde, neutralizando
            penalizaciones a 0,00 €.
          </p>

          <div className="space-y-3 overflow-y-auto max-h-[360px]">
            {pools.map((p) => {
              const netBalanceTco2eq =
                Number(p.consolidatedNetComplianceBalanceGco2eq || 0) /
                1_000_000;
              const isSettled = p.status === "FINAL_SETTLED";
              const isCompliant =
                p.isPoolCompliantZeroPenalty ?? netBalanceTco2eq >= 0;

              return (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-sm">
                          {p.poolName}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isSettled
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Gestor: {p.managingOperatorName} | Año:{" "}
                        {p.reportingYear}
                      </p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-sm font-black ${
                          netBalanceTco2eq >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {netBalanceTco2eq >= 0 ? "+" : ""}
                        {netBalanceTco2eq.toFixed(1)} t CO2e
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {p.totalEnrolledVesselsCount} Buques en Pool
                      </p>
                    </div>
                  </div>

                  {p.remarks && (
                    <p className="text-[11px] text-slate-300 italic pt-1 border-t border-white/10">
                      "{p.remarks}"
                    </p>
                  )}

                  {!isSettled && onSettlePool && (
                    <div className="pt-2 border-t border-white/5 flex justify-end">
                      <button
                        type="button"
                        disabled={!isCompliant || isSettlingId === p.id}
                        onClick={() => handleSettle(p.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                          isCompliant
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30"
                            : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        {isSettlingId === p.id ? (
                          <span>Liquidando...</span>
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            Liquidar Compensación a 0,00 €
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Creación de Pool */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-white/20 shadow-2xl space-y-4">
            <h4 className="text-base font-black text-white flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-400" />
              Registrar Agrupación de Cumplimiento (Art. 21)
            </h4>
            <p className="text-xs text-slate-400">
              Registra un Pool de flota para compensar buques con déficit contra
              buques con superávit de intensidad Well-to-Wake.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">
                  Código del Pool (ej. POOL-2025-BALTIC)
                </label>
                <Input
                  type="text"
                  required
                  value={poolCodeInput}
                  onChange={(e) => setPoolCodeInput(e.target.value)}
                  placeholder="POOL-2025-..."
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">
                  Nombre Comercial de la Agrupación
                </label>
                <Input
                  type="text"
                  required
                  value={poolNameInput}
                  onChange={(e) => setPoolNameInput(e.target.value)}
                  placeholder="Atlas Green Fleet Pool..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">
                    Año de Cumplimiento
                  </label>
                  <Input
                    type="number"
                    required
                    value={reportingYearInput}
                    onChange={(e) =>
                      setReportingYearInput(Number(e.target.value))
                    }
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">
                    Operador Gestor del Pool
                  </label>
                  <Input
                    type="text"
                    required
                    value={operatorInput}
                    onChange={(e) => setOperatorInput(e.target.value)}
                  />
                </div>
              </div>

              {vessels.length > 0 && (
                <div>
                  <label className="text-slate-300 block mb-1">
                    Seleccionar Buques Participantes
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-white/10">
                    {vessels.map((v) => {
                      const vId = String(v.id || "");
                      const vName = String(v.vesselName || vId);
                      const isChecked = selectedVessels.includes(vId);
                      return (
                        <label
                          key={vId}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-[11px] ${
                            isChecked
                              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                              : "hover:bg-white/5 text-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleVessel(vId)}
                            className="rounded border-white/20 text-emerald-500 focus:ring-0"
                          />
                          <span className="truncate">{vName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    !poolCodeInput ||
                    !poolNameInput ||
                    selectedVessels.length === 0
                  }
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold transition-all shadow-md shadow-emerald-900/30"
                >
                  Registrar Pool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
