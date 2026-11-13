/**
 * @file Consignments.tsx
 * @description CIM rail consignments list and detailed corridor itinerary inspector tab.
 * @module @atlas/frontend/components/RailFreight/Tab
 * @see {@link docs/adr/0020-modular-file-size-guardrails.md}
 */

import React from "react";
import { motion, Variants } from "framer-motion";
import {
  Search,
  TrainTrack,
  ShieldCheck,
  FileCode2,
  Download,
  ArrowRightLeft,
} from "lucide-react";
import { Input } from "@atlas/ui";
import type { RailConsignmentStatus } from "../../../types/rail-freight.types";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
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

export interface ConsignmentsProps {
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  activeCorridorFilter: string;
  onSelectCorridorFilter: (corr: string) => void;
  loadingConsignments: boolean;
  consignments: any[];
  selectedConsignment: any;
  onSelectConsignment: (c: any) => void;
  currentConsignment: any;
  trains: any[];
  onOpenStatusModal: (status: RailConsignmentStatus, remarks: string) => void;
}

export const Consignments: React.FC<ConsignmentsProps> = ({
  searchQuery,
  onChangeSearchQuery,
  activeCorridorFilter,
  onSelectCorridorFilter,
  loadingConsignments,
  consignments,
  selectedConsignment,
  onSelectConsignment,
  currentConsignment,
  trains,
  onOpenStatusModal,
}) => {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
      <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
        <div className="p-4 border-b border-white/10 space-y-3">
          <Input
            type="text"
            placeholder="Buscar Nº CIM, Remitente, Destinatario..."
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            leftIcon={<Search size={16} />}
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              "ALL",
              "corridor_rfc6_med",
              "corridor_rfc4_atl",
              "corridor_iberian_core",
            ].map((corr) => (
              <button
                key={corr}
                onClick={() => onSelectCorridorFilter(corr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                  activeCorridorFilter === corr
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                    : "bg-transparent text-slate-400 border-transparent hover:bg-white/5"
                }`}
              >
                {corr === "ALL"
                  ? "Todos los Corredores"
                  : corr === "corridor_rfc6_med"
                    ? "RFC6 Mediterráneo"
                    : corr === "corridor_rfc4_atl"
                      ? "RFC4 Atlántico"
                      : "Eje Central"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingConsignments ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            </div>
          ) : consignments.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No se encontraron expedientes ferroviarios CIM registrados.
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-2"
              key={activeCorridorFilter + searchQuery}
            >
              {consignments.map((c) => {
                const isSelected = selectedConsignment?.id === c.id;
                return (
                  <motion.div
                    key={c.id}
                    variants={itemVariants}
                    onClick={() => onSelectConsignment(c)}
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
                            {c.cimNumber}
                          </p>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              c.status === "DELIVERED"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : c.status === "IN_TRANSIT"
                                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                  : c.status === "GAUGE_TRANSFERRED"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            }`}
                          >
                            {c.status === "GAUGE_TRANSFERRED"
                              ? "CAMBIO DE ANCHO"
                              : c.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                          {c.senderName} ➔ {c.consigneeName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          RU: {c.railwayUndertakingRu} | Masa:{" "}
                          {c.totalGrossMassTonnes} t
                        </p>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-blue-400">
                          {c.totalTeu} TEU / UTIs
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          NHM: {c.nhmCommodityCode}
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

      <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
        {currentConsignment ? (
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
              <div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {currentConsignment.status}
                  </span>
                  <h2 className="text-xl font-black text-white tracking-wide">
                    {currentConsignment.cimNumber}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <TrainTrack size={12} className="text-blue-400" />
                  Empresa Ferroviaria (RU):{" "}
                  {currentConsignment.railwayUndertakingRu}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() =>
                    onOpenStatusModal(
                      currentConsignment.status || "IN_TRANSIT",
                      currentConsignment.remarks || "",
                    )
                  }
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-1.5 shadow-sm border border-white/10"
                >
                  <ShieldCheck size={14} className="text-blue-400" />
                  Actualizar Estado
                </button>
                {trains.length > 0 && (
                  <a
                    href={`/api/rail/trains/${trains[0].id}/taf-tsi-xml`}
                    download={`TAF_TSI_${currentConsignment.cimNumber}.xml`}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <FileCode2 size={14} />
                    XML TAF-TSI
                  </a>
                )}
                <a
                  href={`/api/rail/consignments/${currentConsignment.id}/cim-pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={14} />
                  Carta de Porte CIM (PDF)
                </a>
              </div>
            </div>

            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Masa Bruta Total
                  </span>
                  <p className="text-lg font-black text-white">
                    {currentConsignment.totalGrossMassTonnes} Toneladas
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Capacidad UTIs
                  </span>
                  <p className="text-lg font-bold text-blue-400">
                    {currentConsignment.totalTeu} TEU / P400
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Estatuto Aduanero
                  </span>
                  <p className="text-lg font-bold text-emerald-400">
                    {currentConsignment.customsStatus || "UNION_GOODS"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Límite COTIF CIM
                  </span>
                  <p className="text-lg font-black text-indigo-400">
                    17.00 DEG / kg
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2 text-xs">
                <span className="font-bold text-slate-300 block">
                  Itinerario y Nodos Ferroviarios:
                </span>
                <div className="flex items-center gap-3 text-slate-200">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 font-bold">
                    ORIGEN
                  </div>
                  <div>
                    <p className="font-bold text-white">
                      {currentConsignment.originTerminalId}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Salida Programada:{" "}
                      {currentConsignment.departureDate
                        ?.replace("T", " ")
                        .replace("Z", "")}
                    </p>
                  </div>
                  <ArrowRightLeft size={16} className="text-blue-400 mx-2" />
                  {currentConsignment.gaugeTransferTerminalId && (
                    <>
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 font-bold">
                        CAMBIO DE ANCHO (
                        {currentConsignment.gaugeTransferTerminalId})
                      </div>
                      <ArrowRightLeft
                        size={16}
                        className="text-blue-400 mx-2"
                      />
                    </>
                  )}
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
                    DESTINO
                  </div>
                  <div>
                    <p className="font-bold text-white">
                      {currentConsignment.destinationTerminalId}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Llegada Estimada:{" "}
                      {currentConsignment.estimatedArrivalDate
                        ?.replace("T", " ")
                        .replace("Z", "")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="p-3">Pos.</th>
                      <th className="p-3">Tipo UTI</th>
                      <th className="p-3">Identificador / Matrícula</th>
                      <th className="p-3 text-right">Carga (t)</th>
                      <th className="p-3 text-right">Masa Bruta Vagón</th>
                      <th className="p-3 text-right">Carga por Eje</th>
                      <th className="p-3 text-center">Precinto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(currentConsignment.allocations || []).map(
                      (alloc: any) => (
                        <tr
                          key={alloc.id}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td className="p-3 text-slate-300 font-bold">
                            #{alloc.positionInTrain || 1}
                          </td>
                          <td className="p-3 text-slate-200">
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px]">
                              {alloc.utiType}
                            </span>
                          </td>
                          <td className="p-3 text-white font-bold">
                            {alloc.utiIdentification}
                          </td>
                          <td className="p-3 text-right font-bold text-white">
                            {alloc.payloadMassTonnes} t
                          </td>
                          <td className="p-3 text-right text-slate-300">
                            {alloc.grossWagonMassTonnes} t
                          </td>
                          <td className="p-3 text-right font-black text-blue-400">
                            {alloc.calculatedAxleLoadTonnes} t/eje
                          </td>
                          <td className="p-3 text-center text-slate-400 text-[11px]">
                            {alloc.sealNumber || "OK"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {currentConsignment.remarks && (
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-xs space-y-1">
                  <span className="text-slate-400 font-bold block">
                    Observaciones de Tracción Ferroviaria:
                  </span>
                  <p className="text-slate-200 italic">
                    "{currentConsignment.remarks}"
                  </p>
                  <span className="text-[10px] text-blue-400 block pt-1">
                    Inspector de Tracción Responsable:{" "}
                    {currentConsignment.responsibleRailwayOfficer ||
                      "Marc Vidal"}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
            <TrainTrack className="w-12 h-12 mb-2 stroke-1 opacity-40" />
            Seleccione un expediente ferroviario para inspeccionar los vagones y
            el itinerario del corredor
          </div>
        )}
      </div>
    </div>
  );
};
