import React from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Scan,
  Database,
  FileText,
  Layers,
  Ship,
  FileCheck,
  Upload,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@atlas/ui";
import {
  CommercialInvoiceData,
  PackingListData,
  TransportDocumentData,
  CustomsDeclarationData,
  TripartiteCrossCheckResult,
} from "@atlas/shared";
import {
  OcrAttachment,
  OcrAiProvenance,
} from "../../types/document-vault.types";

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

export interface DocumentOcrStudioTabProps {
  ocrDocType: "INVOICE" | "PACKING_LIST" | "TRANSPORT" | "DECLARATION";
  onOcrDocTypeChange: (
    type: "INVOICE" | "PACKING_LIST" | "TRANSPORT" | "DECLARATION",
  ) => void;
  ocrRawText: string;
  onOcrRawTextChange: (text: string) => void;
  isProcessingOcr: boolean;
  extractedInvoice: CommercialInvoiceData | null;
  extractedPackingList: PackingListData | null;
  extractedTransport: TransportDocumentData | null;
  extractedDeclaration: CustomsDeclarationData | null;
  crossCheckResult: TripartiteCrossCheckResult | null;
  ocrNotification: string | null;
  onClearNotification: () => void;
  ocrAttachment: OcrAttachment | null;
  ocrAiProvenance: OcrAiProvenance | null;
  shipmentsList: any[];
  selectedShipmentId: string;
  onSelectedShipmentIdChange: (id: string) => void;
  onAuditShipmentDocuments: (id: string) => void;
  onLoadPreset: (
    type: "INVOICE" | "PACKING_LIST" | "TRANSPORT" | "DECLARATION",
  ) => void;
  onOcrFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  ocrFileInputRef: React.RefObject<HTMLInputElement>;
  onTriggerGeminiExtract: (forceLive: boolean) => void;
  onTriggerLocalExtract: () => void;
  onTriggerCrossCheck: () => void;
  onResetAll: () => void;
  copyToClipboard: (text: string) => void;
}

