import { useState, useMemo } from "react";
import {
  Users,
  Scale,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  DollarSign,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@atlas/ui";
import {
  DEFAULT_WORKLOAD_SETTINGS,
  type WorkloadSettings,
  type OperativeWorkloadRawInput,
  analyzeWorkloadPortfolio,
  generateRebalancingRecommendations,
  auditChargeItem,
  type BilledChargeItem,
} from "@atlas/shared";

// Seed operational operatives for Book TEST01 (Barcelona)
const INITIAL_OPERATIVES: OperativeWorkloadRawInput[] = [
  {
    operativeName: "TEST01 (Team Leader Customer01)",
    shipmentsCount: 42,
    totalTeus: 115,
    distinctBuyersCount: 14,
    complexIncotermsCount: 9,
    totalMetricTons: 2850,
    primaryBuyers: [
      {
        buyerName: "Customer01 Paper UK Ltd",
        shipmentsCount: 26,
        sharePercent: 61.9,
      },
      {
        buyerName: "Cartonneries Rhône-Alpes",
        shipmentsCount: 16,
        sharePercent: 38.1,
      },
    ],
  },
  {
    operativeName: "Operador Tráfico Marítimo 1",
    shipmentsCount: 52,
    totalTeus: 140,
    distinctBuyersCount: 16,
    complexIncotermsCount: 12,
    totalMetricTons: 3400,
    primaryBuyers: [
      {
        buyerName: "Nordic Packaging AB",
        shipmentsCount: 32,
        sharePercent: 61.5,
      },
      {
        buyerName: "Iberia Corrugated S.L.",
        shipmentsCount: 20,
        sharePercent: 38.5,
      },
    ],
  },
  {
    operativeName: "Operador Tráfico Marítimo 2",
    shipmentsCount: 22,
    totalTeus: 55,
    distinctBuyersCount: 6,
    complexIncotermsCount: 3,
    totalMetricTons: 1450,
    primaryBuyers: [
      {
        buyerName: "Mediterranean Paper Srl",
        shipmentsCount: 22,
        sharePercent: 100,
      },
    ],
  },
  {
    operativeName: "TEST02 (Operations Manager)",
    shipmentsCount: 0,
    totalTeus: 0,
    distinctBuyersCount: 0,
    complexIncotermsCount: 0,
    totalMetricTons: 0,
  },
  {
    operativeName: "Blocked User (Contabilidad)",
    shipmentsCount: 0,
    totalTeus: 0,
    distinctBuyersCount: 0,
    complexIncotermsCount: 0,
    totalMetricTons: 0,
  },
];

const INITIAL_CHARGES: BilledChargeItem[] = [
  {
    id: "CHG-MSC-001",
    shipmentRef: "EXP-BCN-2026-901",
    carrierCode: "MSC",
    carrierRawName: "Mediterranean Shipping Company",
    chargeCode: "DEMURRAGE",
    equipmentType: "40HC",
    quantityUnits: 3,
    unitRateBilledEur: 80,
    totalBilledEur: 240,
    freeDaysContracted: 7,
    actualDaysPortStay: 5,
    reimbursedToClientEur: 240,
  },
  {
    id: "CHG-MAERSK-002",
    shipmentRef: "EXP-BCN-2026-902",
    carrierCode: "MAERSK",
    carrierRawName: "Maersk Line A/S",
    chargeCode: "DETENTION",
    equipmentType: "40HC",
    quantityUnits: 2,
    unitRateBilledEur: 95,
    totalBilledEur: 190,
    agreedContractRateEur: 80,
    freeDaysContracted: 7,
    actualDaysPortStay: 9,
    reimbursedToClientEur: 190,
  },
  {
    id: "CHG-CMA-003",
    shipmentRef: "EXP-BCN-2026-903",
    carrierCode: "CMACGM",
    carrierRawName: "CMA CGM S.A.",
    chargeCode: "STORAGE",
    equipmentType: "40HC",
    quantityUnits: 1,
    unitRateBilledEur: 145,
    totalBilledEur: 145,
    freeDaysContracted: 5,
    actualDaysPortStay: 6,
    reimbursedToClientEur: 50,
  },
];

export default function WorkloadPortfolioModule() {
  const [activeTab, setActiveTab] = useState<
    "CARTERIZACION" | "REBALANCE" | "SETTINGS" | "DISCREPANCIES"
  >("CARTERIZACION");
  const [operatives, setOperatives] =
    useState<OperativeWorkloadRawInput[]>(INITIAL_OPERATIVES);
  const [settings, setSettings] = useState<WorkloadSettings>(
    DEFAULT_WORKLOAD_SETTINGS,
  );
  const [rebalanceSuccessMsg, setRebalanceSuccessMsg] = useState("");

  // Live Analysis & Summary
  const analysis = useMemo(() => {
    return analyzeWorkloadPortfolio(operatives, settings);
  }, [operatives, settings]);

  // Recommendations
  const recommendations = useMemo(() => {
    return generateRebalancingRecommendations(operatives, settings);
  }, [operatives, settings]);

  // Charge Discrepancies
  const auditedCharges = useMemo(() => {
    return INITIAL_CHARGES.map((chg) => auditChargeItem(chg));
  }, []);

  const totalDiscrepancyEur = useMemo(() => {
    return auditedCharges
      .filter((c) => c.type !== "COMPLIANT")
      .reduce((acc, c) => acc + c.discrepancyEur, 0);
  }, [auditedCharges]);

  // Apply rebalance handler
  const handleApplyRebalance = (
    sourceName: string,
    targetName: string,
    buyerName: string,
  ) => {
    const next = [...operatives];
    const source = next.find((o) => o.operativeName === sourceName);
    const target = next.find((o) => o.operativeName === targetName);

    if (source && target && source.primaryBuyers) {
      const idx = source.primaryBuyers.findIndex(
        (b) => b.buyerName === buyerName,
      );
      if (idx !== -1) {
        const [buyer] = source.primaryBuyers.splice(idx, 1);
        source.shipmentsCount = Math.max(
          0,
          source.shipmentsCount - buyer.shipmentsCount,
        );
        source.distinctBuyersCount = Math.max(
          1,
          source.distinctBuyersCount - 1,
        );

        if (!target.primaryBuyers) target.primaryBuyers = [];
        target.primaryBuyers.push(buyer);
        target.shipmentsCount += buyer.shipmentsCount;
        target.distinctBuyersCount += 1;

        setOperatives(next);
        setRebalanceSuccessMsg(
          `Cuenta '${buyerName}' reasignada con éxito de ${sourceName} a ${targetName}.`,
        );
        setTimeout(() => setRebalanceSuccessMsg(""), 4000);
      }
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles size={14} className="text-indigo-400" />
              Book TEST01 (Barcelona) · DEPT-TEST01 Intelligence
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 tracking-tight">
              Carterización & Carga de Trabajo Operativa
            </h1>
            <p className="text-sm md:text-base text-slate-400 max-w-2xl mt-1">
              Ponderación cinemática de carga por gestor, detección de
              sobrecargas de SLA, rebalanceo asistido de clientes y auditoría de
              recargos navieros.
            </p>
          </div>

          {/* Navigation Pills */}
          <div className="flex bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 shrink-0 flex-wrap">
            <button
              onClick={() => setActiveTab("CARTERIZACION")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "CARTERIZACION"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users size={15} />
              Carterización ({analysis.summary.activeOperatives})
            </button>
            <button
              onClick={() => setActiveTab("REBALANCE")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "REBALANCE"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ArrowRightLeft size={15} />
              Rebalanceo ({recommendations.length})
            </button>
            <button
              onClick={() => setActiveTab("DISCREPANCIES")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "DISCREPANCIES"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <DollarSign size={15} />
              Auditoría D&D ({auditedCharges.length})
            </button>
            <button
              onClick={() => setActiveTab("SETTINGS")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "SETTINGS"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sliders size={15} />
              Parámetros de Peso
            </button>
          </div>
        </div>

        {/* Global KPIs Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Saturación Media
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-white">
                {analysis.summary.avgSaturation}%
              </span>
              <span className="text-xs text-indigo-400 font-mono">
                de capacidad
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Sobrecargas Críticas
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-2xl font-black ${analysis.summary.overloadedCount > 0 ? "text-rose-400" : "text-emerald-400"}`}
              >
                {analysis.summary.overloadedCount}
              </span>
              <span className="text-xs text-slate-400">
                operativos &gt;100%
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Expedientes & TEUs
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-indigo-300">
                {analysis.summary.totalShipments}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({analysis.summary.totalTeus} TEUs)
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Fugas / Discrepancias D&D
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-400">
                {totalDiscrepancyEur.toLocaleString()} €
              </span>
              <span className="text-xs text-slate-400">a reclamar</span>
            </div>
          </div>
        </div>
      </div>

      {rebalanceSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          {rebalanceSuccessMsg}
        </div>
      )}

      {/* TAB 1: CARTERIZACION DE CUENTAS */}
      {activeTab === "CARTERIZACION" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analysis.operatives.map((op) => {
              const raw = operatives.find(
                (o) => o.operativeName === op.operativeName,
              );
              const isExcluded = op.isExcluded;

              return (
                <div
                  key={op.operativeName}
                  className={`rounded-2xl p-6 border transition-all backdrop-blur-xl ${
                    isExcluded
                      ? "bg-slate-900/30 border-slate-800/40 opacity-70"
                      : op.status === "CRITICAL_OVERLOAD"
                        ? "bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/20"
                        : op.status === "HIGH_WARNING"
                          ? "bg-amber-950/20 border-amber-500/50"
                          : "bg-slate-900/70 border-slate-800/80"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white leading-snug">
                          {op.operativeName}
                        </h3>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {isExcluded
                          ? "Excluido por Gobernanza"
                          : "Operativo Activo Book TEST01"}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isExcluded
                          ? "bg-slate-800 text-slate-400 border border-slate-700"
                          : op.status === "CRITICAL_OVERLOAD"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : op.status === "HIGH_WARNING"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      }`}
                    >
                      {isExcluded ? "EXCLUIDO" : `${op.saturationPercent}% SAT`}
                    </span>
                  </div>

                  {/* Capacity Bar */}
                  {!isExcluded && (
                    <div className="space-y-1.5 mb-5">
                      <div className="flex justify-between text-xs text-slate-400 font-mono">
                        <span>Puntuación: {op.totalPoints} pts</span>
                        <span>Límite: {settings.capacityThreshold} pts</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            op.status === "CRITICAL_OVERLOAD"
                              ? "bg-rose-500"
                              : op.status === "HIGH_WARNING"
                                ? "bg-amber-400"
                                : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(100, op.saturationPercent)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-5 font-mono">
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 uppercase block">
                        Expedientes
                      </span>
                      <span className="text-white font-bold text-sm">
                        {raw?.shipmentsCount || 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 uppercase block">
                        TEUs / Cont.
                      </span>
                      <span className="text-white font-bold text-sm">
                        {raw?.totalTeus || 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 uppercase block">
                        Cuentas Clientes
                      </span>
                      <span className="text-white font-bold text-sm">
                        {raw?.distinctBuyersCount || 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 uppercase block">
                        Incoterms Comp.
                      </span>
                      <span className="text-white font-bold text-sm">
                        {raw?.complexIncotermsCount || 0}
                      </span>
                    </div>
                  </div>

                  {/* Primary Buyers / Concentration */}
                  {raw?.primaryBuyers && raw.primaryBuyers.length > 0 && (
                    <div className="border-t border-slate-800/80 pt-3 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Cartera de Cuentas Principales
                      </span>
                      {raw.primaryBuyers.map((b) => (
                        <div
                          key={b.buyerName}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-slate-300 truncate max-w-[180px]">
                            {b.buyerName}
                          </span>
                          <span className="text-indigo-400 font-mono font-bold">
                            {b.sharePercent}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: REBALANCEO ASISTIDO */}
      {activeTab === "REBALANCE" && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Scale size={18} className="text-indigo-400" />
              Rebalanceo Automático de Cartera para Mitigar Sobrecargas
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              El algoritmo analiza a los operadores en estado crítico (&gt;100%
              saturación) y calcula qué cuentas pueden transferirse hacia
              compañeros con capacidad libre sin exceder el umbral objetivo del{" "}
              {settings.rebalanceTargetSaturation}%.
            </p>

            <div className="mt-6 space-y-3">
              {recommendations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm bg-slate-950/40 rounded-xl border border-slate-800/60">
                  <ShieldCheck
                    size={32}
                    className="mx-auto mb-2 text-emerald-400"
                  />
                  No hay sobrecargas críticas en el equipo. La carga de trabajo
                  está balanceada.
                </div>
              ) : (
                recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                          {rec.sourceOperative} ({rec.sourceOldSaturation}%
                          &rarr; {rec.sourceNewSaturation}%)
                        </span>
                        <ArrowRightLeft size={14} className="text-slate-500" />
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          {rec.targetOperative} ({rec.targetOldSaturation}%
                          &rarr; {rec.targetNewSaturation}%)
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white">
                        Transferir cuenta:{" "}
                        <strong className="text-indigo-300 font-mono">
                          {rec.buyerToTransfer}
                        </strong>{" "}
                        ({rec.transferredShipments} expedientes,{" "}
                        {rec.transferredPoints} pts)
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {rec.rationale}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() =>
                        handleApplyRebalance(
                          rec.sourceOperative,
                          rec.targetOperative,
                          rec.buyerToTransfer,
                        )
                      }
                      className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4"
                    >
                      Aplicar Rebalanceo
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDITORIA DE RECARGOS D&D */}
      {activeTab === "DISCREPANCIES" && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <DollarSign size={18} className="text-amber-400" />
              Auditoría Financiera de Cargos Navieros vs D&D Contractual
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed mb-6">
              Detección de sobre-facturación por demoras y ocupaciones cobradas
              durante el tiempo libre convenido, tarifas unitarias no pactadas y
              fugas de margen no repercutidas a clientes.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-3 px-3">Expediente / Ref</th>
                    <th className="py-3 px-3">Naviera</th>
                    <th className="py-3 px-3">Concepto</th>
                    <th className="py-3 px-3 text-right">Facturado Naviera</th>
                    <th className="py-3 px-3 text-right">
                      Justificado Contrato
                    </th>
                    <th className="py-3 px-3 text-right text-rose-400">
                      Discrepancia
                    </th>
                    <th className="py-3 px-3">Tipo & Acción Recomendada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditedCharges.map((f) => (
                    <tr
                      key={f.chargeId}
                      className="hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="py-3.5 px-3 font-mono font-bold text-white">
                        {f.shipmentRef}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-indigo-300">
                        {f.carrierCode}
                      </td>
                      <td className="py-3.5 px-3 font-mono">{f.chargeId}</td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                        {f.billedAmountEur} €
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-400">
                        {f.justifiedAmountEur} €
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-400">
                        {f.discrepancyEur > 0
                          ? `+${f.discrepancyEur} €`
                          : "0 €"}
                      </td>
                      <td className="py-3.5 px-3 space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            f.type === "FREE_TIME_DISPUTE"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : f.type === "MARGIN_LEAKAGE_UNBILLED"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {f.type.replace(/_/g, " ")}
                        </span>
                        <p className="text-[11px] text-slate-400">
                          {f.explanation}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONFIGURACIÓN DE PESOS */}
      {activeTab === "SETTINGS" && (
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl max-w-3xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders size={18} className="text-indigo-400" />
              Parámetros de Ponderación de Carga de Trabajo
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ajusta los puntos asignados a cada factor de esfuerzo operativo.
              Los cambios recalculan de inmediato la saturación de todos los
              gestores.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <label className="text-slate-400 font-sans font-semibold">
                Puntos por Expediente
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.weightShipment}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    weightShipment: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <label className="text-slate-400 font-sans font-semibold">
                Puntos por TEU / Contenedor
              </label>
              <input
                type="number"
                step="0.01"
                value={settings.weightTeu}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    weightTeu: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <label className="text-slate-400 font-sans font-semibold">
                Puntos por Cliente Distinto
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.weightBuyer}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    weightBuyer: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <label className="text-slate-400 font-sans font-semibold">
                Puntos Incoterm Complejo (DAP/DDP/FCA)
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.weightComplexIncoterm}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    weightComplexIncoterm: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <label className="text-slate-400 font-sans font-semibold">
                Umbral Capacidad Mensual (pts)
              </label>
              <input
                type="number"
                step="5"
                value={settings.capacityThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    capacityThreshold: parseFloat(e.target.value) || 1,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <label className="text-slate-400 font-sans font-semibold">
                Límite Rebalanceo Receptor (%)
              </label>
              <input
                type="number"
                step="5"
                value={settings.rebalanceTargetSaturation}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rebalanceTargetSaturation: parseFloat(e.target.value) || 1,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettings(DEFAULT_WORKLOAD_SETTINGS)}
              className="text-xs border-slate-700"
            >
              Restablecer Valores Predeterminados
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
