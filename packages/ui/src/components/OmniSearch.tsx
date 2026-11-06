import { useState, useEffect } from "react";
import { Command } from "cmdk";
import {
  Search,
  Ship,
  FileText,
  Settings,
  LayoutDashboard,
  Globe2,
  BookOpen,
  ShieldAlert,
  Landmark,
  Leaf,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SemanticProtocolHit {
  id: string;
  title: string;
  category?: string;
  text: string;
  score: number;
}

export function OmniSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [liveShipments, setLiveShipments] = useState<any[]>([]);
  const [liveDocuments, setLiveDocuments] = useState<any[]>([]);
  const [semanticResults, setSemanticResults] = useState<SemanticProtocolHit[]>(
    [],
  );
  const [semanticMeta, setSemanticMeta] = useState<{
    source: string;
    model: string;
    latencyMs?: number;
  } | null>(null);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;

    const loadEntities = async () => {
      try {
        const [shipRes, docRes] = await Promise.all([
          fetch("/api/bookings").catch(() => null),
          fetch("/api/documents").catch(() => null),
        ]);
        if (active && shipRes && shipRes.ok) {
          const sData = await shipRes.json();
          setLiveShipments(Array.isArray(sData) ? sData.slice(0, 8) : []);
        }
        if (active && docRes && docRes.ok) {
          const dData = await docRes.json();
          setLiveDocuments(Array.isArray(dData) ? dData.slice(0, 6) : []);
        }
      } catch {
        // Fallback handled in render
      }
    };

    loadEntities();
    return () => {
      active = false;
    };
  }, [open]);

  const handleSelect = (route: string) => {
    navigate(route);
    setOpen(false);
  };

  const handleRunSemanticSearch = async () => {
    const effectiveQuery =
      query.trim().length >= 2
        ? query.trim()
        : "Retención aduanera y congestión de terminal en contenedor MSKU9284712";
    setIsSearchingSemantic(true);
    try {
      const res = await fetch("/api/ai/semantic-protocol-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: effectiveQuery, topK: 4 }),
      });
      if (res.ok) {
        const data = await res.json();
        setSemanticResults(data.results || []);
        setSemanticMeta({
          source: data.source || "gemini-live",
          model: data.model || "text-embedding-004",
          latencyMs: data.latencyMs,
        });
        window.dispatchEvent(new CustomEvent("atlas:ai-quota-updated"));
      }
    } catch {
      // Ignore network error
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  const shipmentsToRender =
    liveShipments.length > 0
      ? liveShipments
      : [
          {
            id: "sh_demo_01",
            referenceNumber: "BK-2026-67116",
            originPort: "ESVLC",
            destinationPort: "USNYC",
            vesselName: "MSC ISABELLA",
          },
        ];

  const documentsToRender =
    liveDocuments.length > 0
      ? liveDocuments
      : [
          {
            id: "doc_hbl_demo",
            name: "Bill of Lading • BK-2026-67116 (MSKU9284712)",
            type: "HBL",
          },
        ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg border border-slate-200 transition-colors"
      >
        <Search className="w-4 h-4 mr-2" />
        <span className="text-sm">
          Buscar expedición, documento o protocolo IA...
        </span>
        <kbd className="ml-auto text-xs font-semibold bg-white border border-slate-300 rounded px-1.5 py-0.5 shadow-sm text-slate-400">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <Command
              label="Global Command Menu"
              className="w-full"
              shouldFilter={true}
            >
              <div className="flex items-center border-b border-slate-100 px-4 gap-2">
                <Search className="text-slate-400 w-5 h-5 shrink-0" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Busca expediciones SQLite o escribe una incidencia para Gemini Embeddings..."
                  className="w-full bg-transparent border-none py-4 text-slate-800 placeholder-slate-400 focus:ring-0 outline-none text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleRunSemanticSearch}
                  disabled={isSearchingSemantic}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                  title="Ejecuta búsqueda semántica bajo demanda usando el pool gratuito text-embedding-004 (100 RPM)"
                >
                  {isSearchingSemantic ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>IA Semántica (1 RPM)</span>
                </button>
              </div>

              {semanticResults.length > 0 && (
                <div className="bg-slate-950 text-slate-100 p-3 border-b border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Protocolos Operativos Recomendados (Cosine Similarity)
                    </div>
                    {semanticMeta && (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold ${
                            semanticMeta.source === "gemini-live"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          }`}
                        >
                          {semanticMeta.source === "gemini-live"
                            ? "Gemini Live"
                            : "Fallback Determinista"}
                        </span>
                        <span className="font-mono text-slate-400">
                          {semanticMeta.model}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {semanticResults.map((hit) => (
                      <div
                        key={hit.id}
                        onClick={() =>
                          handleSelect(
                            hit.category === "CUSTOMS"
                              ? "/demurrage-alerts"
                              : hit.category === "DOCUMENTATION"
                                ? "/bookings"
                                : "/system-panel",
                          )
                        }
                        className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 cursor-pointer transition-colors flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-bold text-white">
                            {hit.title}
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {hit.text}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {(hit.score * 100).toFixed(1)}% match
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Command.List className="max-h-[320px] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-slate-500 text-xs">
                  Sin coincidencias locales. Pulsa{" "}
                  <strong>"IA Semántica (1 RPM)"</strong> arriba para buscar
                  protocolos con Gemini Embeddings.
                </Command.Empty>

                <Command.Group
                  heading="Expediciones Activas (SQLite en Vivo)"
                  className="text-xs font-semibold text-slate-400 mb-2 px-2 mt-1"
                >
                  {shipmentsToRender.map((s) => {
                    const ref = s.referenceNumber || s.bookingId || s.id;
                    const orig = s.originPort || s.origin || "ESVLC";
                    const dest = s.destinationPort || s.destination || "USNYC";
                    const vessel = s.vesselName || "MSC ISABELLA";
                    return (
                      <Command.Item
                        key={s.id}
                        value={`${ref} ${s.id} ${orig} ${dest} ${vessel}`}
                        onSelect={() => handleSelect("/bookings")}
                        className="flex items-center justify-between gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer aria-selected:bg-slate-100"
                      >
                        <div className="flex items-center gap-3">
                          <Ship className="text-blue-500 w-4 h-4 shrink-0" />
                          <span className="font-semibold">{ref}</span>
                          <span className="text-xs text-slate-500">
                            ({orig} → {dest} • {vessel})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {s.id}
                        </span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>

                <Command.Group
                  heading="Documentos en Bóveda (SQLite en Vivo)"
                  className="text-xs font-semibold text-slate-400 mb-2 px-2 mt-3"
                >
                  {documentsToRender.map((d) => (
                    <Command.Item
                      key={d.id}
                      value={`${d.name} ${d.type || ""} ${d.documentReference || ""}`}
                      onSelect={() => handleSelect("/documents")}
                      className="flex items-center justify-between gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer aria-selected:bg-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="text-emerald-500 w-4 h-4 shrink-0" />
                        <span>{d.name || d.documentReference || d.id}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {d.type || "DOC"}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group
                  heading="Navegación Rápida"
                  className="text-xs font-semibold text-slate-400 mb-2 px-2 mt-3"
                >
                  <Command.Item
                    onSelect={() => handleSelect("/")}
                    className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Command.Item>
                  <Command.Item
                    onSelect={() => handleSelect("/globe")}
                    className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700"
                  >
                    <Globe2 className="w-4 h-4" />
                    Globe Tracker
                  </Command.Item>
                  <Command.Item
                    onSelect={() => handleSelect("/bookings")}
                    className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700"
                  >
                    <BookOpen className="w-4 h-4" />
                    Bookings & B/L (DCSA v3)
                  </Command.Item>
                  <Command.Item
                    onSelect={() => handleSelect("/demurrage-alerts")}
                    className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Demurrage & Disputas FMC
                  </Command.Item>
                  <Command.Item
                    onSelect={() => handleSelect("/trade-finance")}
                    className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700"
                  >
                    <Landmark className="w-4 h-4" />
                    Trade Finance (UCP 600)
                  </Command.Item>
                  <Command.Item
                    onSelect={() => handleSelect("/esg-tracker")}
                    className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700"
                  >
                    <Leaf className="w-4 h-4" />
                    Carbon Tracker
                  </Command.Item>
                  <Command.Item
                    onSelect={() => handleSelect("/system-panel")}
                    className="flex items-center gap-3 px-3 py-2 mt-1 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg cursor-pointer aria-selected:bg-indigo-50 aria-selected:text-indigo-700"
                  >
                    <Settings className="w-4 h-4" />
                    System Panel & Gobernanza IA
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </div>
          <div
            className="absolute inset-0 z-[-1]"
            onClick={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
}
