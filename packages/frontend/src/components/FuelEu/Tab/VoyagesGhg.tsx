/**
 * @file VoyagesGhg.tsx
 * @description Tab 1: Marine Voyages Audit List & Well-to-Wake GHG / Multi-Gas EU ETS Inspector.
 * @module @atlas/frontend/components/FuelEu/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { motion, type Variants } from "framer-motion";
import {
  Search,
  Globe,
  ShieldCheck,
  FileCode2,
  Download,
  Flame,
  Ship,
} from "lucide-react";
import { Input } from "@atlas/ui";
import type { VoyagesGhgTabProps } from "../../../types/fueleu.types";

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

export function VoyagesGhg({
  voyages,
  loadingVoyages,
  searchQuery,
  setSearchQuery,
  activeScopeFilter,
  setActiveScopeFilter,
  selectedVoyage,
  onSelectVoyage,
  currentVoyage,
  onOpenVerifyModal,
}: VoyagesGhgTabProps) {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
      {/* Left Column: Voyages List */}
      <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
        <div className="p-4 border-b border-white/10 space-y-3">
          <Input
            id="fueleu-search-input"
            name="fueleuSearch"
            aria-label="Buscar Travesía, Puerto, IMO, Verificador"
            type="text"
            placeholder="Buscar Travesía, Puerto, IMO, Verificador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={16} />}
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {["ALL", "INTRA_EU_100", "EXTRA_EU_50", "BERTH_PORT_EU_100"].map(
              (scope) => (
                <button
                  key={scope}
                  onClick={() => setActiveScopeFilter(scope)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                    activeScopeFilter === scope
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                      : "bg-transparent text-slate-400 border-transparent hover:bg-white/5"
                  }`}
                >
                  {scope === "ALL"
                    ? "Todos los Ámbitos"
                    : scope === "INTRA_EU_100"
                      ? "Intra-UE (100%)"
                      : scope === "EXTRA_EU_50"
                        ? "Extra-UE (50%)"
                        : "Muelle OPS (100%)"}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingVoyages ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
            </div>
          ) : voyages.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No se encontraron travesías marítimas registradas.
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-2"
              key={activeScopeFilter + searchQuery}
            >
              {voyages.map((v) => {
                const isSelected = selectedVoyage?.id === v.id;
                const isGreen = v.calculatedGhgIntensityGco2eqPerMj < 89.34;
                return (
                  <motion.div
                    key={v.id}
                    variants={itemVariants}
                    onClick={() => onSelectVoyage(v)}
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
                            {v.voyageReferenceNumber}
                          </p>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              v.geographicScope === "INTRA_EU_100"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                : v.geographicScope === "EXTRA_EU_50"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            }`}
                          >
                            {v.geographicScope === "INTRA_EU_100"
                              ? "Intra-UE 100%"
                              : v.geographicScope === "EXTRA_EU_50"
                                ? "Extra-UE 50%"
                                : "Muelle OPS"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                          {v.departurePortLocode} ➔ {v.arrivalPortLocode} (
                          {v.distanceNauticalMiles} NM)
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {v.fuelConsumedTonnes > 0
                            ? `${v.fuelConsumedTonnes} t Combustible`
                            : `${v.opsElectricityConsumedKwh} kWh OPS`}{" "}
                          | {v.carriedTeuCount} TEU
                        </p>
                      </div>

                      <div className="flex flex-col items-end">
                        <span
                          className={`text-xs font-black ${
                            isGreen ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {v.calculatedGhgIntensityGco2eqPerMj.toFixed(2)} g/MJ
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          {v.etsApplicableScopeEmissionsTco2eq.toFixed(1)} t ETS
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

      {/* Right Column: Detailed Voyage & FuelEU Accounting */}
      <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
        {currentVoyage ? (
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
              <div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {currentVoyage.status}
                  </span>
                  <h2 className="text-xl font-black text-white tracking-wide">
                    {currentVoyage.voyageReferenceNumber}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <Globe size={12} className="text-cyan-400" />
                  Buque: {currentVoyage.vessel?.vesselName ||
                    "Buque Mercante"}{" "}
                  (IMO: {currentVoyage.vessel?.imoNumber || "N/A"})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onOpenVerifyModal(currentVoyage)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-1.5 shadow-sm border border-white/10"
                >
                  <ShieldCheck size={14} className="text-cyan-400" />
                  Verificar Travesía
                </button>
                <a
                  href={`/api/fueleu/voyages/${currentVoyage.id}/thetis-xml`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <FileCode2 size={14} />
                  XML THETIS-MRV
                </a>
                <a
                  href={`/api/fueleu/voyages/${currentVoyage.id}/bdn-pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={14} />
                  Informe BDN (PDF)
                </a>
              </div>
            </div>

            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Intensidad WtW Real
                  </span>
                  <p
                    className={`text-lg font-black ${
                      currentVoyage.calculatedGhgIntensityGco2eqPerMj < 89.34
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {currentVoyage.calculatedGhgIntensityGco2eqPerMj.toFixed(2)}{" "}
                    g/MJ
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Energía Consumida
                  </span>
                  <p className="text-lg font-bold text-cyan-400">
                    {(currentVoyage.totalEnergyConsumedMj / 1_000_000).toFixed(
                      2,
                    )}{" "}
                    GJ
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Derechos EU ETS (
                    {currentVoyage.geographicScope === "EXTRA_EU_50"
                      ? "50%"
                      : "100%"}
                    )
                  </span>
                  <p className="text-lg font-bold text-amber-400">
                    {currentVoyage.etsApplicableScopeEmissionsTco2eq.toFixed(2)}{" "}
                    tCO2e
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Carga / TEUs
                  </span>
                  <p className="text-lg font-black text-white">
                    {currentVoyage.carriedTeuCount} TEU
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2 text-xs">
                <span className="font-bold text-slate-300 block">
                  Ruta Náutica & Parámetros Operacionales:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-200">
                  <div>
                    <p>
                      <strong className="text-slate-400">Origen:</strong>{" "}
                      {currentVoyage.departurePortName} (
                      {currentVoyage.departurePortLocode})
                    </p>
                    <p>
                      <strong className="text-slate-400">Destino:</strong>{" "}
                      {currentVoyage.arrivalPortName} (
                      {currentVoyage.arrivalPortLocode})
                    </p>
                    <p>
                      <strong className="text-slate-400">
                        Distancia Navegada:
                      </strong>{" "}
                      {currentVoyage.distanceNauticalMiles} Millas Náuticas
                    </p>
                    <p>
                      <strong className="text-slate-400">
                        Horas Navegación / Muelle:
                      </strong>{" "}
                      {currentVoyage.navigationHours}h /{" "}
                      {currentVoyage.berthHours}h
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong className="text-slate-400">
                        Combustible Principal:
                      </strong>{" "}
                      {currentVoyage.fuel?.fuelName || "VLSFO"}
                    </p>
                    <p>
                      <strong className="text-slate-400">
                        Consumo Bunker:
                      </strong>{" "}
                      {currentVoyage.fuelConsumedTonnes} Toneladas
                    </p>
                    <p>
                      <strong className="text-slate-400">
                        Consumo Red OPS:
                      </strong>{" "}
                      {currentVoyage.opsElectricityConsumedKwh} kWh
                    </p>
                    <p>
                      <strong className="text-slate-400">
                        Auditor Verificador:
                      </strong>{" "}
                      {currentVoyage.leadAuditorVerifier}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 overflow-hidden space-y-1">
                <div className="p-3 bg-slate-900/90 border-b border-white/10 flex justify-between items-center">
                  <span className="font-bold text-slate-300 text-xs flex items-center gap-2">
                    <Flame size={14} className="text-cyan-400" />
                    Desglose de Emisiones Multi-Gas (CO2, CH4 & N2O bajo
                    Directiva 2023/959)
                  </span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="p-3">Gas Contaminante</th>
                      <th className="p-3">GWP (Factor Potencial)</th>
                      <th className="p-3 text-right">Masa Bruta (t)</th>
                      <th className="p-3 text-right">
                        Emisiones Equivalentes (tCO2e)
                      </th>
                      <th className="p-3 text-right">Alcance EU ETS (tCO2e)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="p-3 text-white font-bold">
                        Dióxido de Carbono (CO2)
                      </td>
                      <td className="p-3 text-slate-300">1.0</td>
                      <td className="p-3 text-right text-slate-300">
                        {currentVoyage.co2EmissionsTonnes.toFixed(3)}
                      </td>
                      <td className="p-3 text-right text-white font-bold">
                        {currentVoyage.co2EmissionsTonnes.toFixed(3)}
                      </td>
                      <td className="p-3 text-right font-black text-amber-400">
                        {(
                          currentVoyage.co2EmissionsTonnes *
                          (currentVoyage.geographicScope === "EXTRA_EU_50"
                            ? 0.5
                            : 1.0)
                        ).toFixed(3)}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="p-3 text-white font-bold">
                        Metano (CH4 - Deslizamiento)
                      </td>
                      <td className="p-3 text-slate-300">28.0 (AR5)</td>
                      <td className="p-3 text-right text-slate-300">
                        {currentVoyage.ch4EmissionsTonnes.toFixed(4)}
                      </td>
                      <td className="p-3 text-right text-white font-bold">
                        {(currentVoyage.ch4EmissionsTonnes * 28).toFixed(3)}
                      </td>
                      <td className="p-3 text-right font-black text-amber-400">
                        {(
                          currentVoyage.ch4EmissionsTonnes *
                          28 *
                          (currentVoyage.geographicScope === "EXTRA_EU_50"
                            ? 0.5
                            : 1.0)
                        ).toFixed(3)}
                      </td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="p-3 text-white font-bold">
                        Óxido Nitroso (N2O)
                      </td>
                      <td className="p-3 text-slate-300">265.0 (AR5)</td>
                      <td className="p-3 text-right text-slate-300">
                        {currentVoyage.n2oEmissionsTonnes.toFixed(4)}
                      </td>
                      <td className="p-3 text-right text-white font-bold">
                        {(currentVoyage.n2oEmissionsTonnes * 265).toFixed(3)}
                      </td>
                      <td className="p-3 text-right font-black text-amber-400">
                        {(
                          currentVoyage.n2oEmissionsTonnes *
                          265 *
                          (currentVoyage.geographicScope === "EXTRA_EU_50"
                            ? 0.5
                            : 1.0)
                        ).toFixed(3)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
            <Ship className="w-12 h-12 mb-2 stroke-1 opacity-40" />
            Seleccione una travesía para auditar los consumos de bunker y la
            intensidad de gases de efecto invernadero
          </div>
        )}
      </div>
    </div>
  );
}
