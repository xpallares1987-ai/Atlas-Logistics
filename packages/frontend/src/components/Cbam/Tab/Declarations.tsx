/**
 * @file Declarations.tsx
 * @description Quarterly CBAM declarations list and itemized customs lines inspector tab.
 * @module @atlas/frontend/components/Cbam/Tab/Declarations
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { motion, Variants } from "framer-motion";
import {
  Search,
  Box,
  ShieldCheck,
  FileCode2,
  Download,
  Leaf,
} from "lucide-react";
import { Input } from "@atlas/ui";
import { CbamDeclaration } from "../../../types/cbam.types";
import { formatCbamStatusBadge } from "../hooks/useCbam";

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

export interface DeclarationsProps {
  declarations: CbamDeclaration[];
  loadingDeclarations: boolean;
  activePeriodFilter: string;
  setActivePeriodFilter: (period: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedDeclaration: CbamDeclaration | null;
  setSelectedDeclaration: (decl: CbamDeclaration) => void;
  currentDeclaration: CbamDeclaration | null;
  onOpenStatusModal: (decl: CbamDeclaration) => void;
}

export const Declarations: React.FC<DeclarationsProps> = ({
  declarations,
  loadingDeclarations,
  activePeriodFilter,
  setActivePeriodFilter,
  searchQuery,
  setSearchQuery,
  selectedDeclaration,
  setSelectedDeclaration,
  currentDeclaration,
  onOpenStatusModal,
}) => {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
      {/* Left Column: Declarations List */}
      <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
        <div className="p-4 border-b border-white/10 space-y-3">
          <Input
            id="cbam-search-input"
            name="cbamSearch"
            aria-label="Buscar Nº Declaración, Importador, EORI"
            type="text"
            placeholder="Buscar Nº Declaración, Importador, EORI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={16} />}
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {["ALL", "2026-Q3", "2026-Q2", "2026-Q1"].map((period) => (
              <button
                key={period}
                onClick={() => setActivePeriodFilter(period)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                  activePeriodFilter === period
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-transparent text-slate-400 border-transparent hover:bg-white/5"
                }`}
              >
                {period === "ALL" ? "Todos los Periodos" : period}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingDeclarations ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
          ) : declarations.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No se encontraron declaraciones CBAM registradas.
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-2"
              key={activePeriodFilter + searchQuery}
            >
              {declarations.map((d) => {
                const isSelected = selectedDeclaration?.id === d.id;
                const badge = formatCbamStatusBadge(d.status);
                return (
                  <motion.div
                    key={d.id}
                    variants={itemVariants}
                    onClick={() => setSelectedDeclaration(d)}
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
                            {d.declarationNumber}
                          </p>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                          {d.importerName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Periodo: {d.reportingPeriod} | Masa:{" "}
                          {d.totalNetMassTonnes?.toLocaleString()} t
                        </p>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-emerald-400">
                          {d.totalEmbeddedEmissionsTco2e?.toLocaleString()}{" "}
                          tCO2e
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          Deuda: {d.netCarbonLiabilityEur?.toLocaleString()} €
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

      {/* Right Column: Detailed Lines & Actions */}
      <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
        {currentDeclaration ? (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
              <div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {currentDeclaration.reportingPeriod}
                  </span>
                  <h2 className="text-xl font-black text-white tracking-wide">
                    {currentDeclaration.declarationNumber}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <Box size={12} className="text-emerald-400" />
                  Importador: {currentDeclaration.importerName} (
                  {currentDeclaration.importerVat})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onOpenStatusModal(currentDeclaration)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-1.5 shadow-sm border border-white/10"
                >
                  <ShieldCheck size={14} className="text-emerald-400" />
                  Validar Registro
                </button>
                <a
                  href={`/api/cbam/declarations/${currentDeclaration.id}/xml`}
                  download={`CBAM_${currentDeclaration.declarationNumber}.xml`}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <FileCode2 size={14} />
                  XML Registro UE
                </a>
                <a
                  href={`/api/cbam/declarations/${currentDeclaration.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={14} />
                  Certificado (PDF)
                </a>
              </div>
            </div>

            {/* Body: Emissions Overview & Itemized Customs Lines */}
            <div className="p-4 md:p-6 space-y-4">
              {/* Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Masa Neta Total
                  </span>
                  <p className="text-lg font-black text-white">
                    {currentDeclaration.totalNetMassTonnes?.toLocaleString()} t
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Emisiones Directas
                  </span>
                  <p className="text-lg font-bold text-amber-400">
                    {currentDeclaration.totalDirectEmissionsTco2e?.toLocaleString()}{" "}
                    tCO2e
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Emisiones Indirectas
                  </span>
                  <p className="text-lg font-bold text-teal-400">
                    {currentDeclaration.totalIndirectEmissionsTco2e?.toLocaleString()}{" "}
                    tCO2e
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Deuda Neta Liquidable
                  </span>
                  <p className="text-lg font-black text-emerald-400">
                    {currentDeclaration.netCarbonLiabilityEur?.toLocaleString()}{" "}
                    €
                  </p>
                </div>
              </div>

              {/* Itemized Goods Table */}
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="p-3">Código CN / DUA</th>
                      <th className="p-3">Descripción Mercancía</th>
                      <th className="p-3 text-center">Origen</th>
                      <th className="p-3 text-right">Masa (t)</th>
                      <th className="p-3 text-right">Emisiones (tCO2e)</th>
                      <th className="p-3 text-right">Crédito Origen</th>
                      <th className="p-3 text-right">Deuda Neta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(currentDeclaration.lines || []).map((line) => (
                      <tr
                        key={line.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="p-3 text-slate-300 font-medium">
                          <span className="font-bold text-white block">
                            {line.duaBox33HsCode}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {line.duaNumber || "N/A"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-200">
                          {line.goodDescription}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-white/10 font-bold text-xs">
                            {line.originCountry}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-white">
                          {line.netWeightTonnes?.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-400">
                          {line.totalLineEmissionsTco2e?.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-slate-400">
                          {line.effectiveForeignPricePaidEur?.toLocaleString()}{" "}
                          €
                        </td>
                        <td className="p-3 text-right font-black text-white">
                          {line.lineNetLiabilityEur?.toLocaleString()} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Remarks & Legal Notice */}
              {currentDeclaration.remarks && (
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-xs space-y-1">
                  <span className="text-slate-400 font-bold block">
                    Observaciones de Auditoría & Conformidad Oficial:
                  </span>
                  <p className="text-slate-200 italic">
                    "{currentDeclaration.remarks}"
                  </p>
                  <span className="text-[10px] text-emerald-400 block pt-1">
                    Declarante Responsable:{" "}
                    {currentDeclaration.responsibleDeclarant ||
                      "Carlos Vega (Responsable Técnico CBAM)"}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
            <Leaf className="w-12 h-12 mb-2 stroke-1 opacity-40" />
            Seleccione una declaración trimestral para inspeccionar las líneas
            de importación CBAM
          </div>
        )}
      </div>
    </div>
  );
};
