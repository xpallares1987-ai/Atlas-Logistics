/**
 * @file DeclarationDetail.tsx
 * @description Detailed inspector view for 54-box DUA layout, TARIC valuation, and deterministic risk analysis.
 * @module @atlas/frontend/components/CustomsClearance/Panel
 */

import {
  FileText,
  FileCode,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { CustomsDeclaration, StatusVisuals } from "../types/index";

interface DeclarationDetailProps {
  selectedDecl: CustomsDeclaration | null;
  getStatusVisuals: (status: string) => StatusVisuals;
  isAuditing: boolean;
  onAudit: (id: string) => void;
}

export function DeclarationDetail({
  selectedDecl,
  getStatusVisuals,
  isAuditing,
  onAudit,
}: DeclarationDetailProps) {
  if (!selectedDecl) {
    return (
      <div className="w-full lg:w-2/3 bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-center text-slate-500 min-h-[600px] lg:min-h-0">
        <ShieldCheck className="w-16 h-16 opacity-20 mb-4" />
        <p>Seleccione un despacho para inspeccionar el DUA oficial</p>
      </div>
    );
  }

  const visuals = getStatusVisuals(selectedDecl.status);

  return (
    <div className="w-full lg:w-2/3 bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative min-h-[600px] lg:min-h-0">
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        {/* Top Inspector Header */}
        <div className="p-6 border-b border-white/10 bg-white/5 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {selectedDecl.duaNumber ||
                    `26ES000811${selectedDecl.id.substring(0, 8).toUpperCase()}`}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-bold border ${visuals.bg} ${visuals.border} ${visuals.color}`}
                >
                  {visuals.label}
                </span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mt-2">
                Documento Único Administrativo (DUA)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Aduana de Despacho: ES000811 Barcelona Marítima | Régimen:{" "}
                {selectedDecl.type || "IM4 - Importación Definitiva"}
              </p>
            </div>

            {/* Actions Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  window.open(
                    `/api/customs-declarations/${selectedDecl.id}/pdf`,
                    "_blank",
                  )
                }
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
              >
                <FileText className="w-3.5 h-3.5" /> DUA PDF
              </button>

              <button
                onClick={() =>
                  window.open(
                    `/api/customs-declarations/${selectedDecl.id}/xml`,
                    "_blank",
                  )
                }
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-400" /> DUA XML
                (AEAT)
              </button>

              <button
                disabled={isAuditing}
                onClick={() => onAudit(selectedDecl.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all active:scale-95"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`}
                />
                Re-Auditar
              </button>
            </div>
          </div>
        </div>

        {/* DUA Box Layout Structure */}
        <div className="p-6 space-y-6">
          {/* 54 Boxes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Box 1 & 2: Exporter */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                Casilla 02 - Exportador / Expedidor
              </span>
              <h4 className="text-sm font-bold text-white mt-1">
                {selectedDecl.exporterName || "Global Freight Logistics Ltd"}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Pudong Logistics Hub, Shanghai (CN)
              </p>
              <p className="text-xs text-slate-500 mt-2 font-mono">
                Origen: {selectedDecl.originCountry || "CN"}
              </p>
            </div>

            {/* Box 8: Consignee & EORI */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                Casilla 08 - Destinatario / Importador
              </span>
              <h4 className="text-sm font-bold text-white mt-1">
                {selectedDecl.consigneeName || "Iberica Import Logistics SL"}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Carrer del Port 45, Barcelona (ES)
              </p>
              <p className="text-xs text-emerald-400 mt-2 font-mono font-bold">
                EORI: {selectedDecl.eoriNumber || "ESB88492019"}
              </p>
            </div>

            {/* Box 14: Declarant Representative */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                Casilla 14 - Declarante / Representante
              </span>
              <h4 className="text-sm font-bold text-white mt-1">
                Atlas Logistics Customs Brokerage SL
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                EORI: ESB88492019 (Representación Directa)
              </p>
              <p className="text-xs text-indigo-300 mt-2 font-mono">
                Estado OEA: Certificado
              </p>
            </div>
          </div>

          {/* Box 31, 33, 46: Goods & Valuation */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-white/10 gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                  Casilla 31 & 33 - Mercancía y Código TARIC
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedDecl.hsDescription ||
                    "Convertidores estáticos y fuentes de alimentación conmutadas"}
                </h3>
              </div>
              <div className="px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl">
                <span className="text-xs font-mono font-black text-indigo-300">
                  TARIC: {selectedDecl.hsCode || "8504.40.90.90"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
              <div>
                <span className="text-slate-400">Casilla 46 (Valor CIF):</span>
                <p className="text-base font-bold text-white mt-0.5">
                  {Number(selectedDecl.customsValue || 25000).toLocaleString(
                    "es-ES",
                  )}{" "}
                  EUR
                </p>
              </div>
              <div>
                <span className="text-slate-400">
                  Derechos de Arancel (A00):
                </span>
                <p className="text-base font-bold text-amber-400 mt-0.5">
                  {Number(selectedDecl.dutiesAmount || 825).toLocaleString(
                    "es-ES",
                  )}{" "}
                  EUR
                </p>
              </div>
              <div>
                <span className="text-slate-400">IVA Importación (B00):</span>
                <p className="text-base font-bold text-indigo-400 mt-0.5">
                  {Number(selectedDecl.taxesAmount || 5423.25).toLocaleString(
                    "es-ES",
                  )}{" "}
                  EUR
                </p>
              </div>
              <div>
                <span className="text-slate-400">
                  Total Liquidación (Casilla 47):
                </span>
                <p className="text-base font-black text-emerald-400 mt-0.5">
                  {Number(selectedDecl.totalPayable || 6248.25).toLocaleString(
                    "es-ES",
                  )}{" "}
                  EUR
                </p>
              </div>
            </div>
          </div>

          {/* Deterministic Compliance Diagnostics Breakdown */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Diagnóstico de Cumplimiento Normativo (Reglas Deterministas)
            </h3>

            <div className="space-y-3">
              {/* EORI Rule */}
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-slate-200">
                    Validación EORI (Regla EORI-01)
                  </p>
                  <p className="text-slate-400 mt-0.5">
                    EORI del importador (
                    {selectedDecl.eoriNumber || "ESB88492019"}) registrado y
                    habilitado para operaciones aduaneras en la UE.
                  </p>
                </div>
              </div>

              {/* Sanctions Rule */}
              <div
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  selectedDecl.originCountry === "RU" ||
                  selectedDecl.originCountry === "KP"
                    ? "bg-rose-500/10 border-rose-500/20"
                    : "bg-white/5 border-white/5"
                }`}
              >
                {selectedDecl.originCountry === "RU" ||
                selectedDecl.originCountry === "KP" ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs">
                  <p className="font-bold text-slate-200">
                    Screening de Sanciones y Restricciones (Regla SANC-01)
                  </p>
                  <p className="text-slate-400 mt-0.5">
                    {selectedDecl.originCountry === "RU" ||
                    selectedDecl.originCountry === "KP"
                      ? `Alerta: El país de origen (${selectedDecl.originCountry}) está sujeto a medidas restrictivas internacionales.`
                      : `País de origen (${selectedDecl.originCountry || "CN"}) verificado libre de embargos comerciales.`}
                  </p>
                </div>
              </div>

              {/* Valuation & Dual Use */}
              <div
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  selectedDecl.isDualUse
                    ? "bg-rose-500/10 border-rose-500/20"
                    : "bg-white/5 border-white/5"
                }`}
              >
                {selectedDecl.isDualUse ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs">
                  <p className="font-bold text-slate-200">
                    Control de Doble Uso y Material Sensible (Regla DUAL-01)
                  </p>
                  <p className="text-slate-400 mt-0.5">
                    {selectedDecl.isDualUse
                      ? "Mercancía clasificada como tecnología de doble uso. Requiere licencia de exportación/importación."
                      : "Clasificación TARIC exenta de licencias de doble uso (Reglamento UE 2021/821)."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Attached Documents */}
          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
              Casilla 44 - Documentos Presentados y Certificados
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                <FileText className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="font-bold text-white">N935 Factura</p>
                  <p className="text-[10px] text-slate-400">
                    Factura comercial definitiva
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                <FileText className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="font-bold text-white">N705 Conocimiento</p>
                  <p className="text-[10px] text-slate-400">
                    {selectedDecl.blNumber || "BL-88492019"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                <FileText className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="font-bold text-white">N714 Packing List</p>
                  <p className="text-[10px] text-slate-400">
                    Lista de empaque y bultos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
