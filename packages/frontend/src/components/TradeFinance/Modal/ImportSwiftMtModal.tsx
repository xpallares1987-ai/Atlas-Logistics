/**
 * @file ImportSwiftMtModal.tsx
 * @description Modal for parsing and ingesting raw SWIFT FIN messages (MT700 Issue of Documentary Credit / MT760 Demand Guarantee).
 * @module @atlas/frontend/components/TradeFinance/Modal/ImportSwiftMtModal
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React, { useState } from "react";
import {
  X,
  FileCode2,
  AlertTriangle,
  Upload,
  Loader2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { ParsedSwiftMtResult } from "../../../types/trade-finance.types";

export interface ImportSwiftMtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestSuccess: (instrumentId: string, reference: string) => void;
}

export const ImportSwiftMtModal: React.FC<ImportSwiftMtModalProps> = ({
  isOpen,
  onClose,
  onIngestSuccess,
}) => {
  const [rawText, setRawText] = useState("");
  const [forceUpdate, setForceUpdate] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedSwiftMtResult | null>(
    null,
  );

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setParseError(null);
    setIngestError(null);
    try {
      const res = await fetch("/api/trade-finance/messages/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawMessage: rawText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(
          data.message || data.error || "Error al parsear mensaje SWIFT",
        );
        setParsedResult(null);
      } else {
        setParsedResult(data);
      }
    } catch (err: unknown) {
      setParseError((err as Error).message);
      setParsedResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleIngest = async () => {
    if (!rawText.trim()) return;
    setIsIngesting(true);
    setIngestError(null);
    try {
      const res = await fetch(
        "/api/trade-finance/instruments/ingest-swift-mt",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawMessage: rawText, forceUpdate }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setIngestError(
          data.message || data.error || "Error al registrar instrumento SWIFT",
        );
      } else {
        onIngestSuccess(data.instrumentId, data.instrumentReference);
        onClose();
      }
    } catch (err: unknown) {
      setIngestError((err as Error).message);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleLoadSampleMt700 = () => {
    const sample = `{1:F01DBSSSGSGXXXX0000000000}{2:I700BSCHESMMXXXXN}{4:
:27:1/1
:40A:IRREVOCABLE
:20:LC-2026-INBOUND-SAMPLE
:31C:260901
:40E:UCP LATEST VERSION
:31D:261215MADRID COUNTERS
:50:IBERIAN TECH SOLUTIONS SL
:59:SINGAPORE ADVANCED ROBOTICS PTE
:32B:EUR340000,00
:39A:05/05
:41A:BSCHESMMXXX BY PAYMENT
:42C:AT SIGHT
:43P:NOT ALLOWED
:43T:NOT ALLOWED
:44E:ESBCN
:44F:SGSIN
:44C:261130
:45A:INDUSTRIAL AUTOMATION SYSTEMS & SENSORS
:46A:1. SIGNED COMMERCIAL INVOICE IN 3 ORIGINALS
2. FULL SET CLEAN ON BOARD OCEAN BILLS OF LADING
3. CERTIFICATE OF ORIGIN
:47A:+ ALL DOCUMENTS IN ENGLISH
:49:CONFIRM
-}`;
    setRawText(sample);
    setParseError(null);
    setIngestError(null);
    setParsedResult(null);
  };

  const handleLoadSampleMt760 = () => {
    const sample = `{1:F01BSCHESMMXXXX0000000000}{2:I760DBSSSGSGXXXXN}{4:
:27:1/1
:20:BG-2026-URDG-SAMPLE
:22A:ISSUE
:22D:PERFORMANCE_BOND
:23X:URDG LATEST VERSION
:30:260910
:31E:270910
:32B:EUR450000,00
:50:CATALAN HARBOR BUILDERS SA
:59:PORT AUTHORITY OF BARCELONA
:23B:CONTRACT-TERMINAL-PIER-5
:77U:IRREVOCABLE PERFORMANCE GUARANTEE PAYABLE UPON FIRST DEMAND UNDER URDG 758
-}`;
    setRawText(sample);
    setParseError(null);
    setIngestError(null);
    setParsedResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Importar Mensaje SWIFT FIN
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                  MT700 / MT760
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Parseo e ingesta de Créditos Documentarios (UCP 600) y Garantías
                a Primer Requerimiento (URDG 758)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Samples */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Cargar mensaje de prueba:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleLoadSampleMt700}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 font-medium transition-all"
              >
                Ejemplo MT700 (L/C)
              </button>
              <button
                type="button"
                onClick={handleLoadSampleMt760}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700 font-medium transition-all"
              >
                Ejemplo MT760 (Garantía)
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Texto SWIFT FIN (Bloques 1, 2 y 4 con etiquetas :20:, :32B:, etc.)
            </label>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setParseError(null);
                setIngestError(null);
              }}
              placeholder="{1:F01...}{2:I700...}{4:&#10;:20:LC-2026-EXAMPLE&#10;:32B:EUR250000,00&#10;...&#10;-}"
              className="w-full bg-slate-950 font-mono text-xs text-slate-200 p-3.5 rounded-2xl border border-slate-800 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                id="forceUpdateCheck"
                checked={forceUpdate}
                onChange={(e) => setForceUpdate(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
              />
              <label htmlFor="forceUpdateCheck" className="cursor-pointer">
                Sobrescribir si la referencia ya existe (forceUpdate)
              </label>
            </div>
            <button
              type="button"
              onClick={handleParse}
              disabled={isParsing || !rawText.trim()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/20 font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isParsing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Analizar Estructura
            </button>
          </div>

          {/* Errors */}
          {parseError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error al parsear mensaje SWIFT</p>
                <p className="text-[11px] opacity-90">{parseError}</p>
              </div>
            </div>
          )}

          {ingestError && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error de Ingesta</p>
                <p className="text-[11px] opacity-90">{ingestError}</p>
              </div>
            </div>
          )}

          {/* Parsed Preview Card */}
          {parsedResult && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Estructura Identificada: {parsedResult.messageType}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">
                  VALIDADO
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-slate-500 text-[10px]">Referencia</p>
                  <p className="font-mono font-semibold text-white">
                    {parsedResult.instrumentReference}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px]">Importe</p>
                  <p className="font-semibold text-emerald-400">
                    {parsedResult.currency}{" "}
                    {(parsedResult.messageType === "MT700"
                      ? parsedResult.creditAmount
                      : parsedResult.guaranteeAmount
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px]">
                    Reglas Aplicables
                  </p>
                  <p className="font-semibold text-blue-300">
                    {parsedResult.applicableRules}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px]">Vencimiento</p>
                  <p className="font-semibold text-slate-300">
                    {parsedResult.expiryDate}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 text-[10px]">
                    Ordenante (Applicant)
                  </p>
                  <p className="font-semibold text-slate-200 truncate">
                    {parsedResult.applicantName}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 text-[10px]">Beneficiario</p>
                  <p className="font-semibold text-slate-200 truncate">
                    {parsedResult.beneficiaryName}
                  </p>
                </div>
              </div>

              {parsedResult.messageType === "MT700" && (
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <p>
                    <span className="text-slate-500">
                      Documentos Requeridos:
                    </span>{" "}
                    {parsedResult.requiredDocumentsSummary.length} documentos
                  </p>
                  <p>
                    <span className="text-slate-500">Puertos:</span>{" "}
                    {parsedResult.portOfLoading} &rarr;{" "}
                    {parsedResult.portOfDischarge} (Último embarque:{" "}
                    {parsedResult.latestShipmentDate})
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleIngest}
            disabled={isIngesting || !rawText.trim()}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {isIngesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Ingestar en Tesorería
          </button>
        </div>
      </div>
    </div>
  );
};
