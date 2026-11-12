/**
 * @file DdSuspension.tsx
 * @description FMC/OSRA D&D Free-Time Suspension certificate generator form and cryptographic dossier tab.
 * @module @atlas/frontend/components/PortCongestion/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button } from "@atlas/ui";
import {
  Check,
  Copy,
  Download,
  FileCheck,
  FileText,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import type { DdSuspensionTabProps } from "../../../types/port-congestion.types";

export function DdSuspension({
  certForm,
  setCertForm,
  certificates,
  copiedHash,
  onGenerateCertificate,
  onDownloadPDF,
  onCopyHash,
}: DdSuspensionTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Certificate Generator Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm text-white">
            Generar Certificación de Suspensión D&D
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Emite certificados válidos ante la FMC (46 CFR Part 541 / OSRA 2022)
          para paralizar el reloj de días libres durante congestiones
          portuarias.
        </p>

        <form onSubmit={onGenerateCertificate} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">
              Puerto de Escala
            </label>
            <select
              value={certForm.portCode}
              onChange={(e) =>
                setCertForm({ ...certForm, portCode: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ESBCN">Port de Barcelona (ESBCN)</option>
              <option value="ESVLC">Port de València (ESVLC)</option>
              <option value="ESALG">Puerto de Algeciras (ESALG)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              Terminal de Muelle
            </label>
            <input
              type="text"
              value={certForm.terminalName}
              onChange={(e) =>
                setCertForm({ ...certForm, terminalName: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Buque Afectado</label>
            <input
              type="text"
              value={certForm.vesselName}
              onChange={(e) =>
                setCertForm({ ...certForm, vesselName: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              Matrícula Contenedor ISO
            </label>
            <input
              type="text"
              value={certForm.containerNo}
              onChange={(e) =>
                setCertForm({ ...certForm, containerNo: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              Causa de Congestión Telemétrica
            </label>
            <select
              value={certForm.reason}
              onChange={(e) =>
                setCertForm({ ...certForm, reason: e.target.value as any })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="PORT_CONGESTION_ANCHORAGE_DWELL">
                Paralización en Fondeo Exterior (&gt;24h)
              </option>
              <option value="BERTH_COLLISION_DELAY">
                Solapamiento y Retraso de Atraque en Muelle
              </option>
              <option value="TERMINAL_GATE_APPOINTMENT_UNAVAILABLE">
                Puerta Inaccesible / Sin Ventanas de Cita
              </option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              Horas de Paralización Verificadas
            </label>
            <input
              type="number"
              step="0.5"
              value={certForm.dwellOrDelayHours}
              onChange={(e) =>
                setCertForm({
                  ...certForm,
                  dwellOrDelayHours: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              Autoridad Emisora Oficial
            </label>
            <input
              type="text"
              value={certForm.issuer}
              disabled
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-slate-400 font-mono text-[11px]"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 mt-2"
          >
            <FileCheck className="w-4 h-4" />
            <span>Firmar Digitalmente & Expedir Certificado</span>
          </Button>
        </form>
      </div>

      {/* Certificate Dossier List */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>
              Certificados Emitidos & Sellos Criptográficos (
              {certificates.length})
            </span>
          </h3>
        </div>

        <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
          {certificates.map((cert) => (
            <div
              key={cert.certificateId}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-2">
                <div>
                  <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                    {cert.certificateId}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-1">
                    Contenedor: {cert.containerNo} · {cert.vesselName} (
                    {cert.portName})
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => onDownloadPDF(cert)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>PDF Oficial</span>
                  </Button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {cert.legalNoticeText}
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 font-mono pt-1">
                <div className="flex items-center gap-2">
                  <QrCode className="w-3.5 h-3.5 text-slate-400" />
                  <span>{cert.qrCodeDigest}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">
                    {cert.digitalSignatureHash}
                  </span>
                  <button
                    onClick={() => onCopyHash(cert.digitalSignatureHash)}
                    className="hover:text-white"
                    title="Copiar Hash"
                  >
                    {copiedHash ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default DdSuspension;
