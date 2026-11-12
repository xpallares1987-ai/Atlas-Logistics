import React, { useState } from "react";
import { X, Zap, Loader2 } from "lucide-react";
import { UpsertUnlocodeFormData } from "../../../types/external-governance.types";

interface UpsertUnlocodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UpsertUnlocodeFormData) => Promise<void>;
  isSaving: boolean;
  initialData?: UpsertUnlocodeFormData | null;
}

export const UpsertUnlocodeModal: React.FC<UpsertUnlocodeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isSaving,
  initialData,
}) => {
  const [formData, setFormData] = useState<UpsertUnlocodeFormData>(() => ({
    location: initialData?.location || "",
    name: initialData?.name || "",
    country: initialData?.country || "ES",
    lat: initialData?.lat || 0,
    lng: initialData?.lng || 0,
    status: initialData?.status || "AI",
  }));

  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const loc = formData.location.trim().toUpperCase();
    const name = formData.name.trim();
    const country = formData.country.trim().toUpperCase();

    if (!loc || loc.length !== 5) {
      setFormError(
        "El código UN/LOCODE debe tener exactamente 5 caracteres (ej. ESBCN).",
      );
      return;
    }
    if (!name) {
      setFormError("El nombre del puerto o terminal es obligatorio.");
      return;
    }
    if (!country || country.length !== 2) {
      setFormError("El código de país ISO debe tener 2 letras (ej. ES).");
      return;
    }

    try {
      await onSave({
        location: loc,
        name,
        country,
        lat: Number(formData.lat) || undefined,
        lng: Number(formData.lng) || undefined,
        status: formData.status || "AI",
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || "Error al actualizar UN/LOCODE en caché");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">
              Write-Through Cache: Upsert UN/LOCODE
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
          Esta operación actualiza inmediatamente el Trie y LRU en la RAM del
          servidor y persiste el registro en SQLite sin requerir reinicios.
        </p>

        {formError && (
          <div className="mb-4 rounded bg-red-950/50 border border-red-800 p-3 text-xs text-red-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                UN/LOCODE (5 caracteres) *
              </label>
              <input
                type="text"
                maxLength={5}
                required
                value={formData.location}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: e.target.value.toUpperCase(),
                  })
                }
                placeholder="ESVLC"
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                País ISO (2 letras) *
              </label>
              <input
                type="text"
                maxLength={2}
                required
                value={formData.country}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    country: e.target.value.toUpperCase(),
                  })
                }
                placeholder="ES"
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none uppercase font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Nombre Oficial del Puerto o Terminal *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Valencia Port Terminal"
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Latitud (ej. 39.46)
              </label>
              <input
                type="number"
                step="any"
                value={formData.lat || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lat: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="39.46"
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Longitud (ej. -0.37)
              </label>
              <input
                type="number"
                step="any"
                value={formData.lng || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lng: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="-0.37"
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Actualizar en Caliente (RAM + SQLite)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
