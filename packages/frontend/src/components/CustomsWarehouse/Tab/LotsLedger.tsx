/**
 * @file LotsLedger.tsx
 * @description Customs Inventory Lots master-detail view and AEAT Official Stock Ledger table.
 * @module @atlas/frontend/components/CustomsWarehouse/Tab
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { motion, Variants } from "framer-motion";
import {
  Building2,
  Download,
  Search,
  ShieldCheck,
  FileCode2,
  FileText,
} from "lucide-react";
import { Input } from "@atlas/ui";
import type { CustomsInventoryLot } from "../../../types/customs-warehouse.types";

// ============================================================================
// 1. ANIMATION VARIANTS & PROPS
// ============================================================================

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export interface LotsLedgerProps {
  lots: CustomsInventoryLot[];
  loadingLots: boolean;
  selectedLot: CustomsInventoryLot | null;
  currentLot: CustomsInventoryLot | null;
  onSelectLot: (lot: CustomsInventoryLot) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeRegimeFilter: string;
  onRegimeFilterChange: (regime: string) => void;
  onOpenStatusModal: (lot: CustomsInventoryLot) => void;
}

// ============================================================================
// 2. COMPONENT
// ============================================================================

export function LotsLedger({
  lots,
  loadingLots,
  selectedLot,
  currentLot,
  onSelectLot,
  searchQuery,
  onSearchChange,
  activeRegimeFilter,
  onRegimeFilterChange,
  onOpenStatusModal,
}: LotsLedgerProps) {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
      {/* Left Column: Lots List */}
      <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
        <div className="p-4 border-b border-white/10 space-y-3">
          <Input
            type="text"
            placeholder="Buscar Nº Lote, DVD, TARIC, Titular..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search size={16} />}
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {["ALL", "7100", "7600", "ADT_STAY"].map((reg) => (
              <button
                key={reg}
                onClick={() => onRegimeFilterChange(reg)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                  activeRegimeFilter === reg
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-transparent text-slate-400 border-transparent hover:bg-white/5"
                }`}
              >
                {reg === "ALL"
                  ? "Todos los Regímenes"
                  : reg === "7100"
                    ? "DA (7100)"
                    : reg === "7600"
                      ? "DDA (7600)"
                      : "ADT (90 días)"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingLots ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
            </div>
          ) : lots.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No se encontraron partidas aduaneras registradas.
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-2"
              key={activeRegimeFilter + searchQuery}
            >
              {lots.map((l) => {
                const isSelected = selectedLot?.id === l.id;
                return (
                  <motion.div
                    key={l.id}
                    variants={itemVariants}
                    onClick={() => onSelectLot(l)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-white/10 border-white/20 shadow-lg"
                        : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white text-sm tracking-wide">
                            {l.lotNumber}
                          </p>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              l.status === "ACTIVE"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : l.status === "PARTIALLY_DISCHARGED"
                                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {l.customsRegimeCode === "7100"
                              ? "DA 7100"
                              : l.customsRegimeCode === "7600"
                                ? "DDA 7600"
                                : l.customsRegimeCode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                          {l.ownerCompanyName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          TARIC: {l.taricCommodityCode} |{" "}
                          {l.currentPackageCount} bultos
                        </p>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-amber-400">
                          {(l.totalSuspendedDebtEur || 0).toLocaleString(
                            "es-ES",
                          )}{" "}
                          €
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          Deuda Suspendida
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* Right Column: Detailed Lot & Ledger */}
      <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
        {currentLot ? (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
              <div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {currentLot.status}
                  </span>
                  <h2 className="text-xl font-black text-white tracking-wide">
                    {currentLot.lotNumber}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <FileText size={12} className="text-amber-400" />
                  Documento Vinculación: {
                    currentLot.inclusionDvdNumber
                  } (MRN: {currentLot.inclusionDuaMrn || "N/A"})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onOpenStatusModal(currentLot)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-1.5 shadow-sm border border-white/10"
                >
                  <ShieldCheck size={14} className="text-amber-400" />
                  Estado Partida
                </button>
                <a
                  href={`/api/customs-warehouse/lots/${currentLot.id}/dvd-pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={14} />
                  Documento DVD (PDF)
                </a>
              </div>
            </div>

            {/* Body: Customs Financial & Goods Summary */}
            <div className="p-4 md:p-6 space-y-4">
              {/* Financial Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Valor en Aduana
                  </span>
                  <p className="text-lg font-black text-white">
                    {(currentLot.customsValueEur || 0).toLocaleString("es-ES")}{" "}
                    €
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Arancel Suspendido ({currentLot.dutyTariffRatePercent}%)
                  </span>
                  <p className="text-lg font-bold text-amber-400">
                    {(currentLot.suspendedDutyAmountEur || 0).toLocaleString(
                      "es-ES",
                    )}{" "}
                    €
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    IVA Suspendido ({currentLot.importVatRatePercent}%)
                  </span>
                  <p className="text-lg font-bold text-blue-400">
                    {(currentLot.suspendedVatAmountEur || 0).toLocaleString(
                      "es-ES",
                    )}{" "}
                    €
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Total Deuda en Custodia
                  </span>
                  <p className="text-lg font-black text-emerald-400">
                    {(currentLot.totalSuspendedDebtEur || 0).toLocaleString(
                      "es-ES",
                    )}{" "}
                    €
                  </p>
                </div>
              </div>

              {/* Physical & Tariff Characteristics */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2 text-xs">
                <span className="font-bold text-slate-300 block">
                  Identificación Arancelaria y Logística:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-200">
                  <div>
                    <p>
                      <strong className="text-slate-400">Código TARIC:</strong>{" "}
                      {currentLot.taricCommodityCode}
                    </p>
                    <p>
                      <strong className="text-slate-400">Descripción:</strong>{" "}
                      {currentLot.goodsDescription}
                    </p>
                    <p>
                      <strong className="text-slate-400">Origen:</strong>{" "}
                      {currentLot.originCountryCode}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong className="text-slate-400">
                        Bultos en Custodia:
                      </strong>{" "}
                      {currentLot.currentPackageCount} /{" "}
                      {currentLot.initialPackageCount}
                    </p>
                    <p>
                      <strong className="text-slate-400">
                        Masa Neta / Bruta:
                      </strong>{" "}
                      {currentLot.currentNetMassKg} kg /{" "}
                      {currentLot.currentGrossMassKg} kg
                    </p>
                    <p>
                      <strong className="text-slate-400">
                        Ubicación Rack:
                      </strong>{" "}
                      {currentLot.warehouseLocationRack || "General"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stock Ledger Entries Table */}
              <div className="rounded-2xl border border-white/10 overflow-hidden space-y-1">
                <div className="p-3 bg-slate-900/90 border-b border-white/10 flex justify-between items-center">
                  <span className="font-bold text-slate-300 text-xs flex items-center gap-2">
                    <FileCode2 size={14} className="text-amber-400" />
                    Asientos del Libro Oficial de Registro de Existencias (AEAT)
                  </span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="p-3">Asiento</th>
                      <th className="p-3">Tipo Movimiento</th>
                      <th className="p-3">Referencia Documental</th>
                      <th className="p-3 text-right">Variación Bultos</th>
                      <th className="p-3 text-right">Saldo Bultos</th>
                      <th className="p-3 text-right">Deuda Liberada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(currentLot.entries || []).map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="p-3 text-slate-300 font-bold">
                          #{entry.entrySequentialNumber}
                        </td>
                        <td className="p-3 text-slate-200">
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                            {entry.movementType}
                          </span>
                        </td>
                        <td className="p-3 text-white font-medium">
                          {entry.documentReference}
                        </td>
                        <td
                          className={`p-3 text-right font-bold ${
                            entry.packagesDelta < 0
                              ? "text-rose-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {entry.packagesDelta > 0
                            ? `+${entry.packagesDelta}`
                            : entry.packagesDelta}
                        </td>
                        <td className="p-3 text-right text-slate-300">
                          {entry.packagesBalanceAfter}
                        </td>
                        <td className="p-3 text-right font-black text-amber-400">
                          {(entry.releasedSuspendedDebtEur || 0).toLocaleString(
                            "es-ES",
                          )}{" "}
                          €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Remarks & Officer Sign-off */}
              {currentLot.remarks && (
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-xs space-y-1">
                  <span className="text-slate-400 font-bold block">
                    Observaciones de Inspección y Custodia:
                  </span>
                  <p className="text-slate-200 italic">
                    "{currentLot.remarks}"
                  </p>
                  <span className="text-[10px] text-amber-400 block pt-1">
                    Agente de Aduanas Responsable:{" "}
                    {currentLot.responsibleCustomsAgent}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
            <Building2 className="w-12 h-12 mb-2 stroke-1 opacity-40" />
            Seleccione una partida para examinar los asientos del Libro de
            Existencias y el estado de la deuda aduanera
          </div>
        )}
      </div>
    </div>
  );
}
