/**
 * @file Resolutions.tsx
 * @description Operational resolution protocols management tab with semantic search ranking.
 * @module @atlas/frontend/components/SystemPanel/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { useState } from "react";
import {
  CheckCircle2,
  RotateCcw,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@atlas/ui";
import { filterResolutionNotes } from "../hooks/systemPanelHelpers";
import type { PredefinedResolutionNote } from "../../../store/useResolutionNotesStore";
import type { SemanticSearchResultsState } from "../../../types/system-panel.types";

interface ResolutionsProps {
  notes: PredefinedResolutionNote[];
  canEditResolutions: boolean;
  onResetDefaults: () => void;
  onOpenAddModal: () => void;
  onDeleteNote: (id: string) => void;
  onSemanticSearch: (notes: PredefinedResolutionNote[], query: string) => void;
  isSearchingSemantic: boolean;
  semanticResults: SemanticSearchResultsState | null;
  onCloseSemanticResults: () => void;
}

export function Resolutions({
  notes,
  canEditResolutions,
  onResetDefaults,
  onOpenAddModal,
  onDeleteNote,
  onSemanticSearch,
  isSearchingSemantic,
  semanticResults,
  onCloseSemanticResults,
}: ResolutionsProps) {
  const [noteSearch, setNoteSearch] = useState("");

  const filteredNotes = filterResolutionNotes(notes, noteSearch);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <span>Authorized Resolution Justification Notes</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Predefined official justifications enforced across Shipment 360,
            Exception Center, and Control Tower modals. Users must select an
            authorized note.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onResetDefaults}
            className="text-slate-400 border-slate-700 hover:text-white flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </Button>

          {canEditResolutions && (
            <Button
              size="sm"
              onClick={onOpenAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
            >
              <Plus size={15} />
              <span>Add Predefined Note</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar + Semantic Search (text-embedding-004) */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 text-slate-500 w-4 h-4" />
          <input
            type="text"
            value={noteSearch}
            onChange={(e) => setNoteSearch(e.target.value)}
            placeholder="Search predefined justification by category, label, or text content..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <Button
          size="sm"
          onClick={() => onSemanticSearch(notes, noteSearch)}
          disabled={isSearchingSemantic}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 rounded-2xl flex items-center gap-1.5 shrink-0"
        >
          <Sparkles size={14} />
          {isSearchingSemantic
            ? "Calculando Embeddings..."
            : "🔍 Ranking Semántico IA (Embedding-004)"}
        </Button>
      </div>

      {semanticResults && (
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-emerald-400" />
              <span className="font-bold text-white">
                Top Protocolos por Similitud Semántica (Cuota independiente
                text-embedding-004)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-mono text-[10px]">
                {semanticResults.source} · {semanticResults.model}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-300">
              <span>{semanticResults.latencyMs}ms</span>
              <span>
                RPM Embedding Libre: {semanticResults.quotaRemainingRpm}/100
              </span>
              <button
                type="button"
                onClick={onCloseSemanticResults}
                className="text-slate-400 hover:text-white underline font-sans"
              >
                Cerrar
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {semanticResults.results.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-indigo-400">
                    {item.category || "PROTOCOL"}
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold">
                    Similitud: {(item.score * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="font-bold text-white">{item.title}</div>
                <p className="text-[11px] text-slate-300 line-clamp-2">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {note.category}
                </span>
                {note.isSystemDefault && (
                  <span className="text-[10px] text-slate-500 font-medium">
                    System Protocol
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-white">{note.label}</h4>
              <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                "{note.text}"
              </p>
            </div>

            {canEditResolutions && !note.isSystemDefault && (
              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => onDeleteNote(note.id)}
                  className="text-slate-500 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                  title="Delete custom note"
                >
                  <Trash2 size={14} />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Resolutions;
