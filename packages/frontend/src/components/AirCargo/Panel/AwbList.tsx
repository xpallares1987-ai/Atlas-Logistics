/**
 * @file AwbList.tsx
 * @description Air Waybill search filter, MAWB list, and nested HAWB consolidation tree.
 * @module @atlas/frontend/components/AirCargo/Panel
 */

import React from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Plane, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@atlas/ui";
import { AwbFilterType, AirwayBillRecord } from "../types/index";

export interface AwbListProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  activeFilter: AwbFilterType;
  onFilterChange: (filter: AwbFilterType) => void;
  airwayBills: AirwayBillRecord[];
  isLoading: boolean;
  selectedAwb: AirwayBillRecord | null;
  onSelectAwb: (awb: AirwayBillRecord) => void;
  expandedMawbs: Record<string, boolean>;
  onToggleMawbExpand: (id: string, e: React.MouseEvent) => void;
  containerVariants?: Variants;
  itemVariants?: Variants;
}

export function AwbList({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  airwayBills,
  isLoading,
  selectedAwb,
  onSelectAwb,
  expandedMawbs,
  onToggleMawbExpand,
  containerVariants,
  itemVariants,
}: AwbListProps) {
  return (
    <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
      <div className="p-4 border-b border-white/10 space-y-3">
        <div>
          <Input
            type="text"
            placeholder="Buscar AWB, Aerolínea, Ruta, Mercancía..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(["ALL", "MAWB", "DIRECT", "HAWB"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                activeFilter === filter
                  ? "bg-sky-500/20 text-sky-300 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.15)]"
                  : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {filter === "ALL"
                ? "Todos"
                : filter === "MAWB"
                  ? "Consolidaciones (MAWB)"
                  : filter === "DIRECT"
                    ? "Directo AWB"
                    : "House (HAWB)"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
          </div>
        ) : airwayBills.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No se encontraron Air Waybills.
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-2"
            key={activeFilter + searchQuery}
          >
            {airwayBills.map((awb) => {
              const isSelected = selectedAwb?.id === awb.id;
              const isExpanded = !!expandedMawbs[awb.id];
              const hasHawbs =
                awb.consolidatedHawbs && awb.consolidatedHawbs.length > 0;

              return (
                <motion.div
                  key={awb.id}
                  variants={itemVariants}
                  className="space-y-1"
                >
                  <div
                    onClick={() => onSelectAwb(awb)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-white/10 border-white/20 shadow-lg"
                        : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mt-0.5">
                          <Plane className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white text-sm tracking-wide">
                              {awb.awbNumber}
                            </p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/10 text-slate-300">
                              {awb.type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mb-1">
                            {awb.airlineName || "Airline"} |{" "}
                            {awb.flightNumber || "Flight"}
                          </p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-sky-300">
                              {awb.originAirport} ✈ {awb.destinationAirport}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400">
                              {awb.chargeableWeightKg} kg chrg
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-bold text-white">
                          {awb.freightCharge?.toFixed(2)}{" "}
                          {awb.currency || "EUR"}
                        </span>
                        {hasHawbs && (
                          <button
                            onClick={(e) => onToggleMawbExpand(awb.id, e)}
                            className="flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20"
                          >
                            {isExpanded ? (
                              <ChevronDown size={12} />
                            ) : (
                              <ChevronRight size={12} />
                            )}
                            {awb.consolidatedHawbs?.length} HAWB
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Special Handling Badges */}
                    {awb.specialHandlingCodes &&
                      awb.specialHandlingCodes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-white/5">
                          {awb.specialHandlingCodes.map((shc: string) => (
                            <span
                              key={shc}
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                shc === "CAO"
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  : shc === "COL" || shc === "PER"
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    : shc === "ELI" || shc === "ELM"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-white/10 text-slate-300"
                              }`}
                            >
                              {shc}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>

                  {/* Nested HAWB Consolidation Sub-List */}
                  <AnimatePresence>
                    {isExpanded && hasHawbs && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pl-6 space-y-1 overflow-hidden"
                      >
                        {awb.consolidatedHawbs?.map((hawb) => (
                          <div
                            key={hawb.id}
                            onClick={() => onSelectAwb(hawb)}
                            className={`p-2.5 rounded-xl border transition-colors cursor-pointer text-xs ${
                              selectedAwb?.id === hawb.id
                                ? "bg-sky-500/20 border-sky-500/40 text-white"
                                : "bg-white/5 border-white/5 hover:bg-white/10 text-slate-300"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold">
                                {hawb.awbNumber}
                              </span>
                              <span className="text-slate-400">
                                {hawb.chargeableWeightKg} kg
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {hawb.natureOfGoods}
                            </p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
