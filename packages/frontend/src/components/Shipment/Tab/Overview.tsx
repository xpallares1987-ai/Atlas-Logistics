/**
 * @file Overview.tsx
 * @description High-level executive synthesis tab for operational shipment 360 view.
 * Visualizes cargo specifications, active lifecycle phase, transit progress, and quick action triage.
 * @module @atlas/frontend/components/Shipment/Tab
 */

import React from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Compass,
  Leaf,
  Lock,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  OperationalShipment360View,
  ShipmentGreenComplianceReadModel,
  TabKey,
} from "../../../types/shipment-workspace360.types";

export interface ShipmentOverviewTabProps {
  shipmentDetail: OperationalShipment360View;
  greenCompliance: ShipmentGreenComplianceReadModel | null;
  handleTabChange: (tab: TabKey) => void;
  setActiveActionModal: (modal: any) => void;
}

export const Overview: React.FC<ShipmentOverviewTabProps> = ({
  shipmentDetail,
  greenCompliance,
  handleTabChange,
  setActiveActionModal,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400">
            Operational Health
          </div>
          <div className="text-xl font-bold mt-1 text-slate-100 flex items-center justify-between">
            <span>{shipmentDetail.health.status}</span>
            <span className="text-sm font-mono text-slate-400">
              {shipmentDetail.health.score}/100
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {shipmentDetail.health.blockers.length} active blockers
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400">
            Tasks Executed
          </div>
          <div className="text-xl font-bold mt-1 text-slate-100">
            {shipmentDetail.metrics.completedTasks} /{" "}
            {shipmentDetail.metrics.totalTasks}
          </div>
          <div className="mt-2 text-[11px] text-emerald-400">
            {shipmentDetail.metrics.openTasks} open,{" "}
            {shipmentDetail.metrics.blockedTasks} gated
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400">
            Active Exceptions
          </div>
          <div className="text-xl font-bold mt-1 text-rose-400">
            {
              shipmentDetail.exceptions.filter((e) => e.status === "OPEN")
                .length
            }
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {
              shipmentDetail.exceptions.filter(
                (e) => e.isBlocking && e.status === "OPEN",
              ).length
            }{" "}
            blocking execution
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400">
            Active Workflow
          </div>
          <div className="text-base font-bold mt-1 text-indigo-300 truncate">
            {shipmentDetail.workflow?.definitionCode || "OCEAN_IMPORT_STD"}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Version {shipmentDetail.workflow?.versionNumber ?? 1} •{" "}
            {shipmentDetail.workflow?.status || "RUNNING"}
          </div>
        </div>
      </div>

      {/* Explainable Next Action Banner */}
      {shipmentDetail.explainability?.recommendedAction && (
        <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase text-indigo-300 tracking-wider">
                Recommended Next Best Action
              </span>
            </div>
            <h4 className="text-sm font-bold text-white">
              {shipmentDetail.explainability.recommendedAction.title}
            </h4>
            <p className="text-xs text-slate-300">
              {shipmentDetail.explainability.recommendedAction.description}
            </p>
          </div>

          <button
            onClick={() => {
              const action = shipmentDetail.explainability.recommendedAction;
              if (action.actionType === "RESOLVE_EXCEPTION") {
                setActiveActionModal({
                  type: "RESOLVE_EXCEPTION",
                  targetId: action.targetId,
                  title: action.title,
                  description: action.description,
                  inputs: { resolutionNote: "" },
                });
              } else {
                const task = shipmentDetail.tasks.find(
                  (t) => t.taskId === action.targetId,
                );
                setActiveActionModal({
                  type: "COMPLETE_TASK",
                  targetId: action.targetId,
                  title: action.title,
                  description: action.description,
                  inputs: {},
                  primaryAction: task?.primaryAction,
                });
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shrink-0 shadow-lg shadow-indigo-600/30 transition"
          >
            <Zap className="w-4 h-4" />
            Act Now (In-Situ)
          </button>
        </div>
      )}

      {/* Two column: Active Blockers & Route Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Blockers & Invariants */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            Execution Gating & Blockers
          </h3>
          {shipmentDetail.health.blockers.length === 0 ? (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5 py-4">
              <CheckCircle2 className="w-4 h-4" />
              All invariants satisfied. Shipment moving without gating
              impediments.
            </p>
          ) : (
            <ul className="space-y-2">
              {shipmentDetail.health.blockers.map((b, idx) => (
                <li
                  key={idx}
                  className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Operational Route Highlights */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            Route Plan & Milestone Schedule
          </h3>
          {shipmentDetail.routePlan?.legs &&
          shipmentDetail.routePlan.legs.length > 0 ? (
            <div className="space-y-2">
              {shipmentDetail.routePlan.legs.map((leg) => (
                <div
                  key={leg.legId}
                  className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-indigo-400 font-bold">
                      Leg {leg.sequence}
                    </span>
                    <span className="text-slate-300">
                      {leg.originLocode} → {leg.destinationLocode}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 font-mono">
                    <span>{leg.mode}</span>
                    <span>({leg.carrierCode || "CARRIER"})</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4">
              No route plan generated yet.
            </p>
          )}
        </div>
      </div>

      {/* Green Compliance & Customs DUA Overview Card */}
      {greenCompliance && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/20 border border-emerald-500/20 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Green Compliance & Customs Clearance Overview
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    GLEC v3 • CBAM • DUA
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Official ISO 14083 carbon ledger, EU ETS liability & AEAT
                  clearance status
                </p>
              </div>
            </div>
            <button
              onClick={() => handleTabChange("compliance_green")}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition self-start md:self-auto"
            >
              Ver Perspectiva Completa (8ª)
              <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Scope 3 KPI */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>GLEC Scope 3 Footprint</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  WTW
                </span>
              </div>
              <div className="text-lg font-bold text-slate-100">
                {greenCompliance.glec.totalTco2eWtw.toFixed(3)}{" "}
                <span className="text-xs font-normal text-slate-400">
                  tCO2e
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Intensity:{" "}
                {greenCompliance.glec.carbonIntensityGco2ePerTkm.toFixed(1)}{" "}
                gCO2e / t-km
              </div>
            </div>

            {/* CBAM KPI */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>EU CBAM Liability</span>
                <span className="text-[10px] text-indigo-400 font-mono">
                  Reg. 2023/956
                </span>
              </div>
              <div className="text-lg font-bold text-indigo-300">
                €
                {greenCompliance.cbam.estimatedCbamLiabilityEur.toLocaleString(
                  "es-ES",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                Benchmark ETS: €
                {greenCompliance.cbam.euEtsBenchmarkPriceEur.toFixed(2)}/t
              </div>
            </div>

            {/* Customs DUA KPI */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                <span>Aduanas (AEAT DUA)</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    greenCompliance.customs.channel === "GREEN"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : greenCompliance.customs.channel === "ORANGE"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  CANAL {greenCompliance.customs.channel}
                </span>
              </div>
              <div className="text-sm font-mono font-bold text-slate-200 truncate">
                {greenCompliance.customs.mrnNumber}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>
                  Oficina: {greenCompliance.customs.customsOfficeLocode}
                </span>
                {greenCompliance.customs.hasActiveHold && (
                  <span className="text-rose-400 font-bold">
                    Retención Activa
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const OverviewTab = Overview;
export const ShipmentOverviewTab = Overview;
