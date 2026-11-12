import React, { useState } from "react";
import { X, Link2, Loader2, Sparkles } from "lucide-react";
import {
  ExternalEntityType,
  MatchMethod,
  SourceRecordDto,
  CreateEntityLinkFormData,
} from "../../../types/external-governance.types";
import { useShipments } from "../../../hooks/useShipments";

interface CreateEntityLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: SourceRecordDto[];
  preselectedRecordId?: string;
  onLink: (data: CreateEntityLinkFormData) => Promise<void>;
  isLinking: boolean;
}

export const CreateEntityLinkModal: React.FC<CreateEntityLinkModalProps> = ({
  isOpen,
  onClose,
  records,
  preselectedRecordId,
  onLink,
  isLinking,
}) => {
  const { data: shipments = [] } = useShipments();

  const [entityType, setEntityType] = useState<ExternalEntityType>("SHIPMENT");
  const [entityId, setEntityId] = useState<string>("sh_demo_01");
  const [sourceRecordId, setSourceRecordId] = useState<string>(
    preselectedRecordId || records[0]?.id || "",
  );
  const [matchMethod, setMatchMethod] = useState<MatchMethod>("EXACT_CODE");
  const [matchConfidence, setMatchConfidence] = useState<number>(0.95);
  const [verifiedBy, setVerifiedBy] = useState<string>("compliance_officer");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!entityId.trim()) {
      setError("El identificador de la entidad interna es obligatorio.");
      return;
    }
    if (!sourceRecordId) {
      setError("Debe seleccionar un registro de origen externo.");
      return;
    }

    try {
      await onLink({
        entityType,
        entityId: entityId.trim(),
        sourceRecordId,
        matchConfidence,
        matchMethod,
        verifiedBy: verifiedBy.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al vincular entidad");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">
              Vincular Entidad Operativa a Registro Externo
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
          Establece una relación semántica verificable entre una entidad interna
          de Atlas (expediente, contenedor, puerto) y un registro de datos
          externos. Emite evento Outbox transaccional.
        </p>

        {error && (
          <div className="mb-4 rounded bg-red-950/50 border border-red-800 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tipo de Entidad Atlas *
              </label>
              <select
                value={entityType}
                onChange={(e) => {
                  const val = e.target.value as ExternalEntityType;
                  setEntityType(val);
                  if (val === "SHIPMENT") setEntityId("sh_demo_01");
                  else if (val === "CONTAINER") setEntityId("MSKU9284712");
                  else if (val === "PORT") setEntityId("ESBCN");
                }}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="SHIPMENT">Expediente (SHIPMENT)</option>
                <option value="CONTAINER">Contenedor (CONTAINER)</option>
                <option value="PORT">Puerto / Hub (PORT)</option>
                <option value="VESSEL">Buque / Barco (VESSEL)</option>
                <option value="LOCATION">
                  Ubicación / Terminal (LOCATION)
                </option>
                <option value="CARRIER">
                  Naviera / Transportista (CARRIER)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Identificador de Entidad *
              </label>
              {entityType === "SHIPMENT" && shipments.length > 0 ? (
                <select
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="sh_demo_01">sh_demo_01 (BK-2026-67116)</option>
                  {shipments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} ({s.trackingNumber || s.status})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder="ej. sh_demo_01 o MSKU9284712"
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Registro Externo de Origen (Source Record) *
            </label>
            <select
              required
              value={sourceRecordId}
              onChange={(e) => setSourceRecordId(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none"
            >
              {records.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.externalId} — Hash: {r.sha256Hash.slice(0, 12)}... ({r.id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Método de Coincidencia *
              </label>
              <select
                value={matchMethod}
                onChange={(e) => setMatchMethod(e.target.value as MatchMethod)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="EXACT_CODE">Código Exacto (EXACT_CODE)</option>
                <option value="FUZZY_NAME">
                  Nombre Aproximado (FUZZY_NAME)
                </option>
                <option value="GEO_PROXIMITY">
                  Proximidad Geográfica (GEO)
                </option>
                <option value="MANUAL">Verificación Manual Experta</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Operador Verificador
              </label>
              <input
                type="text"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                placeholder="compliance_officer"
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Confidence Slider */}
          <div>
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="font-medium text-slate-300 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Nivel de Confianza (Match Confidence)
              </span>
              <span className="font-mono font-bold text-indigo-400">
                {Math.round(matchConfidence * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={matchConfidence}
              onChange={(e) => setMatchConfidence(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLinking}
              className="rounded px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLinking || !entityId || !sourceRecordId}
              className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {isLinking && <Loader2 className="h-4 w-4 animate-spin" />}
              Vincular y Publicar Outbox
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
