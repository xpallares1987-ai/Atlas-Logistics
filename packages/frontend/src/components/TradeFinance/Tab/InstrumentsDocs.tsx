/**
 * @file InstrumentsDocs.tsx
 * @description Trade credit instruments list and detailed UCP 600 / URDG 758 documentation tab.
 * @module @atlas/frontend/components/TradeFinance/Tab/InstrumentsDocs
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { motion, Variants } from "framer-motion";
import {
  Search,
  Landmark,
  FileCode2,
  Download,
  FileCheck2,
} from "lucide-react";
import { Input } from "@atlas/ui";
import { TradeInstrument } from "../../../types/trade-finance.types";
import { formatInstrumentFilterLabel } from "../hooks/useTradeFinance";

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

export interface InstrumentsDocsProps {
  instruments: TradeInstrument[];
  loadingInstruments: boolean;
  activeTypeFilter: string;
  setActiveTypeFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedInstrument: TradeInstrument | null;
  setSelectedInstrument: (inst: TradeInstrument) => void;
  currentInst: TradeInstrument | null;
}

export const InstrumentsDocs: React.FC<InstrumentsDocsProps> = ({
  instruments,
  loadingInstruments,
  activeTypeFilter,
  setActiveTypeFilter,
  searchQuery,
  setSearchQuery,
  selectedInstrument,
  setSelectedInstrument,
  currentInst,
}) => {
  return (
    <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
      {/* Left Column: Instruments List */}
      <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
        <div className="p-4 border-b border-white/10 space-y-3">
          <Input
            type="text"
            placeholder="Buscar Referencia, Ordenante, Beneficiario, Banco..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={16} />}
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
              "ALL",
              "COMMERCIAL_LC_CONFIRMED",
              "COMMERCIAL_LC_IRREVOCABLE",
              "DEMAND_GUARANTEE_URDG758",
              "DOC_COLLECTION_DP",
            ].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                  activeTypeFilter === t
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                    : "bg-transparent text-slate-400 border-transparent hover:bg-white/5"
                }`}
              >
                {formatInstrumentFilterLabel(t)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingInstruments ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            </div>
          ) : instruments.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No se encontraron instrumentos de financiación comercial.
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-2"
              key={activeTypeFilter + searchQuery}
            >
              {instruments.map((inst) => {
                const isSelected = selectedInstrument?.id === inst.id;
                const isOk = inst.status !== "DISCREPANCIES_FOUND";
                return (
                  <motion.div
                    key={inst.id}
                    variants={itemVariants}
                    onClick={() => setSelectedInstrument(inst)}
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
                            {inst.instrumentReference}
                          </p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {inst.applicableRules}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                          {inst.beneficiaryName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {inst.issuingBankName} | Exp: {inst.expiryDate}
                        </p>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-emerald-400">
                          {inst.creditAmount.toLocaleString("es-ES")}{" "}
                          {inst.currency}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold mt-1 ${
                            isOk
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {inst.status}
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

      {/* Right Column: Instrument Details & Presented Documents */}
      <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
        {currentInst ? (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
              <div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {currentInst.instrumentType}
                  </span>
                  <h2 className="text-xl font-black text-white tracking-wide">
                    {currentInst.instrumentReference}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <Landmark size={12} className="text-blue-400" />
                  Banco Emisor: {currentInst.issuingBankName} (
                  {currentInst.issuingBankBic})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/trade-finance/instruments/${currentInst.id}/swift-mt700`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-1.5 shadow-sm border border-white/10"
                >
                  <FileCode2 size={14} className="text-cyan-400" />
                  SWIFT MT700
                </a>
                {currentInst.applicableRules === "URDG758" && (
                  <a
                    href={`/api/trade-finance/instruments/${currentInst.id}/guarantee-certificate-pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Download size={14} />
                    Garantía URDG (PDF)
                  </a>
                )}
                <a
                  href={`/api/trade-finance/instruments/${currentInst.id}/presentation-dossier-pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={14} />
                  Dossier Bancario (PDF)
                </a>
              </div>
            </div>

            {/* Body: Operational & Credit Terms */}
            <div className="p-4 md:p-6 space-y-4">
              {/* Metric Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Importe Nominal
                  </span>
                  <p className="text-lg font-black text-emerald-400">
                    {currentInst.creditAmount.toLocaleString("es-ES")}{" "}
                    {currentInst.currency}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Tolerancia UCP 600
                  </span>
                  <p className="text-lg font-bold text-cyan-400">
                    +/- {currentInst.tolerancePercentage}%
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Fecha Límite Embarque
                  </span>
                  <p className="text-lg font-bold text-amber-400">
                    {currentInst.latestShipmentDate}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    Vencimiento del Crédito
                  </span>
                  <p className="text-lg font-black text-white">
                    {currentInst.expiryDate}
                  </p>
                </div>
              </div>

              {/* Parties & Logistics Routing */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2 text-xs">
                <span className="font-bold text-slate-300 block">
                  Partes del Crédito & Ruta de Transporte:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-200">
                  <div>
                    <p>
                      <strong className="text-slate-400">
                        Ordenante (Applicant):
                      </strong>{" "}
                      {currentInst.applicantName}
                    </p>
                    <p>
                      <strong className="text-slate-400">Beneficiario:</strong>{" "}
                      {currentInst.beneficiaryName}
                    </p>
                    <p>
                      <strong className="text-slate-400">
                        Banco Confirmador:
                      </strong>{" "}
                      {currentInst.confirmingBankName || "Sin confirmar"}
                    </p>
                    <p>
                      <strong className="text-slate-400">
                        Plazo Presentación:
                      </strong>{" "}
                      Max {currentInst.presentationPeriodDays} días naturales
                      tras B/L
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong className="text-slate-400">
                        Puerto de Carga:
                      </strong>{" "}
                      {currentInst.portOfLoading}
                    </p>
                    <p>
                      <strong className="text-slate-400">
                        Puerto de Destino:
                      </strong>{" "}
                      {currentInst.portOfDischarge}
                    </p>
                    <p>
                      <strong className="text-slate-400">
                        Términos de Pago:
                      </strong>{" "}
                      {currentInst.paymentTerms} (
                      {currentInst.tenorDays > 0
                        ? `${currentInst.tenorDays} días`
                        : "A la vista"}
                      )
                    </p>
                    <p>
                      <strong className="text-slate-400">Mercancía:</strong>{" "}
                      {currentInst.goodsDescriptionSummary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Presented Documents Table */}
              <div className="rounded-2xl border border-white/10 overflow-hidden space-y-1">
                <div className="p-3 bg-slate-900/90 border-b border-white/10 flex justify-between items-center">
                  <span className="font-bold text-slate-300 text-xs flex items-center gap-2">
                    <FileCheck2 size={14} className="text-blue-400" />
                    Documentos Exigidos & Presentados para Negociación
                  </span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="p-3">Tipo de Documento</th>
                      <th className="p-3">Referencia</th>
                      <th className="p-3">Emisor / Fecha</th>
                      <th className="p-3 text-center">Originales</th>
                      <th className="p-3 text-right">Estado UCP 600</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {currentInst.documents &&
                    currentInst.documents.length > 0 ? (
                      currentInst.documents.map((doc) => (
                        <tr
                          key={doc.id}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td className="p-3 text-white font-bold">
                            {doc.documentType.replace(/_/g, " ")}
                          </td>
                          <td className="p-3 text-slate-300">
                            {doc.documentReferenceNumber}
                          </td>
                          <td className="p-3 text-slate-300">
                            {doc.issuerName} ({doc.documentDate})
                          </td>
                          <td className="p-3 text-center text-white">
                            {doc.originalCopiesPresented} /{" "}
                            {doc.originalCopiesRequired}
                          </td>
                          <td className="p-3 text-right">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                doc.complianceStatus === "COMPLIANT"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              }`}
                            >
                              {doc.complianceStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-4 text-center text-slate-500"
                        >
                          No hay documentos vinculados a este instrumento de
                          crédito.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
            <Landmark className="w-12 h-12 mb-2 stroke-1 opacity-40" />
            Seleccione un crédito documentario o garantía para inspeccionar su
            estructura y documentos presentados
          </div>
        )}
      </div>
    </div>
  );
};
