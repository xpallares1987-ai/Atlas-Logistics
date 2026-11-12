import { useState } from "react";
import { Database, Globe, Layers, Link2, RefreshCw, Zap } from "lucide-react";
import { ActiveGovernanceTab } from "../types/external-governance.types";
import { useExternalGovernance } from "../hooks/useExternalGovernance";
import {
  SourcesCatalogTab,
  UnlocodeHotCacheTab,
  RawRecordsLedgerTab,
  EntityLinksMatrixTab,
} from "../components/external-governance/index";

export default function ExternalDataGovernanceModule() {
  const [activeTab, setActiveTab] = useState<ActiveGovernanceTab>("unlocode");

  const {
    sources,
    records,
    entityLinks,
    unlocodeEntries,
    unlocodeStats,
    isLoading,
    isUnlocodeLoading,
    error,
    lookupLatencyMs,
    triggerUnlocodeSearch,
    ingestRecord,
    isIngesting,
    createEntityLink,
    isLinking,
    upsertUnlocode,
    isUpserting,
    refetchAll,
  } = useExternalGovernance();

  return (
    <div className="min-h-full bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  External Data Governance & Port Registry
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  ADR 0021 · Lean 3-Table Model
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                  Zero Mocks
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Gobernanza de orígenes externos autorizados, integridad SHA-256
                inalterable y diccionario de puertos en memoria viva
                (Write-Through Cache).
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={refetchAll}
          disabled={isLoading}
          className="flex items-center gap-1.5 self-start md:self-auto rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`}
          />
          <span>Sincronizar Datos</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="rounded-lg bg-red-950/40 border border-red-800/80 p-3 text-xs text-red-300 flex items-center justify-between">
          <span>Error de conexión con la API de gobernanza: {error}</span>
          <button
            onClick={refetchAll}
            className="underline font-semibold hover:text-white ml-2"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 overflow-x-auto pb-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("unlocode")}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg transition-colors border-b-2 font-semibold ${
            activeTab === "unlocode"
              ? "border-amber-400 text-amber-300 bg-slate-900/80"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <Zap className="h-4 w-4 text-amber-400" />
          <span>Diccionario UN/LOCODE (Write-Through)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
            ⚡ Hot in RAM
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("records")}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg transition-colors border-b-2 font-semibold ${
            activeTab === "records"
              ? "border-indigo-500 text-white bg-slate-900/80"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <Layers className="h-4 w-4 text-indigo-400" />
          <span>Registros Raw JSON (SHA-256)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
            {records.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("links")}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg transition-colors border-b-2 font-semibold ${
            activeTab === "links"
              ? "border-indigo-500 text-white bg-slate-900/80"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <Link2 className="h-4 w-4 text-emerald-400" />
          <span>Matriz de Vínculos de Entidades</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
            {entityLinks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sources")}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg transition-colors border-b-2 font-semibold ${
            activeTab === "sources"
              ? "border-indigo-500 text-white bg-slate-900/80"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <Globe className="h-4 w-4 text-sky-400" />
          <span>Fuentes y Licencias</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
            {sources.length}
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === "unlocode" && (
          <UnlocodeHotCacheTab
            entries={unlocodeEntries}
            stats={unlocodeStats}
            isLoading={isUnlocodeLoading}
            lookupLatencyMs={lookupLatencyMs}
            onSearch={triggerUnlocodeSearch}
            onUpsert={upsertUnlocode}
            isUpserting={isUpserting}
          />
        )}

        {activeTab === "records" && (
          <RawRecordsLedgerTab
            records={records}
            sources={sources}
            isLoading={isLoading}
            onIngest={ingestRecord}
            isIngesting={isIngesting}
            onLink={createEntityLink}
            isLinking={isLinking}
          />
        )}

        {activeTab === "links" && (
          <EntityLinksMatrixTab
            entityLinks={entityLinks}
            records={records}
            isLoading={isLoading}
            onLink={createEntityLink}
            isLinking={isLinking}
          />
        )}

        {activeTab === "sources" && (
          <SourcesCatalogTab
            sources={sources}
            isLoading={isLoading}
            onRefresh={refetchAll}
          />
        )}
      </div>
    </div>
  );
}
