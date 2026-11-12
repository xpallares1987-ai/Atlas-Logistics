import React, { useState } from "react";
import {
  Search,
  Zap,
  Plus,
  Compass,
  Cpu,
  Layers,
  Sparkles,
  MapPin,
} from "lucide-react";
import {
  UnlocodeEntry,
  UnlocodeStats,
  UpsertUnlocodeFormData,
} from "../../types/external-governance.types";
import { UpsertUnlocodeModal } from "./modals/UpsertUnlocodeModal";

interface UnlocodeHotCacheTabProps {
  entries: UnlocodeEntry[];
  stats: UnlocodeStats | null;
  isLoading: boolean;
  lookupLatencyMs: number;
  onSearch: (q: string) => void;
  onUpsert: (data: UpsertUnlocodeFormData) => Promise<void>;
  isUpserting: boolean;
}

export const UnlocodeHotCacheTab: React.FC<UnlocodeHotCacheTabProps> = ({
  entries,
  stats,
  isLoading,
  lookupLatencyMs,
  onSearch,
  onUpsert,
  isUpserting,
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] =
    useState<UpsertUnlocodeFormData | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    onSearch(val);
  };

  const handleOpenNew = () => {
    setSelectedForEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: UnlocodeEntry) => {
    let lat: number | undefined;
    let lng: number | undefined;
    if (entry.coordinates && entry.coordinates.includes(",")) {
      const parts = entry.coordinates.split(",");
      lat = parseFloat(parts[0]);
      lng = parseFloat(parts[1]);
    }
    setSelectedForEdit({
      location: entry.location,
      name: entry.name,
      country: entry.country,
      lat,
      lng,
      status: entry.status,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Diagnostics / Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Cpu className="h-4 w-4 text-emerald-400" />
            <span>Puertos Indexados en RAM</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {stats?.trie?.indexedLocations ?? entries.length}
          </div>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
            <Sparkles className="h-3 w-3" /> Prefix Trie + Write-Through
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Layers className="h-4 w-4 text-sky-400" />
            <span>Nodos en Árbol Trie</span>
          </div>
          <div className="text-xl font-bold font-mono text-sky-300">
            {stats?.trie?.unique3CharPrefixes ?? "Activo"}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">
            Indexación alfabética O(k)
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Compass className="h-4 w-4 text-indigo-400" />
            <span>Entradas en Caché LRU</span>
          </div>
          <div className="text-xl font-bold font-mono text-indigo-300">
            {stats?.cache?.size ?? 0} / {stats?.cache?.capacity ?? 250}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">
            Invalidación atómica en mutación
          </span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Latencia de Búsqueda</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {lookupLatencyMs > 0 ? `${lookupLatencyMs} ms` : "< 1.5 ms"}
          </div>
          <span className="text-[10px] text-emerald-400 font-medium block mt-1">
            ⚡ 100% en memoria viva
          </span>
        </div>
      </div>

      {/* Action Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={handleInputChange}
            placeholder="Buscar por código (ESBCN) o ciudad (Barcelona, Valencia, Rotterdam)..."
            className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-24 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
          />
          {searchInput && (
            <span className="absolute right-3 top-2.5 text-[10px] text-indigo-400 font-mono">
              {entries.length} hallados
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Puerto (Write-Through)</span>
        </button>
      </div>

      {/* Results Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">UN/LOCODE</th>
                <th className="py-3 px-4">Nombre Oficial</th>
                <th className="py-3 px-4">País</th>
                <th className="py-3 px-4">Coordenadas</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading && entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Buscando en memoria viva...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No se encontraron puertos con el término &ldquo;
                    {searchInput}&rdquo;.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.location}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                      {entry.location}
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {entry.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {entry.country}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {entry.coordinates ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-500" />
                          {entry.coordinates}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {entry.status || "AI"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(entry)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <UpsertUnlocodeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onUpsert}
        isSaving={isUpserting}
        initialData={selectedForEdit}
      />
    </div>
  );
};
