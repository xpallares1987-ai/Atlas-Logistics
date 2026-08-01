import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Search,
  Download,
  Filter,
  FileCode2,
  FileSpreadsheet,
  FileIcon,
  Calendar,
} from "lucide-react";
import { DocumentPreviewer } from "@atlas/ui/src/components/DocumentPreviewer";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function DocumentVaultModule() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/documents`);
      if (!res.ok) throw new Error("Failed to load documents");
      return res.json();
    },
  });

  const getFileIcon = (type: string) => {
    if (type.includes("Invoice") || type.includes("HBL"))
      return <FileText className="w-8 h-8 text-indigo-500" />;
    if (type.includes("List"))
      return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    if (type.includes("Customs"))
      return <FileCode2 className="w-8 h-8 text-amber-500" />;
    return <FileIcon className="w-8 h-8 text-slate-500" />;
  };

  const filteredDocs = documents.filter((doc: any) => {
    const matchesSearch =
      (doc.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (doc.shipmentId?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "ALL" || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const uniqueTypes = ["ALL", ...new Set(documents.map((d: any) => d.type))];

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col font-sans">
      {/* Header Area */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            Document Vault
          </h1>
          <p className="text-slate-500 mt-1 ml-14 text-sm font-medium">
            Secure repository for all logistics documentation
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search documents, shipment IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64"
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {uniqueTypes.map((type: any) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${typeFilter === type ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 max-w-[1600px] mx-auto">
            <AnimatePresence>
              {filteredDocs.map((doc: any, idx: number) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
                      {getFileIcon(doc.type)}
                    </div>
                    <button
                      className="text-slate-300 hover:text-indigo-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(doc.url || "#", "_blank");
                      }}
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                  <h3
                    className="font-bold text-slate-800 text-sm mb-1 truncate"
                    title={doc.name}
                  >
                    {doc.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider">
                      {doc.type}
                    </span>
                  </div>
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                      <Search className="w-3.5 h-3.5" /> Ref:{" "}
                      {doc.shipmentId?.substring(0, 8) || "N/A"}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />{" "}
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredDocs.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700">
                  No documents found
                </h3>
                <p className="text-slate-500">
                  Try adjusting your filters or search query.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {selectedDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-black text-slate-800 flex items-center gap-2">
                {getFileIcon(selectedDoc.type)}
                {selectedDoc.name}
              </h2>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-2"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-100 p-8">
              {/* Reuse the existing DocumentPreviewer for HBLs, otherwise just show a generic placeholder since we only have HBL built */}
              {selectedDoc.type === "HBL" ? (
                <DocumentPreviewer
                  type="HBL"
                  reference={`HBL-${selectedDoc.shipmentId?.substring(0, 8)}`}
                  shipper="Atlas Global Logistics"
                  consignee="Tech Imports Inc."
                  vessel="MSC AMSTERDAM"
                  pol="CNSHA"
                  pod="ESBCN"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <FileText className="w-16 h-16 mb-4 text-slate-300" />
                  <p className="font-bold text-lg text-slate-500">
                    Preview not available for {selectedDoc.type}
                  </p>
                  <p className="text-sm mt-2">
                    Download the file to view its contents.
                  </p>
                  <a
                    href={selectedDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
