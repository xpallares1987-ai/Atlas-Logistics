import React from "react";
import { Sparkles, FileText, Send, Download, Package } from "lucide-react";
import { Button } from "@atlas/ui";
import { generateEDI304ShippingInstruction } from "@atlas/shared";
import type { BookingSiStudioTabProps } from "../../types/booking-management.types";

export const BookingSiStudioTab: React.FC<BookingSiStudioTabProps> = ({
  activeBooking,
  oceanBookingDetail,
  dcsaAiAudit,
  setDcsaAiAudit,
  isCheckingDcsaAi,
  onRunDcsaCustomsCheck,
  extractedDocAi,
  setExtractedDocAi,
  isExtractingDocAi,
  onRunMultimodalExtract,
  onConfirmDcsSi,
  isSubmittingDcsSi,
  onGenerateOfficialDraftBl,
  isGeneratingDraftBl,
  onDownloadDraftBL,
  copiedEdi,
  onCopyEdi,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Columns: SI Form & Manifest */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Instrucciones de Embarque (Shipping Instructions)
            </h2>
            <p className="text-xs text-slate-400">
              Booking:{" "}
              <span className="font-mono text-blue-400">
                {activeBooking.bookingNumber}
              </span>{" "}
              | Naviera: <strong>{activeBooking.rateLock.carrierName}</strong>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={onRunDcsaCustomsCheck}
              disabled={isCheckingDcsaAi}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isCheckingDcsaAi
                ? "Clasificando HS/CBAM..."
                : "✨ Pre-Validar SI & HS/CBAM (Flash-Lite)"}
            </Button>
            <Button
              size="sm"
              onClick={onRunMultimodalExtract}
              disabled={isExtractingDocAi}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              {isExtractingDocAi
                ? "Extrayendo..."
                : "📄 Extraer Packing List (Multimodal IA)"}
            </Button>
            <Button
              size="sm"
              onClick={onConfirmDcsSi}
              disabled={
                isSubmittingDcsSi ||
                oceanBookingDetail?.siStatus === "CONFIRMED"
              }
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmittingDcsSi
                ? "Emitiendo..."
                : oceanBookingDetail?.siStatus === "CONFIRMED"
                  ? "SI Confirmadas"
                  : "Emitir Instrucciones DCSA SI"}
            </Button>
            <Button
              size="sm"
              onClick={onGenerateOfficialDraftBl}
              disabled={
                isGeneratingDraftBl ||
                oceanBookingDetail?.draftBlStatus === "ISSUED"
              }
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              {isGeneratingDraftBl
                ? "Generando..."
                : oceanBookingDetail?.draftBlStatus === "ISSUED"
                  ? "B/L Oficial Emitido"
                  : "Generar Borrador B/L Oficial"}
            </Button>
            <Button
              size="sm"
              onClick={onDownloadDraftBL}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar Draft B/L (PDF)
            </Button>
          </div>
        </div>

        {dcsaAiAudit && (
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-white">
                  Dictamen DCSA v3.0 & Clasificación Arancelaria HS / CBAM
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 font-mono text-[10px]">
                  {dcsaAiAudit.source} · {dcsaAiAudit.model}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-slate-300">
                <span>{dcsaAiAudit.latencyMs}ms</span>
                <span>RPM Libre: {dcsaAiAudit.quotaRemainingRpm}/15</span>
                <button
                  type="button"
                  onClick={() => setDcsaAiAudit(null)}
                  className="text-slate-400 hover:text-white underline font-sans"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400">HS Code Sugerido:</div>
                <div className="font-mono font-bold text-emerald-400 text-sm">
                  {dcsaAiAudit.audit.suggestedHsCode}
                </div>
                <div className="text-slate-300 mt-0.5">
                  {dcsaAiAudit.audit.hsDescription}
                </div>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400">
                  Sujeción EU CBAM (2023/956):
                </div>
                <div className="font-bold text-amber-300">
                  {dcsaAiAudit.audit.cbamApplicable
                    ? "SÍ — Sujeto a Reporte CBAM"
                    : "Exento"}
                </div>
                <div className="text-slate-300 mt-0.5">
                  {dcsaAiAudit.audit.cbamCategory}
                </div>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400">Estado DCSA SI:</div>
                <div className="font-mono font-bold text-cyan-300">
                  {dcsaAiAudit.audit.dcsaValidationStatus}
                </div>
                <ul className="list-disc list-inside text-slate-300 mt-1 space-y-0.5">
                  {dcsaAiAudit.audit.complianceRecommendations.map(
                    (r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {extractedDocAi && (
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white">
                  Extracción Multimodal de Manifiesto / Packing List
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 font-mono text-[10px]">
                  {extractedDocAi.source} · {extractedDocAi.model}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExtractedDocAi(null)}
                className="text-slate-400 hover:text-white underline text-[11px]"
              >
                Cerrar
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px]">
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block">Contenedor:</span>
                <strong className="text-white">
                  {extractedDocAi.extracted.containerNumber}
                </strong>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block">
                  Peso Bruto / Bultos:
                </span>
                <strong className="text-emerald-400">
                  {extractedDocAi.extracted.grossWeightKg.toLocaleString()} kg (
                  {extractedDocAi.extracted.packageCount} plts)
                </strong>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block">
                  Valor Factura / Incoterm:
                </span>
                <strong className="text-amber-300">
                  ${extractedDocAi.extracted.invoiceAmountUsd.toLocaleString()}{" "}
                  {extractedDocAi.extracted.currency} (
                  {extractedDocAi.extracted.incoterm})
                </strong>
              </div>
              <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block">HS Code Detectado:</span>
                <strong className="text-cyan-300">
                  {extractedDocAi.extracted.suggestedHsCode}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Parties Details Card */}
        <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">
                Shipper / Exportador
              </label>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-slate-200">
                {activeBooking.shippingInstructions?.shipperName ||
                  "Atlas Logistics Enterprise Group"}
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {activeBooking.shippingInstructions?.shipperAddress ||
                    "Zaragoza / Barcelona Logistics Park"}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium">
                Consignee / Importador
              </label>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-slate-200">
                {activeBooking.shippingInstructions?.consigneeName ||
                  "Apex High-Tech Logistics Inc"}
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {activeBooking.shippingInstructions?.consigneeAddress ||
                    "Port of Los Angeles Gate 3"}
                </div>
              </div>
            </div>
          </div>

          {/* Canonical B/L Party Boxes Preview */}
          {activeBooking.blPartiesSnapshot && (
            <div className="pt-2 border-t border-slate-700/60">
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Casillas Canónicas B/L (BIMCO / FIATA / DCSA eBL)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 text-slate-300">
                  <div className="text-[10px] text-indigo-400 uppercase font-sans font-bold mb-1">
                    1. Shipper / Exporter
                  </div>
                  <div className="whitespace-pre leading-relaxed">
                    {activeBooking.blPartiesSnapshot.shipper?.rawBlock || "N/A"}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 text-slate-300">
                  <div className="text-[10px] text-blue-400 uppercase font-sans font-bold mb-1">
                    2. Consignee {activeBooking.isToOrder ? "(TO ORDER)" : ""}
                  </div>
                  <div className="whitespace-pre leading-relaxed">
                    {activeBooking.blPartiesSnapshot.consignee?.rawBlock ||
                      "N/A"}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 text-slate-300">
                  <div className="text-[10px] text-purple-400 uppercase font-sans font-bold mb-1">
                    3. Notify Party
                  </div>
                  <div className="whitespace-pre leading-relaxed">
                    {activeBooking.blPartiesSnapshot.notify?.rawBlock || "N/A"}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 text-slate-300">
                  <div className="text-[10px] text-emerald-400 uppercase font-sans font-bold mb-1">
                    4. Delivery / Discharge Agent
                  </div>
                  <div className="whitespace-pre leading-relaxed">
                    {activeBooking.blPartiesSnapshot.agent?.rawBlock || "N/A"}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-slate-400 font-medium">
                Tipo de Conocimiento (B/L Type)
              </label>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white font-semibold">
                {activeBooking.shippingInstructions?.blType || "WAYBILL"}{" "}
                (Express Sea Waybill)
              </div>
            </div>
            <div>
              <label className="text-slate-400 font-medium">
                Condición de Flete
              </label>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-emerald-400 font-semibold">
                {activeBooking.shippingInstructions?.freightPaymentTerm ||
                  "PREPAID"}
              </div>
            </div>
            <div>
              <label className="text-slate-400 font-medium">
                Lugar de Emisión
              </label>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white">
                {activeBooking.shippingInstructions?.placeOfIssue ||
                  activeBooking.originPort}
              </div>
            </div>
          </div>
        </div>

        {/* Container List */}
        <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-3">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-400" />
            Contenedores, Precintos y Masa Bruta Verificada (VGM)
          </h3>

          <div className="space-y-2">
            {(activeBooking.shippingInstructions?.containerDetails || []).map(
              (cont, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-900 border border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-white text-sm">
                      {cont.containerNumber}
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Precinto:{" "}
                      <strong className="font-mono text-slate-200">
                        {cont.sealNumber}
                      </strong>
                    </div>
                  </div>
                  <div className="font-mono">
                    <div className="text-emerald-400 font-bold">
                      {cont.verifiedGrossMassKg.toLocaleString()} kg VGM
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Tara: {cont.tareWeightKg} kg
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-200">
                      {cont.packagesCount} {cont.packageType}
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      HS: {cont.hsCode}
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Right Column: EDI 304 Transaction Payload Viewer */}
      <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4 h-fit">
        <div className="flex items-center justify-between pb-2 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">
              EDI 304 Transmisión ANSI X12
            </h3>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (activeBooking.shippingInstructions) {
                onCopyEdi(
                  generateEDI304ShippingInstruction(
                    activeBooking.shippingInstructions,
                  ),
                );
              }
            }}
            className="text-xs"
          >
            {copiedEdi ? "Copiado!" : "Copiar"}
          </Button>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-950 font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto whitespace-pre leading-relaxed border border-slate-800">
          {activeBooking.shippingInstructions
            ? generateEDI304ShippingInstruction(
                activeBooking.shippingInstructions,
              )
            : "Generando transacción EDI 304..."}
        </div>

        <div className="space-y-2">
          <Button
            onClick={onConfirmDcsSi}
            disabled={
              isSubmittingDcsSi || oceanBookingDetail?.siStatus === "CONFIRMED"
            }
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 flex items-center justify-center gap-2 text-xs"
          >
            <Send className="w-4 h-4" />
            {isSubmittingDcsSi
              ? "Transmitiendo DCSA SI a Naviera..."
              : oceanBookingDetail?.siStatus === "CONFIRMED"
                ? "Instrucciones DCSA SI Confirmadas (SQLite)"
                : "Transmitir Instrucciones DCSA SI (SQLite)"}
          </Button>

          <Button
            onClick={onGenerateOfficialDraftBl}
            disabled={
              isGeneratingDraftBl ||
              oceanBookingDetail?.draftBlStatus === "ISSUED"
            }
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 flex items-center justify-center gap-2 text-xs"
          >
            <FileText className="w-4 h-4" />
            {isGeneratingDraftBl
              ? "Generando Borrador B/L..."
              : oceanBookingDetail?.draftBlStatus === "ISSUED"
                ? "Borrador B/L Oficial Emitido (SQLite)"
                : "Generar Borrador B/L Oficial (SQLite)"}
          </Button>
        </div>
      </div>
    </div>
  );
};
