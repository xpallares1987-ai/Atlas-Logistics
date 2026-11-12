import React, { useState, useEffect } from "react";
import { X, Database, ShieldCheck, Loader2 } from "lucide-react";
import { DataSourceDto } from "../../../types/external-governance.types";

interface IngestRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: DataSourceDto[];
  onIngest: (payload: {
    sourceCode: string;
    externalId: string;
    sourceUrl?: string;
    rawPayload: Record<string, unknown>;
    versionTag?: string;
  }) => Promise<void>;
  isIngesting: boolean;
}

export const IngestRecordModal: React.FC<IngestRecordModalProps> = ({
  isOpen,
  onClose,
  sources,
  onIngest,
  isIngesting,
}) => {
  const [sourceCode, setSourceCode] = useState(sources[0]?.code || "UNLOCODE");
  const [externalId, setExternalId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [versionTag, setVersionTag] = useState("v1.0");
  const [jsonText, setJsonText] = useState(
    '{\n  "code": "SAMPLE",\n  "name": "Sample Hub"\n}',
  );
  const [computedHash, setComputedHash] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (sources.length > 0 && !sourceCode) {
      setSourceCode(sources[0].code);
    }
  }, [sources, sourceCode]);

  // Live client-side calculation of SHA-256 hash
  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonError(null);
      const str = JSON.stringify(parsed);
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      crypto.subtle.digest("SHA-256", data).then((buf) => {
        const hashArray = Array.from(new Uint8Array(buf));
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        setComputedHash(hashHex);
      });
    } catch {
      setJsonError("JSON no válido");
      setComputedHash("");
    }
  }, [jsonText]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(jsonText);
      await onIngest({
        sourceCode,
        externalId: externalId.trim(),
        sourceUrl: sourceUrl.trim() || undefined,
        rawPayload: parsed,
        versionTag: versionTag.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setJsonError(err.message || "Error al ingerir registro externo");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">
              Ingerir Registro Externo (SHA-256 + Outbox)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-2 mb-4">
          Guarda el payload crudo en JSON, calcula el hash SHA-256 de integridad
          y publica el evento append-only en el Outbox transaccional para
          sincronización offline.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Fuente Externa Autorizada *
              </label>
              <select
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.code}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Identificador Externo *
              </label>
              <input
                type="text"
                required
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder="ej. ESBCN, NLRTM, node/49281"
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                URL de Origen (Opcional)
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://service.unece.org/..."
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Etiqueta de Versión
              </label>
              <input
                type="text"
                value={versionTag}
                onChange={(e) => setVersionTag(e.target.value)}
                placeholder="2026.2"
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                Payload Crudo JSON (Raw Ingestion) *
              </label>
              {jsonError ? (
                <span className="text-[11px] text-red-400">{jsonError}</span>
              ) : (
                <span className="text-[11px] text-emerald-400">
                  JSON Sintácticamente Válido
                </span>
              )}
            </div>
            <textarea
              required
              rows={6}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-950 p-3 text-xs text-emerald-300 font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Real-time Hash Preview */}
          {computedHash && (
            <div className="rounded border border-indigo-500/30 bg-indigo-950/20 p-2.5 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">
                  Hash SHA-256 Pre-calculado (WebCrypto en Cliente)
                </div>
                <div className="font-mono text-xs text-slate-300 truncate">
                  {computedHash}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isIngesting}
              className="rounded px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isIngesting || !externalId || Boolean(jsonError)}
              className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {isIngesting && <Loader2 className="h-4 w-4 animate-spin" />}
              Ingerir y Emitir Outbox
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
