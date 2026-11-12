/**
 * @file DatabaseSeed.tsx
 * @description Enterprise database multi-phase seed injection and live record telemetry tab.
 * @module @atlas/frontend/components/SystemPanel/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Layers,
  Cpu,
  Server,
  Network,
  Sparkles,
} from "lucide-react";
import { Button } from "@atlas/ui";
import type {
  SeedStatusStats,
  SeedResultState,
} from "../../../types/system-panel.types";

interface DatabaseSeedProps {
  seedStatus: SeedStatusStats | null;
  isLoadingStatus: boolean;
  isSeeding: boolean;
  activeSeedingPhase: string | null;
  seedResult: SeedResultState | null;
  isAdmin: boolean;
  role: string;
  onRefreshStats: () => void;
  onDismissResult: () => void;
  onTriggerSeed: (phase: "1" | "2" | "3" | "4" | "5" | "all") => void;
}

export function DatabaseSeed({
  seedStatus,
  isLoadingStatus,
  isSeeding,
  activeSeedingPhase,
  seedResult,
  isAdmin,
  role,
  onRefreshStats,
  onDismissResult,
  onTriggerSeed,
}: DatabaseSeedProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Database size={18} className="text-cyan-400" />
            <span>Enterprise Database & Multi-Phase Seed Injection</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Deterministically populate realistic enterprise logistics records
            across all 25+ database modules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshStats}
            disabled={isLoadingStatus || isSeeding}
            className="border-slate-700 text-slate-300 hover:text-white"
          >
            <RefreshCw
              size={14}
              className={isLoadingStatus ? "animate-spin mr-1.5" : "mr-1.5"}
            />
            Refresh Stats
          </Button>
        </div>
      </div>

      {/* Seed Execution Result Banner */}
      {seedResult && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            seedResult.success
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {seedResult.success ? (
              <CheckCircle2
                size={16}
                className="text-emerald-400 flex-shrink-0"
              />
            ) : (
              <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
            )}
            <span>
              {seedResult.message}
              {seedResult.durationMs
                ? ` (${(seedResult.durationMs / 1000).toFixed(1)}s)`
                : ""}
            </span>
          </div>
          <button
            onClick={onDismissResult}
            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Role Access Notice */}
      {!isAdmin && (
        <div className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-2xl flex items-center gap-3 text-xs text-amber-300">
          <ShieldCheck size={18} className="text-amber-400 flex-shrink-0" />
          <span>
            You are currently viewing in read-only mode ({role}). Database seed
            execution requires ADMIN privileges. Use the RBAC Preview dropdown
            in the top header to simulate ADMIN permissions.
          </span>
        </div>
      )}

      {/* Live Database Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Phase 1 Overview */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Layers size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Phase 1: Operations
                </h4>
                <p className="text-[11px] text-slate-400">
                  Multimodal & Control Tower
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Active
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 text-center">
            <div>
              <div className="text-xl font-black text-white">
                {seedStatus?.phase1.shipments ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                Shipments
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-amber-400">
                {seedStatus?.phase1.incidents ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                Incidents
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-indigo-400">
                {seedStatus?.phase1.drayageOrders ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                Drayage
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed min-h-[48px]">
            7 commercial global corridors, real carrier B/L prefixes, continuous
            vessel AIS paths, container inventories, and 18 incidents with
            authorized resolution notes.
          </p>
          <Button
            size="sm"
            onClick={() => onTriggerSeed("1")}
            disabled={!isAdmin || isSeeding}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all"
          >
            {isSeeding && activeSeedingPhase === "1" ? (
              <RefreshCw size={14} className="animate-spin mr-1.5" />
            ) : (
              <Sparkles size={14} className="mr-1.5" />
            )}
            Inject Phase 1
          </Button>
        </div>

        {/* Phase 2 Overview */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Cpu size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Phase 2: Compliance
                </h4>
                <p className="text-[11px] text-slate-400">
                  Pharma GDP, Hazmat & CBAM
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Regulated
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 text-center">
            <div>
              <div className="text-xl font-black text-emerald-400">
                {seedStatus?.phase2.coldChainShipments ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                Pharma GDP
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-blue-400">
                {seedStatus?.phase2.temperatureReadings ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                Telemetry
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-orange-400">
                {seedStatus?.phase2.dangerousGoods ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                IMDG Hazmat
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed min-h-[48px]">
            Continuous 48h datalogger curves, MKT stability formulas, EmS
            emergency cards, bonded customs warehouse lots, and quarterly EU
            CBAM declarations.
          </p>
          <Button
            size="sm"
            onClick={() => onTriggerSeed("2")}
            disabled={!isAdmin || isSeeding}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all"
          >
            {isSeeding && activeSeedingPhase === "2" ? (
              <RefreshCw size={14} className="animate-spin mr-1.5" />
            ) : (
              <Sparkles size={14} className="mr-1.5" />
            )}
            Inject Phase 2
          </Button>
        </div>

        {/* Phase 3 Overview */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Server size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Phase 3: Finance
                </h4>
                <p className="text-[11px] text-slate-400">
                  Trade Finance & Vault
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Audit-Ready
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 py-3 border-y border-slate-800/80 text-center">
            <div>
              <div className="text-xl font-black text-purple-400">
                {seedStatus?.phase3.invoices ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                AR/AP Invoices
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-amber-400">
                {seedStatus?.phase3.tradeCreditInstruments ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                UCP 600 LCs
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed min-h-[48px]">
            60 multi-currency AR/AP invoices with 3-way match, CASS airline
            netting, SWIFT MT700/734 messages, and signed digital document vault
            records.
          </p>
          <Button
            size="sm"
            onClick={() => onTriggerSeed("3")}
            disabled={!isAdmin || isSeeding}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all"
          >
            {isSeeding && activeSeedingPhase === "3" ? (
              <RefreshCw size={14} className="animate-spin mr-1.5" />
            ) : (
              <Sparkles size={14} className="mr-1.5" />
            )}
            Inject Phase 3
          </Button>
        </div>

        {/* Phase 4 Overview */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Network size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Phase 4: Customs & ERP
                </h4>
                <p className="text-[11px] text-slate-400">
                  USMCA, e-Firma, DLT & ERP
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Transborder
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 py-3 border-y border-slate-800/80 text-center">
            <div>
              <div className="text-xl font-black text-rose-400">
                {seedStatus?.phase4?.cartaPorteDeclarations ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                Carta Porte
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-emerald-400">
                {seedStatus?.phase4?.efirmaAuditStamps ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                e-Firma
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-cyan-400">
                {seedStatus?.phase4?.smartEscrowContracts ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                MLETR DLT
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-amber-400">
                {seedStatus?.phase4?.erpPurchaseOrders ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                ERP Orders
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed min-h-[48px]">
            Carta Porte 3.1 CFDI stamping, RFC 3161 audit logs, UNCITRAL MLETR
            e-BL escrow ledger, and SAP S/4HANA & NetSuite order sync.
          </p>
          <Button
            size="sm"
            onClick={() => onTriggerSeed("4")}
            disabled={!isAdmin || isSeeding}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all"
          >
            {isSeeding && activeSeedingPhase === "4" ? (
              <RefreshCw size={14} className="animate-spin mr-1.5" />
            ) : (
              <Sparkles size={14} className="mr-1.5" />
            )}
            Inject Phase 4
          </Button>
        </div>

        {/* Phase 5 Overview */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Phase 5: Ports & 3D Stowage
                </h4>
                <p className="text-[11px] text-slate-400">
                  FMC Demurrage, DCSA Bookings & 3D Stowage
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Maritime
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 py-3 border-y border-slate-800/80 text-center">
            <div>
              <div className="text-xl font-black text-amber-400">
                {seedStatus?.phase5?.demurrageInvoices ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                FMC Invoices
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-rose-400">
                {seedStatus?.phase5?.demurrageDisputes ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                FMC Disputes
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-cyan-400">
                {seedStatus?.phase5?.oceanBookings ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                DCSA Bookings
              </div>
            </div>
            <div>
              <div className="text-xl font-black text-emerald-400">
                {seedStatus?.phase5?.stowagePlans ?? "—"}
              </div>
              <div className="text-[10px] text-slate-400 uppercase font-medium">
                3D Stowage Plans
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed min-h-[48px]">
            FMC 46 CFR Part 541 demurrage billing audits, clock-stop
            suspensions, DCSA v3.0 shipping instructions & eBLs, and IMO/CSS 3D
            stowage stability certification.
          </p>
          <Button
            size="sm"
            onClick={() => onTriggerSeed("5")}
            disabled={!isAdmin || isSeeding}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all"
          >
            {isSeeding && activeSeedingPhase === "5" ? (
              <RefreshCw size={14} className="animate-spin mr-1.5" />
            ) : (
              <Sparkles size={14} className="mr-1.5" />
            )}
            Inject Phase 5
          </Button>
        </div>
      </div>

      {/* Master Cumulative Injector Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-950/20">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-400" />
            <h4 className="text-sm font-extrabold text-white">
              Full Enterprise Seed Pipeline (All Phases)
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Executes the complete relational sequence across all 29 seeders in
            under 10 seconds. Completely idempotent with zero duplicate key
            conflicts.
          </p>
        </div>
        <Button
          onClick={() => onTriggerSeed("all")}
          disabled={!isAdmin || isSeeding}
          className="w-full md:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 flex-shrink-0"
        >
          {isSeeding && activeSeedingPhase === "all" ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Database size={16} />
          )}
          <span>Execute Full Enterprise Injection</span>
        </Button>
      </div>
    </div>
  );
}

export default DatabaseSeed;
