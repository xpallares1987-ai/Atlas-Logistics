import React, { useState, useMemo } from "react";
import { Plus, Search, Copy, Check, Code2, Link2 } from "lucide-react";
import {
  DataSourceDto,
  SourceRecordDto,
  CreateEntityLinkFormData,
} from "../../types/external-governance.types";
import { IngestRecordModal } from "./modals/IngestRecordModal";
import { RecordPayloadDrawer } from "./drawers/RecordPayloadDrawer";
import { CreateEntityLinkModal } from "./modals/CreateEntityLinkModal";

interface RawRecordsLedgerTabProps {
  records: SourceRecordDto[];
  sources: DataSourceDto[];
  isLoading: boolean;
  onIngest: (payload: any) => Promise<void>;
  isIngesting: boolean;
  onLink: (data: CreateEntityLinkFormData) => Promise<void>;
  isLinking: boolean;
}

export const RawRecordsLedgerTab: React.FC<RawRecordsLedgerTabProps> = ({
  records,
  sources,
  isLoading,
  onIngest,
  isIngesting,
  onLink,
  isLinking,
}) => {
  const [selectedSourceFilter, setSelectedSourceFilter] =
    useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [selectedRecordForDrawer, setSelectedRecordForDrawer] =
    useState<SourceRecordDto | null>(null);
  const [linkRecordId, setLinkRecordId] = useState<string | null>(null);
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSource =
        selectedSourceFilter === "ALL" ||
        r.sourceId === selectedSourceFilter ||
        sources.find((s) => s.code === selectedSourceFilter)?.id === r.sourceId;

      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        r.externalId.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.sha256Hash.toLowerCase().includes(q);

      return matchesSource && matchesQuery;
    });
  }, [records, selectedSourceFilter, searchQuery, sources]);

  const handleCopyHash = (id: string, hash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2000);
  };

  const getSourceCode = (sourceId: string) => {
    const s = sources.find((src) => src.id === sourceId);
    return s?.code || sourceId;
  };

  return (
    <div className="space-y-6">
      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Source Filter */}
          <select
            value={selectedSourceFilter}
            onChange={(e) => setSelectedSourceFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="ALL">Todas las Fuentes ({records.length})</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} ({s.name.slice(0, 24)}...)
              </option>
            ))}
          </select>

          {/* Search Query */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID externo o hash..."
              className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsIngestModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Ingerir Registro Crudo (SHA-256)</span>
        </button>
      </div>

      {/* Ledger Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Fuente</th>
                <th className="py-3 px-4">Identificador Externo</th>
                <th className="py-3 px-4">
                  Integridad Criptográfica (SHA-256)
                </th>
                <th className="py-3 px-4">Versión</th>
                <th className="py-3 px-4">Fecha Obtención</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading && records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Cargando registros crudos desde SQLite...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No se encontraron registros con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => setSelectedRecordForDrawer(record)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/50">
                        {getSourceCode(record.sourceId)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {record.externalId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                        <span className="text-slate-300">
                          {record.sha256Hash.slice(0, 16)}...
                          {record.sha256Hash.slice(-8)}
                        </span>
                        <button
                          onClick={(e) =>
                            handleCopyHash(record.id, record.sha256Hash, e)
                          }
                          title="Copiar hash SHA-256 completo"
                          className="text-slate-500 hover:text-white transition-colors p-0.5"
                        >
                          {copiedHashId === record.id ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {record.versionTag || "v1.0"}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {record.retrievedAt
                        ? new Date(record.retrievedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setSelectedRecordForDrawer(record)}
                          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <Code2 className="h-3.5 w-3.5" />
                          <span>JSON</span>
                        </button>
                        <button
                          onClick={() => setLinkRecordId(record.id)}
                          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors ml-2"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          <span>Vincular</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals & Drawers */}
      <IngestRecordModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        sources={sources}
        onIngest={onIngest}
        isIngesting={isIngesting}
      />

      <RecordPayloadDrawer
        record={selectedRecordForDrawer}
        onClose={() => setSelectedRecordForDrawer(null)}
      />

      {linkRecordId && (
        <CreateEntityLinkModal
          isOpen={Boolean(linkRecordId)}
          onClose={() => setLinkRecordId(null)}
          records={records}
          preselectedRecordId={linkRecordId}
          onLink={onLink}
          isLinking={isLinking}
        />
      )}
    </div>
  );
};