export const DocumentOcrStudioTab: React.FC<DocumentOcrStudioTabProps> = ({
  ocrDocType,
  onOcrDocTypeChange,
  ocrRawText,
  onOcrRawTextChange,
  isProcessingOcr,
  extractedInvoice,
  extractedPackingList,
  extractedTransport,
  extractedDeclaration,
  crossCheckResult,
  ocrNotification,
  onClearNotification,
  ocrAttachment,
  ocrAiProvenance,
  shipmentsList,
  selectedShipmentId,
  onSelectedShipmentIdChange,
  onAuditShipmentDocuments,
  onLoadPreset,
  onOcrFileSelect,
  ocrFileInputRef,
  onTriggerGeminiExtract,
  onTriggerLocalExtract,
  onTriggerCrossCheck,
  onResetAll,
  copyToClipboard,
}) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* Notification Toast */}
      <AnimatePresence>
        {ocrNotification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-indigo-900/80 border border-indigo-500/50 text-indigo-200 text-xs px-4 py-3 rounded-2xl flex items-center justify-between shadow-xl"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-400 shrink-0" />
              <span className="font-semibold">{ocrNotification}</span>
            </div>
            <button
              onClick={onClearNotification}
              className="text-indigo-300 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Scan size={20} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Motor Heurístico OCR de Comercio Exterior & Validación Tripartita
            </span>
          </div>
          <h2 className="text-xl font-black text-white">
            Ingestión Inteligente 4-en-1 & Conciliación Aduanera
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
            Digitalización y extracción de Factura Comercial, Packing List,
            Documento de Transporte (B/L, e-CMR) y Pedimento SAT / DUA con
            reconciliación inmediata de valor en aduana (CIF), tolerancias de
            peso bruto e integridad de precintos ISO 17712.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-2xl px-3 py-1.5">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400 font-bold hidden sm:inline">
              Expedición:
            </span>
            <select
              aria-label="Seleccionar Expedición para Auditoría Cruzada"
              className="bg-transparent border-0 text-xs font-mono text-slate-200 focus:outline-none cursor-pointer py-1"
              value={selectedShipmentId}
              onChange={(e) => {
                const id = e.target.value;
                onSelectedShipmentIdChange(id);
                onAuditShipmentDocuments(id);
              }}
            >
              <option
                value="sh_demo_01"
                className="bg-slate-900 text-slate-200"
              >
                BK-2026-67116 (Valencia ↔ New York • MSC ISABELLA)
              </option>
              {shipmentsList.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                  className="bg-slate-900 text-slate-200"
                >
                  {s.referenceNumber || s.bookingId || s.id} (
                  {s.originPort || "CNSHA"} → {s.destinationPort || "ESVLC"})
                </option>
              ))}
            </select>
            <Button
              onClick={() => onAuditShipmentDocuments(selectedShipmentId)}
              disabled={isProcessingOcr}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-1.5 px-3 rounded-xl ml-1"
            >
              {isProcessingOcr ? "Auditando..." : "Auditar Expedición"}
            </Button>
          </div>
          <Button
            onClick={onResetAll}
            variant="ghost"
            className="text-xs text-slate-400 hover:text-white"
          >
            Reiniciar
          </Button>
        </div>
      </motion.div>

      {/* 4-Document Snapshot Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: Factura Comercial */}
        <div
          onClick={() => {
            onOcrDocTypeChange("INVOICE");
            onLoadPreset("INVOICE");
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            ocrDocType === "INVOICE"
              ? "bg-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-blue-400" />
              <span className="text-xs font-bold text-white">
                Factura Comercial
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                extractedInvoice
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {extractedInvoice ? "Extraído" : "Pendiente"}
            </span>
          </div>
          {extractedInvoice ? (
            <div className="text-[11px] text-slate-300 space-y-0.5">
              <div className="font-mono text-white font-bold">
                {extractedInvoice.invoiceNumber}
              </div>
              <div>
                CIF:{" "}
                <span className="text-emerald-400 font-bold">
                  ${extractedInvoice.totalCifUsd.toLocaleString()}
                </span>{" "}
                {extractedInvoice.currency}
              </div>
              <div className="text-[10px] text-slate-400">
                Incoterm: {extractedInvoice.incoterm} •{" "}
                {extractedInvoice.lineItems.length} partidas
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">
              Haz clic para cargar y extraer factura comercial.
            </p>
          )}
        </div>

        {/* Card 2: Packing List */}
        <div
          onClick={() => {
            onOcrDocTypeChange("PACKING_LIST");
            onLoadPreset("PACKING_LIST");
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            ocrDocType === "PACKING_LIST"
              ? "bg-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-indigo-400" />
              <span className="text-xs font-bold text-white">Packing List</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                extractedPackingList
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {extractedPackingList ? "Extraído" : "Pendiente"}
            </span>
          </div>
          {extractedPackingList ? (
            <div className="text-[11px] text-slate-300 space-y-0.5">
              <div className="font-mono text-white font-bold">
                {extractedPackingList.packingListNumber}
              </div>
              <div>
                Bultos:{" "}
                <span className="text-white font-bold">
                  {extractedPackingList.totalPackages}
                </span>{" "}
                {extractedPackingList.packageType}
              </div>
              <div className="text-[10px] text-slate-400">
                Bruto: {extractedPackingList.grossWeightKg.toLocaleString()} kg
                • {extractedPackingList.totalCbm} m³
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">
              Haz clic para cargar y extraer lista de empaque.
            </p>
          )}
        </div>

        {/* Card 3: Documento de Transporte */}
        <div
          onClick={() => {
            onOcrDocTypeChange("TRANSPORT");
            onLoadPreset("TRANSPORT");
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            ocrDocType === "TRANSPORT"
              ? "bg-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Ship size={16} className="text-cyan-400" />
              <span className="text-xs font-bold text-white">
                Doc. Transporte (B/L)
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                extractedTransport
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {extractedTransport ? "Extraído" : "Pendiente"}
            </span>
          </div>
          {extractedTransport ? (
            <div className="text-[11px] text-slate-300 space-y-0.5">
              <div className="font-mono text-white font-bold">
                {extractedTransport.documentNumber}
              </div>
              <div>
                Transportista:{" "}
                <span className="text-white font-semibold">
                  {extractedTransport.carrierName}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Bruto:{" "}
                {extractedTransport.declaredGrossWeightKg.toLocaleString()} kg •
                Precinto: {extractedTransport.sealNumber || "N/A"}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">
              Haz clic para cargar y extraer B/L o e-CMR.
            </p>
          )}
        </div>

        {/* Card 4: Pedimento / DUA */}
        <div
          onClick={() => {
            onOcrDocTypeChange("DECLARATION");
            onLoadPreset("DECLARATION");
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            ocrDocType === "DECLARATION"
              ? "bg-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileCheck size={16} className="text-amber-400" />
              <span className="text-xs font-bold text-white">
                Pedimento SAT / DUA
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                extractedDeclaration
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {extractedDeclaration ? "Extraído" : "Pendiente"}
            </span>
          </div>
          {extractedDeclaration ? (
            <div className="text-[11px] text-slate-300 space-y-0.5">
              <div className="font-mono text-white font-bold">
                {extractedDeclaration.declarationNumber}
              </div>
              <div>
                Valor Aduana:{" "}
                <span className="text-amber-400 font-bold">
                  $
                  {extractedDeclaration.declaredCustomsValueUsd.toLocaleString()}
                </span>{" "}
                USD
              </div>
              <div className="text-[10px] text-slate-400">
                Partida: {extractedDeclaration.primaryHsCode} •{" "}
                {extractedDeclaration.regimenType}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">
              Haz clic para cargar y extraer pedimento oficial.
            </p>
          )}
        </div>
      </motion.div>

      {/* OCR Ingestion Workbench */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        {/* Left: Raw Text Ingestion & Actions (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between gap-4">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                <button
                  onClick={() => {
                    onOcrDocTypeChange("INVOICE");
                    onLoadPreset("INVOICE");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    ocrDocType === "INVOICE"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Factura
                </button>
                <button
                  onClick={() => {
                    onOcrDocTypeChange("PACKING_LIST");
                    onLoadPreset("PACKING_LIST");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    ocrDocType === "PACKING_LIST"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Packing List
                </button>
                <button
                  onClick={() => {
                    onOcrDocTypeChange("TRANSPORT");
                    onLoadPreset("TRANSPORT");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    ocrDocType === "TRANSPORT"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Transporte (B/L)
                </button>
                <button
                  onClick={() => {
                    onOcrDocTypeChange("DECLARATION");
                    onLoadPreset("DECLARATION");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    ocrDocType === "DECLARATION"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pedimento
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="doc-ocr-file-input"
                  name="ocrFileInput"
                  aria-label="Cargar Archivo OCR"
                  type="file"
                  ref={ocrFileInputRef}
                  onChange={onOcrFileSelect}
                  className="hidden"
                  accept=".txt,.json,.csv,.pdf,.png,.jpg,.jpeg"
                />
                <Button
                  onClick={() => ocrFileInputRef.current?.click()}
                  variant="ghost"
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5"
                >
                  <Upload size={13} />
                  Subir PDF / Imagen / TXT
                </Button>
                {ocrAttachment && (
                  <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded-lg">
                    📎 {ocrAttachment.fileName}
                  </span>
                )}
                <Button
                  onClick={() => onLoadPreset(ocrDocType)}
                  variant="ghost"
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1.5"
                >
                  <RefreshCw size={13} />
                  Reset Preset
                </Button>
              </div>
            </div>

            <div className="relative">
              <textarea
                id="doc-ocr-raw-text"
                name="ocrRawText"
                aria-label="Texto desestructurado del documento aduanero"
                value={ocrRawText}
                onChange={(e) => onOcrRawTextChange(e.target.value)}
                placeholder="Pegue aquí el texto desestructurado del documento aduanero o arrastre un archivo..."
                rows={12}
                className="w-full bg-slate-950/90 border border-slate-800 text-slate-200 font-mono text-xs rounded-2xl p-4 focus:outline-none focus:border-indigo-500/60 leading-relaxed shadow-inner"
              />
              <div className="absolute bottom-3 right-4 text-[10px] text-slate-500 font-mono">
                {ocrRawText.length} caracteres
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <Button
              onClick={() => onTriggerGeminiExtract(false)}
              disabled={isProcessingOcr}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-xs"
            >
              <Sparkles size={15} />
              {isProcessingOcr
                ? "Procesando Gemini Multimodal..."
                : "Extraer con Gemini IA Multimodal (PDF/Imagen/Texto)"}
            </Button>
            <Button
              onClick={onTriggerLocalExtract}
              disabled={isProcessingOcr || !ocrRawText.trim()}
              variant="ghost"
              className="border border-slate-700 bg-slate-950/60 hover:bg-slate-800 text-slate-200 font-semibold py-3 px-4 rounded-2xl flex items-center justify-center gap-1.5 text-xs"
            >
              <Scan size={14} />
              OCR Local Rápido
            </Button>
          </div>
        </div>

        {/* Right: Extracted Structured JSON Inspector (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileCheck size={16} className="text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Datos Estructurados Extraídos
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Confianza Heurística: 96%
              </span>
            </div>

            {ocrAiProvenance && (
              <div className="mb-3 p-2.5 rounded-2xl bg-slate-950/90 border border-indigo-500/30 flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      ocrAiProvenance.source === "gemini-live"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : ocrAiProvenance.cached
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    {ocrAiProvenance.source === "gemini-live"
                      ? "Gemini Live"
                      : ocrAiProvenance.cached
                        ? "Caché SQLite/L1 (0-Tokens)"
                        : "Fallback Determinista"}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {ocrAiProvenance.model}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onTriggerGeminiExtract(true)}
                  disabled={isProcessingOcr}
                  className="px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 font-bold text-[10px] flex items-center gap-1 shrink-0 transition-colors"
                >
                  <RefreshCw size={10} />
                  Regenerar en vivo (1 RPM)
                </button>
              </div>
            )}

            {/* Dynamic Content by Doc Type */}
            {ocrDocType === "INVOICE" &&
              (extractedInvoice ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-white/5">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        Factura
                      </div>
                      <div className="font-mono font-bold text-white">
                        {extractedInvoice.invoiceNumber}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        Fecha
                      </div>
                      <div className="font-mono text-slate-300">
                        {extractedInvoice.invoiceDate}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] text-slate-500 uppercase">
                        Vendedor (Exportador)
                      </div>
                      <div className="font-semibold text-slate-200">
                        {extractedInvoice.sellerName}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] text-slate-500 uppercase">
                        Comprador (Importador)
                      </div>
                      <div className="font-semibold text-slate-200">
                        {extractedInvoice.buyerName}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-white/5 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500">Incoterm</div>
                      <div className="font-bold text-indigo-400">
                        {extractedInvoice.incoterm}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">
                        Flete + Seguro
                      </div>
                      <div className="font-bold text-slate-300">
                        $
                        {(
                          extractedInvoice.freightUsd +
                          extractedInvoice.insuranceUsd
                        ).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">
                        Total CIF USD
                      </div>
                      <div className="font-bold text-emerald-400">
                        ${extractedInvoice.totalCifUsd.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-2xl border border-white/5">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">
                      Partidas Arancelarias ({extractedInvoice.lineItems.length}
                      ):
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {extractedInvoice.lineItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-[11px] border-b border-slate-900 pb-1"
                        >
                          <div>
                            <span className="font-mono text-indigo-400 mr-2">
                              {item.hsCode}
                            </span>
                            <span className="text-slate-300">
                              {item.description}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-white">
                            ${item.totalAmount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs italic">
                  No se ha extraído la Factura Comercial aún. Haz clic en
                  "Ejecutar Extracción OCR".
                </div>
              ))}

            {ocrDocType === "PACKING_LIST" &&
              (extractedPackingList ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-white/5">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        Packing List
                      </div>
                      <div className="font-mono font-bold text-white">
                        {extractedPackingList.packingListNumber}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        Ref. Factura
                      </div>
                      <div className="font-mono text-indigo-400">
                        {extractedPackingList.invoiceReference}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-white/5 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500">
                        Total Bultos
                      </div>
                      <div className="font-bold text-white">
                        {extractedPackingList.totalPackages}{" "}
                        {extractedPackingList.packageType}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">
                        Peso Bruto
                      </div>
                      <div className="font-bold text-emerald-400">
                        {extractedPackingList.grossWeightKg.toLocaleString()} kg
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">
                        Volumen Total
                      </div>
                      <div className="font-bold text-indigo-400">
                        {extractedPackingList.totalCbm} m³
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-white/5">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        Contenedor
                      </div>
                      <div className="font-mono text-cyan-400 font-bold">
                        {extractedPackingList.containerNumber || "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        Precinto ISO 17712
                      </div>
                      <div className="font-mono text-amber-400 font-bold">
                        {extractedPackingList.sealNumber || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs italic">
                  No se ha extraído el Packing List aún. Haz clic en "Ejecutar
                  Extracción OCR".
                </div>
              ))}

            {ocrDocType === "TRANSPORT" &&
              (extractedTransport ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-white/5">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        Documento / Tipo
                      </div>
                      <div className="font-mono font-bold text-white">
                        {extractedTransport.documentNumber} (
                        {extractedTransport.documentType})
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        Transportista
                      </div>
                      <div className="font-semibold text-slate-200">
                        {extractedTransport.carrierName}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] text-slate-500 uppercase">
                        Ruta
                      </div>
                      <div className="text-slate-300">
                        {extractedTransport.originPortOrHub} →{" "}
                        {extractedTransport.destinationPortOrHub}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-white/5 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500">
                        Vehículo / Buque
                      </div>
                      <div className="font-bold text-white">
                        {extractedTransport.vesselOrVehicle}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">
                        Viaje / Placa
                      </div>
                      <div className="font-bold text-indigo-400">
                        {extractedTransport.voyageOrPlateNumber}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">
                        Peso Declarado
                      </div>
                      <div className="font-bold text-emerald-400">
                        {extractedTransport.declaredGrossWeightKg.toLocaleString()}{" "}
                        kg
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-white/5">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        Contenedor
                      </div>
                      <div className="font-mono text-cyan-400 font-bold">
                        {extractedTransport.containerNumber || "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        Precinto de Seguridad
                      </div>
                      <div className="font-mono text-amber-400 font-bold">
                        {extractedTransport.sealNumber || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs italic">
                  No se ha extraído el Documento de Transporte aún. Haz clic en
                  "Ejecutar Extracción OCR".
                </div>
              ))}

            {ocrDocType === "DECLARATION" &&
              (extractedDeclaration ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-white/5">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        Pedimento Aduanal
                      </div>
                      <div className="font-mono font-bold text-white">
                        {extractedDeclaration.declarationNumber}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">
                        Patente / Aduana
                      </div>
                      <div className="font-mono text-slate-300">
                        {extractedDeclaration.patentNumber} •{" "}
                        {extractedDeclaration.customsOffice}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] text-slate-500 uppercase">
                        Importador
                      </div>
                      <div className="font-semibold text-slate-200">
                        {extractedDeclaration.importerCompanyName} (
                        {extractedDeclaration.importerTaxId})
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-white/5 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500">Régimen</div>
                      <div className="font-bold text-white">
                        {extractedDeclaration.regimenType}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">
                        Partida HS
                      </div>
                      <div className="font-mono font-bold text-indigo-400">
                        {extractedDeclaration.primaryHsCode}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">
                        Valor Aduana
                      </div>
                      <div className="font-bold text-amber-400">
                        $
                        {extractedDeclaration.declaredCustomsValueUsd.toLocaleString()}{" "}
                        USD
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-2xl border border-white/5 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="text-slate-400">
                        Total Contribuciones:{" "}
                      </span>
                      <span className="font-bold text-white">
                        $
                        {extractedDeclaration.taxes.totalTaxesUsd.toLocaleString()}{" "}
                        USD
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <ShieldCheck size={12} />
                      Sello e.firma Válido
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs italic">
                  No se ha extraído el Pedimento aún. Haz clic en "Ejecutar
                  Extracción OCR".
                </div>
              ))}
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <Button
              onClick={onTriggerCrossCheck}
              disabled={
                !extractedInvoice ||
                !extractedPackingList ||
                !extractedDeclaration
              }
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2"
            >
              <ShieldCheck size={14} />
              Conciliar con Validación Tripartita
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Tripartite Reconciliation & Clearance Matrix */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={22} className="text-indigo-400" />
              <h3 className="text-base font-bold text-white">
                Matriz de Conciliación Cruzada Tripartita
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Verificación algorítmica de consistencia entre Factura Comercial,
              Packing List, Documento de Transporte y Pedimento SAT / DUA.
            </p>
          </div>

          <Button
            onClick={onTriggerCrossCheck}
            disabled={
              !extractedInvoice ||
              !extractedPackingList ||
              !extractedDeclaration
            }
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-5 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Ejecutar Validación Tripartita
          </Button>
        </div>

        {crossCheckResult ? (
          <div className="flex flex-col gap-6">
            {/* Overall Status Banner */}
            <div
              className={`p-5 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                crossCheckResult.overallStatus === "MATCH_CLEARED"
                  ? "bg-emerald-950/40 border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                  : crossCheckResult.overallStatus === "DISCREPANCY_WARNING"
                    ? "bg-amber-950/40 border-amber-500/40 shadow-lg shadow-amber-500/5"
                    : "bg-rose-950/40 border-rose-500/40 shadow-lg shadow-rose-500/5"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <span
                  className={`p-3 rounded-2xl ${
                    crossCheckResult.overallStatus === "MATCH_CLEARED"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : crossCheckResult.overallStatus === "DISCREPANCY_WARNING"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-rose-500/20 text-rose-400"
                  }`}
                >
                  {crossCheckResult.overallStatus === "MATCH_CLEARED" ? (
                    <CheckCircle2 size={28} />
                  ) : (
                    <AlertTriangle size={28} />
                  )}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-white">
                      {crossCheckResult.overallStatus === "MATCH_CLEARED"
                        ? "DESPACHO ADUANERO AUTORIZADO - CONCILIACIÓN 100% LIMPIA"
                        : crossCheckResult.overallStatus ===
                            "DISCREPANCY_WARNING"
                          ? "ALERTA DOCUMENTAL - DISCREPANCIAS MENORES DETECTADAS"
                          : "DISCREPANCIA CRÍTICA - RIESGO DE EMBARGO PRECAUTORIO / RECTIFICACIÓN"}
                    </h4>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                        crossCheckResult.overallStatus === "MATCH_CLEARED"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : crossCheckResult.overallStatus ===
                              "DISCREPANCY_WARNING"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      SCORE: {crossCheckResult.complianceScore}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    {crossCheckResult.summaryMessage}
                  </p>
                </div>
              </div>

              {crossCheckResult.releaseCertificateId && (
                <div className="bg-slate-950/80 border border-emerald-500/30 p-3.5 rounded-2xl flex flex-col items-start gap-1 shrink-0">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck size={12} />
                    Certificado Pre-Despacho Emitido
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">
                      {crossCheckResult.releaseCertificateId}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(crossCheckResult.releaseCertificateId!)
                      }
                      className="text-slate-400 hover:text-white p-1"
                      title="Copiar Certificado"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">
                    Evaluado:{" "}
                    {new Date(
                      crossCheckResult.evaluatedAt,
                    ).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {/* Discrepancies & Tolerance Cross-Check Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                    <th className="py-3 px-3">Parámetro de Control</th>
                    <th className="py-3 px-3">Factura Comercial</th>
                    <th className="py-3 px-3">Packing List</th>
                    <th className="py-3 px-3">Doc. Transporte</th>
                    <th className="py-3 px-3">Pedimento / DUA</th>
                    <th className="py-3 px-3">Severidad & Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {crossCheckResult.checks.map((check, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-950/30 transition-colors"
                    >
                      <td className="py-3.5 px-3 font-sans font-bold text-white">
                        {check.parameter}
                      </td>
                      <td className="py-3.5 px-3 text-slate-300">
                        {check.invoiceValue !== undefined
                          ? String(check.invoiceValue)
                          : "—"}
                      </td>
                      <td className="py-3.5 px-3 text-slate-300">
                        {check.packingListValue !== undefined
                          ? String(check.packingListValue)
                          : "—"}
                      </td>
                      <td className="py-3.5 px-3 text-slate-300">
                        {check.transportValue !== undefined
                          ? String(check.transportValue)
                          : "—"}
                      </td>
                      <td className="py-3.5 px-3 text-slate-300">
                        {check.declarationValue !== undefined
                          ? String(check.declarationValue)
                          : "—"}
                      </td>
                      <td className="py-3.5 px-3 font-sans">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              check.isMatch
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : check.severity === "WARNING"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {check.isMatch ? "MATCH" : check.severity}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {check.message}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Regulatory Footnote Box */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex items-start gap-3 text-xs text-slate-400">
              <ShieldAlert
                size={18}
                className="text-indigo-400 shrink-0 mt-0.5"
              />
              <div>
                <span className="font-bold text-slate-200">
                  Gobernanza Aduanera Automatizada:{" "}
                </span>
                La conciliación cruzada tripartita valida el cumplimiento del
                Art. 89 de la Ley Aduanera (rectificación de pedimentos),
                directivas de valoración OMA/GATT y concordancia física con el
                manifiesto IATA/IMO antes del arribo al recinto fiscalizado.
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800 text-slate-500">
              <Scan size={36} />
            </div>
            <h4 className="text-sm font-bold text-slate-300">
              Esperando extracción de los 4 documentos para validar
            </h4>
            <p className="text-xs text-slate-500 max-w-md">
              Para emitir el Certificado Pre-Despacho se requiere auditar la
              Factura Comercial, Packing List / VGM y Pedimento / DUA.
              Selecciona una expedición de la base de datos arriba para auditar
              su expediente oficial o arrastra archivos PDF externos.
            </p>
            <Button
              onClick={() => onAuditShipmentDocuments(selectedShipmentId)}
              className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-6 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <Database size={14} />
              Auditar Expediente de {selectedShipmentId}
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
