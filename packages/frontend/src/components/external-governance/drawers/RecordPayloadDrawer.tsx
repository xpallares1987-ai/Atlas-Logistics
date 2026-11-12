import React, { useState } from "react";
import { X, Copy, Check, ShieldCheck, ShieldAlert, Code2 } from "lucide-react";
import {
  SourceRecordDto,
  HashVerificationStatus,
} from "../../../types/external-governance.types";

interface RecordPayloadDrawerProps {
  record: SourceRecordDto | null;
  onClose: () => void;
}

export const RecordPayloadDrawer: React.FC<RecordPayloadDrawerProps> = ({
  record,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [verificationStatus, setVerificationStatus] =
    useState<HashVerificationStatus>("idle");

  if (!record) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(record.sha256Hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyIntegrity = async () => {
    setVerificationStatus("verifying");
    try {
      const jsonStr = JSON.stringify(record.rawPayload);
      const encoder = new TextEncoder();
      const data = encoder.encode(jsonStr);
      const buf = await crypto.subtle.digest("SHA-256", data);
      const hashHex = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (hashHex.toLowerCase() === record.sha256Hash.toLowerCase()) {
        setVerificationStatus("valid");
      } else {
        setVerificationStatus("mismatch");
      }
    } catch {
      setVerificationStatus("mismatch");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-xl h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-semibold text-white">
                Auditoría de Payload Crudo
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {record.id} ({record.externalId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded border border-slate-800 bg-slate-950 p-3">
              <span className="text-slate-500 block uppercase text-[10px] font-bold">
                Identificador Externo
              </span>
              <span className="font-mono text-white text-sm font-semibold">
                {record.externalId}
              </span>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950 p-3">
              <span className="text-slate-500 block uppercase text-[10px] font-bold">
                Versión del Registro
              </span>
              <span className="font-mono text-indigo-400 text-sm font-semibold">
                {record.versionTag || "v1.0"}
              </span>
            </div>
          </div>

          {/* Cryptographic SHA-256 Section */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Hash SHA-256 Almacenado
              </span>
              <button
                onClick={handleCopyHash}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copiar
                  </>
                )}
              </button>
            </div>
            <div className="font-mono text-xs text-slate-300 break-all bg-slate-900 p-2 rounded border border-slate-800">
              {record.sha256Hash}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleVerifyIntegrity}
                className="flex items-center gap-1.5 rounded bg-indigo-950/60 border border-indigo-700/60 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-900 transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
                Verificar Integridad Criptográfica en Cliente
              </button>

              {verificationStatus === "valid" && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <ShieldCheck className="h-4 w-4" /> Hash Válido (Íntegro)
                </span>
              )}
              {verificationStatus === "mismatch" && (
                <span className="flex items-center gap-1 text-xs font-medium text-red-400">
                  <ShieldAlert className="h-4 w-4" /> Discrepancia Detectada
                </span>
              )}
            </div>
          </div>

          {/* Formatted JSON Payload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-300">
                Payload JSON Inalterable
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                JSON Mode (SQLite text)
              </span>
            </div>
            <pre className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-emerald-400 overflow-x-auto max-h-[380px]">
              {JSON.stringify(record.rawPayload, null, 2)}
            </pre>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="rounded bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            Cerrar Auditoría
          </button>
        </div>
      </div>
    </div>
  );
};
