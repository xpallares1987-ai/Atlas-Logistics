/**
 * @file DeclarationList.tsx
 * @description Sidebar listing and searching customs clearance declarations with channel badges.
 * @module @atlas/frontend/components/CustomsClearance/Panel
 */

import { Search, FileCheck } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { Input } from "@atlas/ui";
import {
  CustomsDeclaration,
  DeclarationFilter,
  StatusVisuals,
} from "../types/index";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

interface DeclarationListProps {
  declarations: CustomsDeclaration[];
  filteredDeclarations: CustomsDeclaration[];
  selectedDecl: CustomsDeclaration | null;
  onSelectDecl: (decl: CustomsDeclaration) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFilter: DeclarationFilter;
  onFilterChange: (f: DeclarationFilter) => void;
  isLoading: boolean;
  getStatusVisuals: (status: string) => StatusVisuals;
}

export function DeclarationList({
  filteredDeclarations,
  selectedDecl,
  onSelectDecl,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  isLoading,
  getStatusVisuals,
}: DeclarationListProps) {
  return (
    <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
      <div className="p-4 border-b border-white/10 space-y-3">
        <div>
          <Input
            id="customs-search-input"
            name="customsSearch"
            aria-label="Buscar por DUA, B/L o Partida"
            type="text"
            placeholder="Buscar por DUA, B/L o Partida..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(["All", "Pending", "Hold", "Cleared"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                activeFilter === filter
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {filter === "All"
                ? "Todos"
                : filter === "Pending"
                  ? "Canal Naranja"
                  : filter === "Hold"
                    ? "Canal Rojo"
                    : "Canal Verde"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Cargando declaraciones aduaneras...
          </div>
        ) : filteredDeclarations.length === 0 ? (
          <div className="text-center p-8 text-slate-500 flex flex-col items-center">
            <FileCheck className="w-8 h-8 opacity-50 mb-2" />
            <p>No se encontraron declaraciones</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-2"
            key={activeFilter + searchQuery}
          >
            {filteredDeclarations.map((dec) => {
              const visuals = getStatusVisuals(dec.status);
              const StatusIcon = visuals.icon;
              const isSelected = selectedDecl?.id === dec.id;

              return (
                <motion.button
                  key={dec.id}
                  variants={itemVariants}
                  onClick={() => onSelectDecl(dec)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? "bg-white/10 border-white/20 shadow-lg"
                      : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-xl mt-0.5 ${visuals.bg} ${visuals.border} border ${visuals.glow}`}
                      >
                        <StatusIcon className={`w-4 h-4 ${visuals.color}`} />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm tracking-wide">
                          {dec.duaNumber ||
                            `DUA-${dec.id.slice(0, 8).toUpperCase()}`}
                        </p>
                        <p className="text-xs text-slate-400 mb-1">
                          TARIC: {dec.hsCode || "8504.40.90.90"} | B/L:{" "}
                          {dec.blNumber || "N/A"}
                        </p>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${visuals.bg} ${visuals.border} ${visuals.color}`}
                        >
                          {dec.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-slate-400 mb-0.5">
                        RIESGO
                      </span>
                      <span
                        className={`text-base font-black ${
                          (dec.riskScore ?? dec.aiRiskScore ?? 10) > 60
                            ? "text-rose-400"
                            : (dec.riskScore ?? dec.aiRiskScore ?? 10) > 20
                              ? "text-amber-400"
                              : "text-emerald-400"
                        }`}
                      >
                        {dec.riskScore ?? dec.aiRiskScore ?? 12}/100
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
