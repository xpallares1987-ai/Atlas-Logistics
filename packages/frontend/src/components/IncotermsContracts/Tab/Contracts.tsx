/**
 * @file Contracts.tsx
 * @description Commercial sales contract list and detailed Incoterms 2020 clause inspector.
 * @module @atlas/frontend/components/IncotermsContracts/Tab
 */

import { motion, Variants } from "framer-motion";
import {
  FileCheck,
  Search,
  Download,
  Building,
  Calendar,
  FileSignature,
} from "lucide-react";
import { Input } from "@atlas/ui";
import { CommercialContract } from "../types/index";

export interface ContractsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  contracts: CommercialContract[];
  isLoading: boolean;
  selectedContract: CommercialContract | null;
  onSelectContract: (contract: CommercialContract) => void;
  containerVariants?: Variants;
  itemVariants?: Variants;
}

export function Contracts({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  contracts,
  isLoading,
  selectedContract,
  onSelectContract,
  containerVariants,
  itemVariants,
}: ContractsProps) {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
      {/* Left Column: Contracts List */}
      <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
        <div className="p-4 border-b border-white/10 space-y-3">
          <Input
            type="text"
            placeholder="Buscar Contrato, Incoterm, Empresa..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search size={16} />}
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {(["ALL", "CIP", "FOB", "DDP", "FCA", "EXW"] as const).map(
              (filter) => (
                <button
                  key={filter}
                  onClick={() => onFilterChange(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                    activeFilter === filter
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.15)]"
                      : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  {filter === "ALL" ? "Todos" : filter}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No se encontraron contratos comerciales.
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-2"
              key={activeFilter + searchQuery}
            >
              {contracts.map((contract) => {
                const isSelected = selectedContract?.id === contract.id;
                return (
                  <motion.div
                    key={contract.id}
                    variants={itemVariants}
                    onClick={() => onSelectContract(contract)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-white/10 border-white/20 shadow-lg"
                        : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mt-0.5">
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white text-sm tracking-wide">
                              {contract.contractNumber}
                            </p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              {contract.incotermCode}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                            {contract.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                            {contract.sellerData?.name} ➔{" "}
                            {contract.buyerData?.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-white">
                          {contract.goodsValue?.toLocaleString()}{" "}
                          {contract.currency}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          {contract.transportMode}
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

      {/* Right Column: Contract Inspector */}
      <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
        {selectedContract ? (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
              <div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    {selectedContract.incotermCode} 2020
                  </span>
                  <h2 className="text-xl font-black text-white tracking-wide">
                    {selectedContract.contractNumber}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  {selectedContract.title}
                </p>
              </div>

              <div>
                <a
                  href={`/api/incoterms/contracts/${selectedContract.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/25 transition-all flex items-center gap-2"
                >
                  <Download size={14} />
                  Descargar Contrato PDF (Bilingual)
                </a>
              </div>
            </div>

            {/* Details Grid */}
            <div className="p-4 md:p-6 space-y-4">
              {/* Parties 2-Boxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-black tracking-wider text-sky-400 uppercase flex items-center gap-1.5">
                    <Building size={12} /> Parte Vendedora (Seller / Exporter)
                  </span>
                  <p className="text-sm font-bold text-white">
                    {selectedContract.sellerData?.name || "N/A"}
                  </p>
                  <p className="text-xs text-slate-300">
                    {selectedContract.sellerData?.address}
                  </p>
                  <p className="text-xs text-slate-400">
                    NIF: {selectedContract.sellerData?.taxId || "N/A"} |{" "}
                    {selectedContract.sellerData?.contact}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-black tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                    <Building size={12} /> Parte Compradora (Buyer / Importer)
                  </span>
                  <p className="text-sm font-bold text-white">
                    {selectedContract.buyerData?.name || "N/A"}
                  </p>
                  <p className="text-xs text-slate-300">
                    {selectedContract.buyerData?.address}
                  </p>
                  <p className="text-xs text-slate-400">
                    VAT/ID: {selectedContract.buyerData?.taxId || "N/A"} |{" "}
                    {selectedContract.buyerData?.contact}
                  </p>
                </div>
              </div>

              {/* Delivery Clause Box */}
              <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/30 space-y-2">
                <span className="text-[10px] font-black tracking-wider text-sky-300 uppercase">
                  Cláusula Contractual de Entrega y Transmisión de Riesgos
                </span>
                <p className="text-sm font-bold text-white">
                  {selectedContract.namedPlace}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-slate-400">Modo:</span>
                    <p className="font-bold text-white">
                      {selectedContract.transportMode}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Transitario:</span>
                    <p className="font-bold text-white">
                      {selectedContract.forwarderData?.name ||
                        "Atlas Logistics SL"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Jurisdicción:</span>
                    <p className="font-bold text-white">
                      {selectedContract.disputeJurisdiction}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Ley Aplicable:</span>
                    <p className="font-bold text-white">
                      {selectedContract.governingLaw}
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                  Resumen Económico Contractual
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Valor Mercancías:</span>
                    <p className="text-sm font-bold text-white">
                      {selectedContract.goodsValue?.toLocaleString()}{" "}
                      {selectedContract.currency}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Flete Estimado:</span>
                    <p className="text-sm font-bold text-sky-400">
                      {selectedContract.freightEstimatedCost?.toLocaleString()}{" "}
                      {selectedContract.currency}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Seguro Estimado:</span>
                    <p className="text-sm font-bold text-emerald-400">
                      {selectedContract.insuranceEstimatedCost?.toLocaleString()}{" "}
                      {selectedContract.currency}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Arancel Estimado:</span>
                    <p className="text-sm font-bold text-amber-400">
                      {selectedContract.customsEstimatedDuty?.toLocaleString()}{" "}
                      {selectedContract.currency}
                    </p>
                  </div>
                </div>
              </div>

              {/* Milestones Risk Timeline */}
              {selectedContract.milestonesData &&
                selectedContract.milestonesData.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                      <Calendar size={12} /> Hitos de Operativa y Transferencia
                      de Riesgos
                    </span>
                    <div className="space-y-2">
                      {selectedContract.milestonesData.map(
                        (m: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  m.status === "COMPLETED"
                                    ? "bg-emerald-400"
                                    : m.status === "IN_PROGRESS"
                                      ? "bg-sky-400 animate-pulse"
                                      : "bg-slate-600"
                                }`}
                              />
                              <div>
                                <p className="font-bold text-white">{m.name}</p>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(m.date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                m.status === "COMPLETED"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : m.status === "IN_PROGRESS"
                                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                    : "bg-white/10 text-slate-400"
                              }`}
                            >
                              {m.status}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
            <FileSignature className="w-12 h-12 mb-2 stroke-1 opacity-40" />
            Seleccione un contrato para inspeccionar las cláusulas y
            obligaciones Incoterms® 2020
          </div>
        )}
      </div>
    </div>
  );
}
