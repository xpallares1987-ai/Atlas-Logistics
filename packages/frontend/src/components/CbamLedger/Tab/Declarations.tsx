/**
 * @file Declarations.tsx
 * @description CBAM Declarations and itemized customs import lines financial ledger tab.
 * @module @atlas/frontend/components/CbamLedger/Tab/Declarations
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import React from "react";
import { FileText, Search, Download, Calendar } from "lucide-react";

export interface CbamDeclarationRecord {
  id: string;
  declarationNumber: string;
  reportingPeriod: string;
  declarantName: string;
  importerName: string;
  totalNetMassTonnes: number;
  totalDirectEmissionsTco2e: number;
  totalIndirectEmissionsTco2e: number;
  totalEmbeddedEmissionsTco2e: number;
  euEtsBenchmarkPriceEur: number;
  grossCarbonLiabilityEur: number;
  carbonPricePaidForeignEur: number;
  netCarbonLiabilityEur: number;
  status: "DRAFT" | "VALIDATED" | "SUBMITTED_REGISTRY" | "AMENDED";
  linesCount: number;
}

export interface DeclarationsProps {
  declarations: CbamDeclarationRecord[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  onSelectDeclaration: (dec: CbamDeclarationRecord) => void;
  selectedDeclarationId: string | null;
  onExportXml: (id: string) => void;
}

export const Declarations: React.FC<DeclarationsProps> = ({
  declarations,
  searchQuery,
  onSearchChange,
  selectedPeriod,
  onPeriodChange,
  onSelectDeclaration,
  selectedDeclarationId,
  onExportXml,
}) => {
  const filteredDeclarations = declarations.filter((d) => {
    const matchesPeriod =
      selectedPeriod === "ALL" || d.reportingPeriod === selectedPeriod;
    const matchesSearch =
      d.declarationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.importerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.declarantName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPeriod && matchesSearch;
  });

  const getStatusBadge = (status: CbamDeclarationRecord["status"]) => {
    switch (status) {
      case "SUBMITTED_REGISTRY":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "VALIDATED":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "AMENDED":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-slate-700/40 text-slate-300 border-slate-600/40";
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Period Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by declaration number, importer, or declarant..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 rounded-xl border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Quarter:
          </span>
          <select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60"
          >
            <option value="ALL">All Periods</option>
            <option value="2026-Q1">2026-Q1</option>
            <option value="2026-Q2">2026-Q2</option>
            <option value="2026-Q3">2026-Q3</option>
            <option value="2026-Q4">2026-Q4</option>
          </select>
        </div>
      </div>

      {/* Declarations Ledger Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Declaration #</th>
                <th className="px-4 py-3.5">Period</th>
                <th className="px-4 py-3.5">Importer / Declarant</th>
                <th className="px-4 py-3.5 text-right">Net Mass (t)</th>
                <th className="px-4 py-3.5 text-right">Embedded (tCO₂e)</th>
                <th className="px-4 py-3.5 text-right">ETS Benchmark</th>
                <th className="px-4 py-3.5 text-right">Art. 9 Credit</th>
                <th className="px-4 py-3.5 text-right">Net Liability (€)</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDeclarations.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No CBAM declarations matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredDeclarations.map((d) => {
                  const isSelected = selectedDeclarationId === d.id;
                  return (
                    <tr
                      key={d.id}
                      onClick={() => onSelectDeclaration(d)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-emerald-500/10 border-l-4 border-l-emerald-500"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        {d.declarationNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-300">
                          {d.reportingPeriod}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">
                          {d.importerName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {d.declarantName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {d.totalNetMassTonnes.toLocaleString("en-US", {
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-300 font-semibold">
                        {d.totalEmbeddedEmissionsTco2e.toLocaleString("en-US", {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">
                        €{d.euEtsBenchmarkPriceEur.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-cyan-400">
                        -€
                        {d.carbonPricePaidForeignEur.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-400">
                        €
                        {d.netCarbonLiabilityEur.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase border ${getStatusBadge(
                            d.status,
                          )}`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => onExportXml(d.id)}
                          title="Generate EU CBAM Registry XML"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-700 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
