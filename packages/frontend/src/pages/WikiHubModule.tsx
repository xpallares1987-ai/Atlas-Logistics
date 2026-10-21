import React, { useState, useMemo, useEffect } from "react";
import {
  BookOpen,
  Search,
  FileText,
  Download,
  Copy,
  Check,
  Clock,
  User,
  Tag,
  Sparkles,
  TrainTrack,
  ShieldCheck,
  Ship,
  Plane,
  Truck,
  FileSignature,
  Boxes,
  HelpCircle,
  ChevronRight,
  Layers,
  BookmarkCheck,
} from "lucide-react";
import { Button } from "@atlas/ui";
import {
  WikiService,
  type WikiArticle,
  type WikiCategory,
} from "@atlas/shared";
import { jsPDF } from "jspdf";

// Icon mapper for categories
const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  GOVERNANCE_CORREDOR: TrainTrack,
  CUSTOMS_DUA: ShieldCheck,
  INCOTERMS_CONTRACTS: FileSignature,
  MARITIME_DEMURRAGE: Ship,
  AIR_CARGO_IATA: Plane,
  ROAD_CMR: Truck,
  GLOSSARY: BookOpen,
  ARCHITECTURE_ERP: Boxes,
};

export default function WikiHubModule() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    WikiCategory | "ALL"
  >("ALL");
  const [activeArticleSlug, setActiveArticleSlug] = useState<string>(
    "corredor-oficial-customer01-normativa",
  );
  const [activeTab, setActiveTab] = useState<"ARTICLES" | "GLOSSARY">(
    "ARTICLES",
  );
  const [copiedLink, setCopiedLink] = useState(false);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("wiki-search-input");
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const categories = useMemo(() => WikiService.getCategories(), []);

  // Filtered Articles based on search and category
  const searchResults = useMemo(() => {
    return WikiService.search(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  // Current active article
  const currentArticle = useMemo(() => {
    return (
      WikiService.getArticleBySlug(activeArticleSlug) ||
      searchResults[0]?.article ||
      WikiService.getAllArticles()[0]
    );
  }, [activeArticleSlug, searchResults]);

  // Related articles
  const relatedArticles = useMemo(() => {
    if (!currentArticle) return [];
    return WikiService.getRelatedArticles(currentArticle.id, 3);
  }, [currentArticle]);

  // Filtered Glossary terms
  const glossaryTerms = useMemo(() => {
    return WikiService.getGlossary(searchQuery);
  }, [searchQuery]);

  // PDF Export
  const handleExportPdf = (article: WikiArticle) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Header Branding
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("ATLAS LOGISTICS · KNOWLEDGE HUB", 14, 15);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Categoría: ${article.category}  |  Actualizado: ${article.lastUpdated}  |  Tiempo lectura: ${article.readingTimeMinutes} min`,
      14,
      23,
    );
    if (article.officialRef) {
      doc.text(`Norma Oficial de Referencia: ${article.officialRef}`, 14, 29);
    }

    // Article Title
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    const splitTitle = doc.splitTextToSize(article.title, 180);
    doc.text(splitTitle, 14, 46);

    // Summary box
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(14, 55, 182, 22, 2, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(51, 65, 85);
    const splitSummary = doc.splitTextToSize(
      `Resumen Ejecutivo: ${article.summary}`,
      174,
    );
    doc.text(splitSummary, 18, 62);

    // Article Content Lines
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);

    // Clean markdown hashes and format lines
    const plainLines = article.contentMarkdown
      .split("\n")
      .map((l) =>
        l
          .replace(/^#+\s*/, "")
          .replace(/\*\*/g, "")
          .replace(/\$/g, "")
          .trim(),
      )
      .filter(
        (l) => l.length > 0 && !l.startsWith("```") && !l.startsWith("---"),
      );

    let yOffset = 85;
    for (const line of plainLines) {
      if (yOffset > 275) {
        doc.addPage();
        yOffset = 20;
      }
      const wrapped = doc.splitTextToSize(line, 182);
      doc.text(wrapped, 14, yOffset);
      yOffset += wrapped.length * 4.5 + 2;
    }

    // Footer
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Atlas Logistics PWA · Corredor Oficial Book TEST01 · Página ${i} de ${pageCount}`,
        14,
        290,
      );
    }

    doc.save(`Atlas-Wiki-${article.slug}.pdf`);
  };

  // Copy link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      window.location.origin +
        window.location.pathname +
        `#${currentArticle.slug}`,
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Render formatted markdown helper
  const renderMarkdownContent = (markdown: string) => {
    const lines = markdown.split("\n");
    return (
      <div className="space-y-4 text-slate-300 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // H1
          if (trimmed.startsWith("# ")) {
            return (
              <h1
                key={idx}
                className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200 mt-6 mb-3 border-b border-slate-800 pb-3"
              >
                {trimmed.replace("# ", "")}
              </h1>
            );
          }

          // H2
          if (trimmed.startsWith("## ")) {
            return (
              <h2
                key={idx}
                className="text-xl font-bold text-white mt-6 mb-2 flex items-center gap-2 border-l-4 border-indigo-500 pl-3"
              >
                {trimmed.replace("## ", "")}
              </h2>
            );
          }

          // H3
          if (trimmed.startsWith("### ")) {
            return (
              <h3
                key={idx}
                className="text-base font-semibold text-indigo-300 mt-4 mb-1"
              >
                {trimmed.replace("### ", "")}
              </h3>
            );
          }

          // Warning / Alert Callout
          if (trimmed.startsWith("> [!WARNING]")) {
            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm flex gap-3 my-3"
              >
                <div className="shrink-0 font-bold uppercase tracking-wider text-xs bg-amber-500/20 px-2 py-1 rounded">
                  Aviso Crítico
                </div>
              </div>
            );
          }

          // Horizontal rule
          if (trimmed === "---") {
            return <hr key={idx} className="border-slate-800 my-4" />;
          }

          // Unordered list item
          if (trimmed.startsWith("- ")) {
            const itemText = trimmed.replace("- ", "");
            return (
              <li
                key={idx}
                className="ml-5 list-disc text-sm text-slate-300 marker:text-indigo-400"
              >
                <span
                  dangerouslySetInnerHTML={{ __html: formatInline(itemText) }}
                />
              </li>
            );
          }

          // Numbered list item
          if (/^\d+\.\s/.test(trimmed)) {
            const match = trimmed.match(/^(\d+\.)\s*(.*)$/);
            if (match) {
              return (
                <div key={idx} className="flex gap-2 text-sm ml-2">
                  <span className="font-bold text-indigo-400 shrink-0">
                    {match[1]}
                  </span>
                  <span
                    dangerouslySetInnerHTML={{ __html: formatInline(match[2]) }}
                  />
                </div>
              );
            }
          }

          // Regular paragraph
          if (trimmed.length > 0) {
            return (
              <p
                key={idx}
                className="text-sm text-slate-300"
                dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
              />
            );
          }

          return null;
        })}
      </div>
    );
  };

  // Simple inline parser for bold, code, and LaTeX badges
  const formatInline = (text: string) => {
    return text
      .replace(
        /\*\*(.*?)\*\*/g,
        '<strong class="text-white font-semibold">$1</strong>',
      )
      .replace(
        /`([^`]+)`/g,
        '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-xs border border-slate-700">$1</code>',
      )
      .replace(
        /\$\$(.*?)\$\$/g,
        '<span class="inline-block px-2 py-1 rounded bg-indigo-950/50 text-indigo-200 border border-indigo-800/60 font-mono text-xs my-1">$1</span>',
      )
      .replace(
        /\$(.*?)\$/g,
        '<span class="px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-200 font-mono text-xs">$1</span>',
      );
  };

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 space-y-6">
      {/* Top Header & Search Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/80 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
              <Sparkles size={14} className="text-indigo-400" />
              Atlas Logistics PWA · Knowledge Base & Wiki
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 tracking-tight">
              Enciclopedia Logística & Normativa Operativa
            </h1>
            <p className="text-sm md:text-base text-slate-400 max-w-2xl mt-1">
              Manuales de estiba 40' HC, cálculo DUA 54 Casillas, Incoterms®
              2020, IATA e-Freight, Corredor Oficial Book TEST01 y glosario
              internacional.
            </p>
          </div>

          {/* Tab Selector: Articles vs Glossary */}
          <div className="flex bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 shrink-0 self-start md:self-auto">
            <button
              onClick={() => setActiveTab("ARTICLES")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "ARTICLES"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText size={16} />
              Manuales & Normativas ({WikiService.getAllArticles().length})
            </button>
            <button
              onClick={() => setActiveTab("GLOSSARY")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "GLOSSARY"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen size={16} />
              Glosario A-Z ({glossaryTerms.length})
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="mt-6 relative max-w-3xl">
          <div className="relative flex items-center">
            <Search
              className="absolute left-4 text-slate-400 pointer-events-none"
              size={20}
            />
            <input
              id="wiki-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por término, casilla DUA, peso legal, norma Incoterm, o código IATA... (Presiona Ctrl+K)"
              className="w-full pl-12 pr-28 py-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-14 text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded"
              >
                Limpiar
              </button>
            )}
            <kbd className="absolute right-3.5 hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-semibold text-slate-400 bg-slate-800 border border-slate-700 rounded-md">
              Ctrl K
            </kbd>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "ARTICLES" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar: Categories & Article List */}
          <div className="lg:col-span-4 space-y-6">
            {/* Category Filter Pills */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-400" />
                  Categorías de Conocimiento
                </span>
                {selectedCategory !== "ALL" && (
                  <button
                    onClick={() => setSelectedCategory("ALL")}
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    Ver todas
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory === "ALL"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800/80 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  Todas ({WikiService.getAllArticles().length})
                </button>
                {categories.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.id] || BookOpen;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <Icon
                        size={13}
                        className={
                          isSelected ? "text-white" : "text-indigo-400"
                        }
                      />
                      <span>{cat.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/60 text-slate-400 font-mono">
                        {cat.articleCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Articles List matching query */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                <span>Documentos Encontrados ({searchResults.length})</span>
                {searchQuery && (
                  <span className="text-indigo-400 font-mono">
                    "{searchQuery}"
                  </span>
                )}
              </div>

              {searchResults.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  <HelpCircle
                    size={32}
                    className="mx-auto mb-2 text-slate-600"
                  />
                  No se han encontrado artículos que coincidan con la búsqueda.
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {searchResults.map(({ article, snippet }) => {
                    const isActive = currentArticle?.id === article.id;
                    const Icon = CATEGORY_ICONS[article.category] || BookOpen;
                    return (
                      <div
                        key={article.id}
                        onClick={() => setActiveArticleSlug(article.slug)}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isActive
                            ? "bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10"
                            : "bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/50 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400">
                            <Icon size={12} />
                            {article.category.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                            <Clock size={10} />
                            {article.readingTimeMinutes} min
                          </span>
                        </div>
                        <h4
                          className={`text-sm font-bold line-clamp-2 ${
                            isActive ? "text-white" : "text-slate-200"
                          }`}
                        >
                          {article.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                          {snippet || article.summary}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Main Column: Active Article Reader */}
          <div className="lg:col-span-8">
            {currentArticle ? (
              <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6">
                {/* Article Header & Actions */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-800 pb-6">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
                        {currentArticle.category.replace(/_/g, " ")}
                      </span>
                      {currentArticle.officialRef && (
                        <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs">
                          {currentArticle.officialRef}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                      {currentArticle.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1 font-mono">
                      <span className="flex items-center gap-1.5">
                        <User size={13} className="text-slate-500" />
                        {currentArticle.author}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-500" />
                        Lectura: {currentArticle.readingTimeMinutes} minutos
                      </span>
                      <span>Actualizado: {currentArticle.lastUpdated}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportPdf(currentArticle)}
                      className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5"
                    >
                      <Download size={14} />
                      Exportar PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5"
                    >
                      {copiedLink ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                      {copiedLink ? "Copiado" : "Enlace"}
                    </Button>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag size={13} className="text-slate-500 mr-1" />
                  {currentArticle.tags.map((tag) => (
                    <span
                      key={tag}
                      onClick={() => setSearchQuery(tag)}
                      className="px-2 py-0.5 rounded bg-slate-800/70 border border-slate-700 text-slate-300 text-xs font-mono hover:border-indigo-500 cursor-pointer transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Executive Summary Callout */}
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-indigo-200 text-sm leading-relaxed">
                  <strong className="text-white block mb-1">
                    Resumen Ejecutivo:
                  </strong>
                  {currentArticle.summary}
                </div>

                {/* Article Markdown Body */}
                <div className="pt-2">
                  {renderMarkdownContent(currentArticle.contentMarkdown)}
                </div>

                {/* Related Articles Footer */}
                {relatedArticles.length > 0 && (
                  <div className="mt-12 pt-6 border-t border-slate-800">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <BookmarkCheck size={16} className="text-indigo-400" />
                      Artículos y Normativas Relacionadas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {relatedArticles.map((rel) => (
                        <div
                          key={rel.id}
                          onClick={() => setActiveArticleSlug(rel.slug)}
                          className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500 hover:bg-slate-800/40 cursor-pointer transition-all"
                        >
                          <span className="text-[10px] font-semibold text-indigo-400 uppercase">
                            {rel.category.replace(/_/g, " ")}
                          </span>
                          <h5 className="text-xs font-bold text-white line-clamp-2 mt-1">
                            {rel.title}
                          </h5>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2 font-mono">
                            <span>Leer artículo</span>
                            <ChevronRight size={12} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500">
                Selecciona un artículo del panel izquierdo para comenzar a leer.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Glossary View (Card Grid) */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Términos Oficiales & Acrónimos de Comercio Internacional (
              {glossaryTerms.length})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {glossaryTerms.map((g) => (
              <div
                key={g.term}
                className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition-all backdrop-blur-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-base font-black text-white tracking-wide">
                      {g.term}
                    </span>
                    {g.standardOrg && (
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] font-semibold">
                        {g.standardOrg}
                      </span>
                    )}
                  </div>
                  <span className="inline-block text-[11px] text-slate-400 font-medium mb-3">
                    {g.category}
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {g.definition}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
