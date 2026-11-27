/**
 * @file BlockchainLedger.tsx
 * @description Visualizer for the cryptographic SHA-256 Book-and-Claim Mass Balance Blockchain Ledger.
 * Displays genesis blocks, tamper-evident hash links, verification status, and interactive allocation retirement certificates.
 * @module @atlas/frontend/components/CarbonInsetting/Tab
 * @see {@link docs/adr/0017-fueleu-maritime-ets-carbon-insetting.md}
 */

import { useState, useEffect, useRef } from "react";
import {
  Link2,
  ShieldCheck,
  ShieldAlert,
  QrCode,
  Download,
  ExternalLink,
  RefreshCw,
  Award,
} from "lucide-react";
import { Button } from "@atlas/ui";
import type {
  InsettingAllocationRecord,
  BlockchainVerificationReport,
} from "../types/index";
import { QrCanvasService } from "../../../services/qr-canvas.service";

export interface BlockchainLedgerProps {
  allocations: InsettingAllocationRecord[];
  verificationReport: BlockchainVerificationReport | null;
  onVerifyLedger: () => void;
  onDownloadAllocationPDF: (alloc: InsettingAllocationRecord) => void;
}

export function BlockchainLedger({
  allocations,
  verificationReport,
  onVerifyLedger,
  onDownloadAllocationPDF,
}: BlockchainLedgerProps) {
  const [selectedAllocation, setSelectedAllocation] =
    useState<InsettingAllocationRecord | null>(allocations[0] || null);

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (allocations.length > 0 && !selectedAllocation) {
      setSelectedAllocation(allocations[0]);
    }
  }, [allocations, selectedAllocation]);

  useEffect(() => {
    if (selectedAllocation && qrCanvasRef.current) {
      void QrCanvasService.renderToCanvas(
        qrCanvasRef.current,
        selectedAllocation.verificationQrUrl ||
          `https://atlas-logistics.io/verify/insetting/${selectedAllocation.certificateCode}`,
        {
          width: 140,
          color: {
            dark: "#10b981", // emerald-500
            light: "#020617", // slate-950
          },
        },
      );
    }
  }, [selectedAllocation]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Columna Izquierda: Cadena de Bloques SHA-256 */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Link2 className="w-5 h-5 text-emerald-400" />
              <span>Cadena Criptográfica de Retiro Book-and-Claim</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Registro inmutable de asignaciones y retiros de energía renovable
              (ISO 14083 / GLEC v3.0).
            </p>
          </div>

          <Button
            onClick={onVerifyLedger}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Auditar Integridad Hash</span>
          </Button>
        </div>

        {/* Banner de Verificación de Integridad */}
        {verificationReport && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              verificationReport.isValid
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                : "bg-rose-950/40 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-3">
              {verificationReport.isValid ? (
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
              )}
              <div>
                <h4 className="font-bold text-xs">
                  {verificationReport.isValid
                    ? "Integridad Criptográfica Verificada: 100% Válida"
                    : "ALERTA: Se ha detectado una alteración en la cadena de bloques"}
                </h4>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {verificationReport.totalAllocationsChecked} bloques
                  verificados secuencialmente contra el bloque Génesis.
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2 py-1 rounded bg-black/40 border border-white/10 hidden sm:inline-block">
              {new Date(
                verificationReport.verificationTimestamp,
              ).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Lista Secuencial de Bloques */}
        <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1">
          {allocations.map((alloc, idx) => {
            const isSelected = selectedAllocation?.id === alloc.id;
            return (
              <div
                key={alloc.id}
                onClick={() => setSelectedAllocation(alloc)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-800/90 border-emerald-500/50 shadow-lg shadow-emerald-950/20"
                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        Bloque #{idx + 1} · {alloc.allocationReference}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                        {alloc.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      Beneficiario:{" "}
                      <span className="text-white font-bold">
                        {alloc.beneficiaryName}
                      </span>
                      {alloc.shipmentId && (
                        <span className="text-cyan-400 ml-2 font-mono">
                          [{alloc.shipmentId}]
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-emerald-400 font-extrabold text-xs block">
                      -{alloc.abatedGhgTco2eq} tCO2e
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(alloc.allocatedEnergyMj / 1_000_000).toFixed(2)} GJ
                    </span>
                  </div>
                </div>

                {/* Chained Hashes */}
                <div className="mt-3 pt-2 border-t border-slate-800/80 font-mono text-[10px] space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400 truncate">
                    <span className="text-slate-500">Prev Hash:</span>
                    <span
                      className="truncate text-slate-400"
                      title={alloc.previousBlockHash}
                    >
                      {alloc.previousBlockHash}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-300 truncate">
                    <span className="text-slate-500">Block Hash:</span>
                    <span
                      className="truncate text-emerald-400 font-bold"
                      title={alloc.blockHashSha256}
                    >
                      {alloc.blockHashSha256}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Columna Derecha: Detalle de Certificado con Sello QR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm text-white">
            Certificado Oficial de Retiro Scope 3
          </h3>
        </div>

        {selectedAllocation ? (
          <div className="space-y-4">
            {/* Visualizador QR Renderizado */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center space-y-2">
              <canvas ref={qrCanvasRef} className="rounded-lg shadow-md" />
              <div className="text-center">
                <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                  {selectedAllocation.certificateCode}
                </span>
                <span className="text-[9px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                  <QrCode size={11} /> Escaneo de Verificación Tamper-Proof
                </span>
              </div>
            </div>

            {/* Metadatos del Certificado */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Emisiones Evitadas:</span>
                <span className="font-mono font-black text-emerald-400">
                  -{selectedAllocation.abatedGhgTco2eq} tCO2e
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Energía Asignada:</span>
                <span className="font-mono text-white">
                  {selectedAllocation.allocatedEnergyMj.toLocaleString()} MJ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Volumen Equivalente:</span>
                <span className="font-mono text-white">
                  {selectedAllocation.equivalentFuelVolumeTonnes} MT
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Coste de Insetting:</span>
                <span className="font-mono text-amber-400 font-bold">
                  {selectedAllocation.costEur.toLocaleString("es-ES", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Auditor Verificador:</span>
                <span className="text-slate-300 font-medium">
                  {selectedAllocation.leadAuditorVerifier}
                </span>
              </div>
            </div>

            {/* Acciones */}
            <div className="space-y-2 pt-2">
              <Button
                onClick={() => onDownloadAllocationPDF(selectedAllocation)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2 text-xs"
              >
                <Download size={14} />
                Descargar Certificado PDF Oficial
              </Button>

              <a
                href={selectedAllocation.verificationQrUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-xs border border-slate-700 block text-center"
              >
                <ExternalLink size={14} />
                Abrir Portal de Verificación Pública
              </a>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic text-center py-12">
            Selecciona un bloque de la cadena para inspeccionar su certificado y
            sello QR.
          </p>
        )}
      </div>
    </div>
  );
}
