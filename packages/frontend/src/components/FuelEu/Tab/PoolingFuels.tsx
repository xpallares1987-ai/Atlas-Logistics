/**
 * @file PoolingFuels.tsx
 * @description Tab 3: Fleet Compliance Pooling (Art. 21) & Multi-Fuel Well-to-Wake Simulator.
 * @module @atlas/frontend/components/FuelEu/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { useState } from "react";
import {
  Flame,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Sparkles,
  ArrowRightLeft,
  PiggyBank,
  AlertTriangle,
} from "lucide-react";
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
  accounts = [],
  vessels = [],
  onSettlePool,
  onCreatePool,
  onBankSurplus,
  onBorrowDeficit,
}: PoolingFuelsTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFlexModal, setShowFlexModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [flexActionType, setFlexActionType] = useState<"BANK" | "BORROW">(
    "BANK",
  );
  const [flexAmountTonnes, setFlexAmountTonnes] = useState<number>(0);
  const [isProcessingFlex, setIsProcessingFlex] = useState(false);

  const [poolCodeInput, setPoolCodeInput] = useState("");
  const [poolNameInput, setPoolNameInput] = useState("");
  const [operatorInput, setOperatorInput] = useState(
    "Atlas Maritime Pooling AG",
  );
  const [reportingYearInput, setReportingYearInput] = useState(2025);
  const [selectedVessels, setSelectedVessels] = useState<string[]>([]);
  const [isSettlingId, setIsSettlingId] = useState<string | null>(null);

  const openFlexModal = (
    accId: string,
    type: "BANK" | "BORROW",
    defaultTonnes: number,
  ) => {
    setSelectedAccountId(accId);
    setFlexActionType(type);
    setFlexAmountTonnes(Math.abs(defaultTonnes));
    setShowFlexModal(true);
  };

  const handleFlexSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;
    setIsProcessingFlex(true);
    try {
      const amountGco2eq =
        flexAmountTonnes > 0 ? flexAmountTonnes * 1_000_000 : undefined;
      if (flexActionType === "BANK" && onBankSurplus) {
        await onBankSurplus(selectedAccountId, amountGco2eq);
      } else if (flexActionType === "BORROW" && onBorrowDeficit) {
        await onBorrowDeficit(selectedAccountId, amountGco2eq);
      }
      setShowFlexModal(false);
    } finally {
      setIsProcessingFlex(false);
    }
  };

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

      {/* Cuentas de Cumplimiento & Mecanismos de Flexibilidad (Art. 20) */}
      {accounts.length > 0 && (
        <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <ArrowRightLeft size={18} className="text-cyan-400" />
              Mecanismos de Flexibilidad (Art. 20: Banca y Anticipo)
            </h3>
            <span className="text-xs text-slate-400">
              {accounts.length} Cuentas Anuales
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Traspaso de superávit de cumplimiento al año siguiente (Art. 20(1))
            o anticipo de déficit con recargo estatutario del 10% (Art. 20(2)).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => {
              const balanceTonnes = acc.complianceBalanceGco2eq / 1_000_000;
              const isSurplus = acc.complianceBalanceGco2eq > 0;
              const isDeficit = acc.complianceBalanceGco2eq < 0;

              return (
                <div
                  key={acc.id}
                  className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Buque: {acc.vesselId}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Año de Notificación: {acc.reportingYear}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isSurplus
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {acc.complianceStatus}
                      </span>
                    </div>

                    <div className="pt-2 flex justify-between items-baseline font-mono">
                      <span className="text-xs text-slate-400">
                        Balance (CB):
                      </span>
                      <span
                        className={`font-black text-sm ${
                          isSurplus ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isSurplus ? "+" : ""}
                        {balanceTonnes.toFixed(2)} t CO2e
                      </span>
                    </div>

                    {acc.calculatedFuelEuPenaltyEur > 0 && (
                      <div className="flex justify-between text-[11px] font-mono text-amber-400">
                        <span>Penalización Exigible:</span>
                        <span>
                          €{acc.calculatedFuelEuPenaltyEur.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex gap-2">
                    {isSurplus && onBankSurplus && (
                      <button
                        type="button"
                        onClick={() =>
                          openFlexModal(acc.id, "BANK", balanceTonnes)
                        }
                        className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-300 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <PiggyBank size={13} />
                        Bancar (Art. 20.1)
                      </button>
                    )}

                    {isDeficit && onBorrowDeficit && (
                      <button
                        type="button"
                        onClick={() =>
                          openFlexModal(acc.id, "BORROW", balanceTonnes)
                        }
                        className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-300 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <AlertTriangle size={13} />
                        Anticipar (Art. 20.2)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Modal Mecanismo de Flexibilidad (Art. 20) */}
      {showFlexModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-white/20 shadow-2xl space-y-4">
            <h4 className="text-base font-black text-white flex items-center gap-2">
              {flexActionType === "BANK" ? (
                <>
                  <PiggyBank size={18} className="text-cyan-400" />
                  Banca de Superávit (Artículo 20.1)
                </>
              ) : (
                <>
                  <AlertTriangle size={18} className="text-amber-400" />
                  Anticipo de Déficit (Artículo 20.2)
                </>
              )}
            </h4>
            <p className="text-xs text-slate-400">
              {flexActionType === "BANK"
                ? "Traspasa superávit de cumplimiento al año siguiente. Se creará o incrementará el saldo a favor en la cuenta de cumplimiento del año N+1."
                : "Anticipa déficit de cumplimiento del año N+1. Neutraliza la sanción actual y carga un débito equivalente al principal + 10% de recargo estatutario en el año N+1."}
            </p>

            <form onSubmit={handleFlexSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">
                  Cantidad a Traspasar (t CO2e)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={flexAmountTonnes}
                  onChange={(e) => setFlexAmountTonnes(Number(e.target.value))}
                />
              </div>

              {flexActionType === "BORROW" && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Recargo Estatutario:</span>
                    <span>+10.0%</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Carga en Año N+1:</span>
                    <span>{(flexAmountTonnes * 1.1).toFixed(2)} t CO2e</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowFlexModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={flexAmountTonnes <= 0 || isProcessingFlex}
                  className={`px-4 py-2 rounded-xl font-bold text-white transition-all shadow-md ${
                    flexActionType === "BANK"
                      ? "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/30"
                      : "bg-amber-600 hover:bg-amber-500 shadow-amber-900/30"
                  }`}
                >
                  {isProcessingFlex ? "Procesando..." : "Confirmar Operación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
