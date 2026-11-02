import React from "react";
import { AlertTriangle, Check, X, Building, MapPin, Hash } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface DuplicateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmOverride: () => void;
  isSubmitting?: boolean;
  duplicateInfo?: {
    reason: string;
    score?: number;
    matchedAddress?: {
      id: string;
      companyName: string;
      taxId?: string;
      addressType: string;
      city: string;
      country: string;
      street1: string;
      zipCode: string;
    };
    proposedAddress?: {
      companyName: string;
      taxId?: string;
      addressType: string;
      city: string;
      country: string;
      street1: string;
      zipCode: string;
    };
  } | null;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  isOpen,
  onClose,
  onConfirmOverride,
  isSubmitting = false,
  duplicateInfo,
}) => {
  if (!duplicateInfo) return null;

  const matched = duplicateInfo.matchedAddress;
  const proposed = duplicateInfo.proposedAddress;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-lg">
          <AlertTriangle className="w-5 h-5" />
          <span>Advertencia de Duplicidad en Directorio</span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 text-amber-900 dark:text-amber-200 text-sm">
          <div className="font-semibold mb-1 flex items-center justify-between">
            <span>Motivo de coincidencia detectada:</span>
            {duplicateInfo.score !== undefined && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100 font-mono">
                {Math.round(duplicateInfo.score * 100)}% similitud
              </span>
            )}
          </div>
          <p>{duplicateInfo.reason}</p>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            ¿Desea registrar esta dirección de todos modos como una entidad o
            sucursal independiente?
          </p>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Existing Registered Record */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Dirección Existente (Base de Datos)
              </span>
              <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                {matched?.id || "N/A"}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Building className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {matched?.companyName || "Sin Nombre"}
                  </div>
                  <div className="text-xs text-slate-500">
                    Tipo:{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {matched?.addressType}
                    </span>
                  </div>
                </div>
              </div>

              {matched?.taxId && (
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Tax ID / CIF:{" "}
                    <strong className="font-mono text-slate-800 dark:text-slate-200">
                      {matched.taxId}
                    </strong>
                  </span>
                </div>
              )}

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <div>{matched?.street1}</div>
                  <div>
                    {matched?.zipCode} {matched?.city}, {matched?.country}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* New Proposed Record */}
          <div className="border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-4 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-900/60 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Nueva Dirección Propuesta
              </span>
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-medium">
                Por Guardar
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Building className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {proposed?.companyName || "Sin Nombre"}
                  </div>
                  <div className="text-xs text-indigo-600 dark:text-indigo-400">
                    Tipo:{" "}
                    <span className="font-medium">{proposed?.addressType}</span>
                  </div>
                </div>
              </div>

              {proposed?.taxId && (
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Tax ID / CIF:{" "}
                    <strong className="font-mono text-slate-800 dark:text-slate-200">
                      {proposed.taxId}
                    </strong>
                  </span>
                </div>
              )}

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <div>{proposed?.street1}</div>
                  <div>
                    {proposed?.zipCode} {proposed?.city}, {proposed?.country}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            <span>Cancelar y Modificar</span>
          </Button>

          <Button
            type="button"
            onClick={onConfirmOverride}
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>
              {isSubmitting ? "Guardando..." : "Sí, Guardar de Todos Modos"}
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
