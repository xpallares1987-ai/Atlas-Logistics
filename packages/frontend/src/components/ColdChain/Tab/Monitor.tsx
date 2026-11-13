/**
 * @file Monitor.tsx
 * @description Live EN 12830 datalogger monitor and shipment telemetry details tab.
 * @module @atlas/frontend/components/ColdChain/Tab/Monitor
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { motion, Variants } from "framer-motion";
import {
  Search,
  Box,
  ShieldCheck,
  Download,
  ThermometerSnowflake,
} from "lucide-react";
import { Input } from "@atlas/ui";
import {
  ColdChainProfile,
  ColdChainShipment,
} from "../../../types/cold-chain.types";
import { getGdpVerdictBadge } from "../hooks/useColdChain";

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

export interface MonitorProps {
  shipments: ColdChainShipment[];
  profiles: ColdChainProfile[];
  loadingShipments: boolean;
  activeProfileFilter: string;
  setActiveProfileFilter: (profileId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedShipment: ColdChainShipment | null;
  setSelectedShipment: (shipment: ColdChainShipment) => void;
  currentShipment: ColdChainShipment | null;
  onOpenReleaseModal: (shipment: ColdChainShipment) => void;
}

export const Monitor: React.FC<MonitorProps> = ({
  shipments,
  profiles,
  loadingShipments,
  activeProfileFilter,
  setActiveProfileFilter,
  searchQuery,
  setSearchQuery,
  selectedShipment,
  setSelectedShipment,
  currentShipment,
  onOpenReleaseModal,
}) => {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
      {/* Left Column: Shipments List */}
      <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
        <div className="p-4 border-b border-white/10 space-y-3">
          <Input
            type="text"
            placeholder="Buscar Nº Envío, Lote, Producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={16} />}
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveProfileFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                activeProfileFilter === "ALL"
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                  : "bg-transparent text-slate-400 border-transparent hover:bg-white/5"
              }`}
            >
              Todos los Perfiles
            </button>
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProfileFilter(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                  activeProfileFilter === p.id
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                    : "bg-transparent text-slate-400 border-transparent hover:bg-white/5"
                }`}
              >
                {p.name.split(" ")[0]} ({p.minTempCelsius}°C/{p.maxTempCelsius}
                °C)
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingShipments ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            </div>
          ) : shipments.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No se encontraron envíos de cadena de frío.
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-2"
              key={activeProfileFilter + searchQuery}
            >
              {shipments.map((s) => {
                const isSelected = selectedShipment?.id === s.id;
                const badge = getGdpVerdictBadge(s.gdpReleaseVerdict);
                return (
                  <motion.div
                    key={s.id}
                    variants={itemVariants}
                    onClick={() => setSelectedShipment(s)}
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
                            {s.trackingNumber}
                          </p>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                          {s.productDescription}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Lote: {s.batchNumber} | Datalogger:{" "}
                          {s.loggerSerialNumber}
                        </p>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-cyan-400">
                          Consigna: {s.setpointTempCelsius}°C
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          MKT: {s.mktCalculatedCelsius ?? s.setpointTempCelsius}
                          °C
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

      {/* Right Column: Telemetry & Quality Details */}
      <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
        {currentShipment ? (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
              <div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {currentShipment.pharmaClassification}
                  </span>
                  <h2 className="text-xl font-black text-white tracking-wide">
                    {currentShipment.trackingNumber}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <Box size={12} className="text-cyan-400" />
                  Lote: {currentShipment.batchNumber} |{" "}
                  {currentShipment.productDescription}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onOpenReleaseModal(currentShipment)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <ShieldCheck size={14} />
                  Dictamen de Calidad (RP)
                </button>
                <a
                  href={`/api/cold-chain/shipments/${currentShipment.id}/certificate-pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={14} />
                  Certificado GDP (PDF)
                </a>
              </div>
            </div>

            {/* Body: Thermal Dashboard & Readings */}
            <div className="p-4 md:p-6 space-y-4">
              {/* Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Temperatura MKT
                  </span>
                  <p className="text-lg font-black text-cyan-400">
                    {currentShipment.mktCalculatedCelsius ??
                      currentShipment.setpointTempCelsius}
                    °C
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Consigna Setpoint
                  </span>
                  <p className="text-lg font-bold text-white">
                    {currentShipment.setpointTempCelsius}°C
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Excursión Térmica
                  </span>
                  <p
                    className={`text-lg font-bold ${(currentShipment.excursionDurationMinutes || 0) > 0 ? "text-amber-400" : "text-emerald-400"}`}
                  >
                    {currentShipment.excursionDurationMinutes || 0} min
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Dictamen GDP
                  </span>
                  <span
                    className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      currentShipment.gdpReleaseVerdict ===
                      "RELEASED_FOR_DISTRIBUTION"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {currentShipment.gdpReleaseVerdict}
                  </span>
                </div>
              </div>

              {/* Telemetry Readings Table */}
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="p-3">Registro (UTC)</th>
                      <th className="p-3 text-right">Temp. Sonda</th>
                      <th className="p-3 text-right">Temp. Ambiente</th>
                      <th className="p-3 text-right">Humedad %</th>
                      <th className="p-3 text-center">Alimentación</th>
                      <th className="p-3 text-center">Estado Térmico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(currentShipment.readings || []).map((rd) => (
                      <tr
                        key={rd.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="p-3 text-slate-300 font-medium">
                          {rd.recordedAt
                            ? rd.recordedAt.replace("T", " ").replace("Z", "")
                            : "N/A"}
                        </td>
                        <td
                          className={`p-3 text-right font-black ${rd.isExcursion ? "text-rose-400" : "text-emerald-400"}`}
                        >
                          {rd.probeTemperatureCelsius}°C
                        </td>
                        <td className="p-3 text-right text-slate-400">
                          {rd.ambientTemperatureCelsius ?? "--"}°C
                        </td>
                        <td className="p-3 text-right text-slate-300">
                          {rd.relativeHumidityPct ?? "--"}%
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {rd.powerSupplyMode}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              !rd.isExcursion
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {!rd.isExcursion ? "EN RANGO" : "EXCURSIÓN"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Audit Notes Box */}
              {currentShipment.qualityAuditNotes && (
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-xs space-y-1">
                  <span className="text-slate-400 font-bold block">
                    Dictamen y Observaciones de Dirección Técnica:
                  </span>
                  <p className="text-slate-200 italic">
                    "{currentShipment.qualityAuditNotes}"
                  </p>
                  <span className="text-[10px] text-cyan-400 block pt-1">
                    Firmado por:{" "}
                    {currentShipment.responsiblePersonName ||
                      "Persona Responsable GDP"}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
            <ThermometerSnowflake className="w-12 h-12 mb-2 stroke-1 opacity-40" />
            Seleccione un envío para inspeccionar la telemetría térmica EN 12830
          </div>
        )}
      </div>
    </div>
  );
};
