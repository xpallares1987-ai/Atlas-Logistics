import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  FileSpreadsheet,
  FileCode2,
  FileIcon,
  Calendar,
  Search,
  Upload,
  Download,
  AlertCircle,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function DocumentVaultModule() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/documents`);
      if (!res.ok) throw new Error("Failed to load documents");
      return res.json();
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "General");
      // Add a mock shipment ID so it maps well
      formData.append("shipmentId", "sh_demo_999");
      
      const res = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      
      await refetch();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes("Invoice") || type.includes("HBL"))
      return <FileText className="w-8 h-8 text-indigo-400" />;
    if (type.includes("List"))
      return <FileSpreadsheet className="w-8 h-8 text-emerald-400" />;
    if (type.includes("Customs"))
      return <FileCode2 className="w-8 h-8 text-amber-400" />;
    return <FileIcon className="w-8 h-8 text-slate-400" />;
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
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Header & Search Bar */}
      <div className="relative z-10 p-6 md:p-10 border-b border-white/10 bg-slate-900/50 backdrop-blur-2xl">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[1600px] mx-auto"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-emerald-400 to-emerald-200 mb-2 tracking-tight flex items-center gap-3">
                <FileText className="w-8 h-8 text-indigo-400" />
                Document Vault
              </h1>
              <p className="text-slate-400 font-medium max-w-2xl">
                Secure enterprise repository for all logistics documentation. Easily upload, generate, and track shipping documents.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 border border-white/10 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                Upload Document
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row items-center gap-4 bg-white/5 backdrop-blur-xl p-3 md:p-4 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex-1 min-w-[250px] w-full relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-indigo-400 group-focus-within:text-indigo-300 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search documents, shipment IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/50 hover:bg-slate-950/80 focus:bg-slate-950 border border-white/5 focus:border-indigo-500/50 text-white placeholder-slate-500 rounded-xl py-3.5 pl-12 pr-4 outline-none transition-all"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-950/50 rounded-xl border border-white/5 w-full md:w-auto">
              {uniqueTypes.map((type: any) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${
                    typeFilter === type 
                      ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" 
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 md:p-10 relative">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 z-10 relative gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-indigo-400"></div>
            <p className="text-indigo-400 font-medium animate-pulse">Loading secure vault...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 z-10 relative text-center bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md max-w-[1600px] mx-auto p-12">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Documents Found</h3>
            <p className="text-slate-400">Upload a new document or adjust your search filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 max-w-[1600px] mx-auto z-10 relative">
            <AnimatePresence>
              {filteredDocs.map((doc: any, idx: number) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  key={doc.id}
                  onClick={() => {
                    if(doc.url) window.open(doc.url, "_blank");
                  }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-indigo-400/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer group flex flex-col relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:scale-110 group-hover:bg-white/10 transition-all shadow-inner">
                      {getFileIcon(doc.type)}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="p-2 text-slate-400 hover:text-white bg-slate-950/50 hover:bg-indigo-500/20 rounded-lg transition-colors border border-transparent hover:border-indigo-500/30"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h3
                    className="font-bold text-white text-base mb-1 truncate relative z-10"
                    title={doc.name}
                  >
                    {doc.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-4 relative z-10">
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-white/10 border border-white/5 text-slate-300 uppercase tracking-wider">
                      {doc.type}
                    </span>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-white/10 relative z-10">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-1.5 font-medium">
                      <Search className="w-3.5 h-3.5 text-indigo-400" /> Ref:{" "}
                      <span className="text-slate-300">{doc.shipmentId?.substring(0, 8) || "N/A"}</span>
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />{" "}
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
