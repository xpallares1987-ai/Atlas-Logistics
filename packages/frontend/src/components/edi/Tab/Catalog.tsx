/**
 * @file Catalog.tsx
 * @description UN/EDIFACT (~212 official message codes) & UN/CEFACT XML Schemas catalog
 * with live SQLite-backed CII and MMT-RDM XML export generators.
 * @module @atlas/frontend/components/edi/Tab/Catalog
 */

import { useEffect, useState } from "react";
import {
  BookOpen,
  Code2,
  Copy,
  Download,
  FileCode2,
  Filter,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { authFetch } from "../../../lib/api";

interface EdifactCatalogItem {
  code: string;
  nameEn: string;
  nameEs: string;
  functionalDomain: string;
  isLogisticsCore: boolean;
  typicalSenderTypes: string[];
  typicalReceiverTypes: string[];
  directoryVersion: string;
  supportsLiveEngine: boolean;
}

interface UncefactXmlSchemaItem {
  code: string;
  name: string;
  standardFamily: string;
  releaseVersion: string;
  rootElement: string;
  namespaceUri: string;
  schemaUrl: string;
  edifactEquivalents: string[];
  applicableEntityTypes: string[];
  supportsLiveGenerator: boolean;
  description: string;
}

const DOMAIN_OPTIONS = [
  { value: "ALL", label: "All Domains" },
  { value: "MARITIME_CONTAINER", label: "Maritime & Container" },
  { value: "TRANSPORT_FORWARDING", label: "Transport & Forwarding" },
  { value: "CUSTOMS_REGULATORY", label: "Customs & Regulatory" },
  { value: "ORDER_FULFILLMENT", label: "Order & Fulfillment" },
  { value: "FINANCE_BANKING", label: "Finance & Banking" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "CONSTRUCTION_PROJECT", label: "Construction & Project" },
  { value: "GOVERNMENT_ADMIN", label: "Government & Admin" },
  { value: "HEALTHCARE", label: "Healthcare" },
  { value: "TRAVEL_TOURISM", label: "Travel & Tourism" },
  { value: "UTILITIES_OTHER", label: "Utilities & Directory" },
];

export function EdiCatalogTab() {
  const [edifactList, setEdifactList] = useState<EdifactCatalogItem[]>([]);
  const [xmlSchemas, setXmlSchemas] = useState<UncefactXmlSchemaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState("ALL");
  const [logisticsOnly, setLogisticsOnly] = useState(true);

  // Live UN/CEFACT XML Generator state
  const [generatingSchema, setGeneratingSchema] = useState<string | null>(null);
  const [generatedXml, setGeneratedXml] = useState<{
    schemaCode: string;
    documentId: string;
    sourceEntityId: string;
    xml: string;
  } | null>(null);
  const [generatorError, setGeneratorError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadCatalogs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (domain !== "ALL") params.set("domain", domain);
        if (logisticsOnly) params.set("isLogisticsCore", "true");
        if (search.trim()) params.set("q", search.trim());

        const [ediRes, xmlRes] = await Promise.all([
          authFetch(`/api/edi/edifact-catalog?${params.toString()}`),
          authFetch("/api/edi/uncefact-catalog"),
        ]);

        if (active && ediRes.ok) {
          const ediJson = await ediRes.json();
          setEdifactList(ediJson.data || []);
        }
        if (active && xmlRes.ok) {
          const xmlJson = await xmlRes.json();
          setXmlSchemas(xmlJson.data || []);
        }
      } catch (err) {
        console.error("Failed to load UN/EDIFACT & UN/CEFACT catalogs:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadCatalogs();
    return () => {
      active = false;
    };
  }, [domain, logisticsOnly, search]);

  const handleGenerateXml = async (schemaCode: "CII" | "MMT_CONSIGNMENT") => {
    setGeneratingSchema(schemaCode);
    setGeneratorError(null);
    try {
      const endpoint =
        schemaCode === "CII"
          ? "/api/edi/uncefact/generate/cii"
          : "/api/edi/uncefact/generate/mmt-rdm";
      const res = await authFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          schemaCode === "MMT_CONSIGNMENT" ? { shipmentId: "sh_demo_01" } : {},
        ),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "XML generation failed");
      }
      setGeneratedXml(json.data);
    } catch (err: unknown) {
      setGeneratorError(
        err instanceof Error ? err.message : "Failed to generate UN/CEFACT XML",
      );
    } finally {
      setGeneratingSchema(null);
    }
  };

  const handleDownloadXml = () => {
    if (!generatedXml) return;
    const blob = new Blob([generatedXml.xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generatedXml.schemaCode}_${generatedXml.documentId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Section 1: UN/CEFACT XML Schemas & Live Generators */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              UN/CEFACT XML Schemas & Live SQLite Generators (
              {xmlSchemas.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Official UNECE XML standards (CII D23B, MMT-RDM
              eBL/e-CMR/Consignment, SCRDM) backed by real SQLite invoices and
              shipments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={generatingSchema !== null}
              onClick={() => handleGenerateXml("CII")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {generatingSchema === "CII" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Generate CII Invoice XML
            </button>
            <button
              type="button"
              disabled={generatingSchema !== null}
              onClick={() => handleGenerateXml("MMT_CONSIGNMENT")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {generatingSchema === "MMT_CONSIGNMENT" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileCode2 className="w-3.5 h-3.5" />
              )}
              Generate MMT-RDM Consignment XML
            </button>
          </div>
        </div>

        {generatorError && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {generatorError}
          </div>
        )}

        {generatedXml && (
          <div className="rounded-xl border border-emerald-500/30 bg-slate-950 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-emerald-400 font-semibold">
                {generatedXml.schemaCode} · Doc: {generatedXml.documentId}{" "}
                (Source: {generatedXml.sourceEntityId})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(generatedXml.xml)
                  }
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <button
                  type="button"
                  onClick={handleDownloadXml}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white"
                >
                  <Download className="w-3 h-3" /> Download .xml
                </button>
              </div>
            </div>
            <pre className="max-h-64 overflow-auto text-[11px] font-mono text-slate-200 bg-black/50 p-3 rounded-lg whitespace-pre-wrap">
              {generatedXml.xml}
            </pre>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {xmlSchemas.map((schema) => (
            <div
              key={schema.code}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white">
                  {schema.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {schema.standardFamily} · {schema.releaseVersion}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{schema.description}</p>
              <div className="text-[10px] font-mono text-slate-500 truncate">
                {schema.namespaceUri}
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {(schema.edifactEquivalents || []).map((eqCode) => (
                  <span
                    key={eqCode}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  >
                    EDIFACT: {eqCode}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Official UN/EDIFACT Message Directory (~212 Codes) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Official UN/EDIFACT Message Directory ({edifactList.length} shown)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Canonical 6-character UN/EDIFACT D.23B catalog mapped to the
              25-code Logistics Entity Taxonomy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search CODECO, IFTMIN, CUSDEC..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="bg-transparent text-xs text-slate-200 outline-none"
              >
                {DOMAIN_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="bg-slate-900"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={logisticsOnly}
                onChange={(e) => setLogisticsOnly(e.target.checked)}
                className="rounded border-slate-600 bg-slate-950 text-indigo-500"
              />
              Logistics Core Only
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            Loading official UN/EDIFACT directory...
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2 font-semibold">Code</th>
                  <th className="px-3 py-2 font-semibold">
                    Official Title (EN / ES)
                  </th>
                  <th className="px-3 py-2 font-semibold">Domain</th>
                  <th className="px-3 py-2 font-semibold">
                    Senders → Receivers (25-Code)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {edifactList.map((item) => (
                  <tr
                    key={item.code}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-3 py-2 font-mono font-bold text-indigo-300 whitespace-nowrap">
                      {item.code}
                      {item.supportsLiveEngine && (
                        <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          LIVE
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-slate-100 font-medium">
                        {item.nameEn}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.nameEs}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                      {item.functionalDomain}
                    </td>
                    <td className="px-3 py-2">
                      {item.typicalSenderTypes?.length > 0 ||
                      item.typicalReceiverTypes?.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
                          {(item.typicalSenderTypes || []).map((s) => (
                            <span
                              key={`s-${s}`}
                              className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300"
                            >
                              {s}
                            </span>
                          ))}
                          <span className="text-slate-500">→</span>
                          {(item.typicalReceiverTypes || []).map((r) => (
                            <span
                              key={`r-${r}`}
                              className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
