import { useState, useMemo } from "react";
import { useApiQuery } from "../hooks/useApiQuery";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  Search,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Calculator,
  Activity,
  UploadCloud,
  FileText,
  Clock,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Input } from "@atlas/ui";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function CustomsClearanceModule() {
  const queryClient = useQueryClient();
  const { data: customsData, isLoading } = useApiQuery<any[]>(
    ["customs"],
    "/customs-declarations",
  );
  const declarations = Array.isArray(customsData) ? customsData : [];

  const [activeFilter, setActiveFilter] = useState<
    "All" | "Hold" | "Pending" | "Cleared"
  >("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDecl, setSelectedDecl] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: docsData } = useApiQuery<any[]>(
    ["documents", selectedDecl?.shipmentId],
    `/documents?shipmentId=${selectedDecl?.shipmentId}`,
    { enabled: !!selectedDecl?.shipmentId },
  );
  const realDocs = Array.isArray(docsData) ? docsData : [];

  const filteredDeclarations = useMemo(() => {
    return declarations.filter((dec) => {
      const matchesSearch =
        (dec.blNumber &&
          dec.blNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        dec.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        activeFilter === "All"
          ? true
          : activeFilter === "Hold"
            ? dec.status === "Red Channel" || dec.status === "Hold"
            : activeFilter === "Pending"
              ? dec.status === "Pending" || dec.status === "Orange Channel"
              : activeFilter === "Cleared"
                ? dec.status === "Green Channel" || dec.status === "Cleared"
                : true;
      return matchesSearch && matchesFilter;
    });
  }, [declarations, searchQuery, activeFilter]);

  // Set initial selected declaration
  useMemo(() => {
    if (!selectedDecl && filteredDeclarations.length > 0) {
      setSelectedDecl(filteredDeclarations[0]);
    } else if (filteredDeclarations.length === 0) {
      setSelectedDecl(null);
    }
  }, [filteredDeclarations, selectedDecl]);

  const holds = declarations.filter(
    (d) => d.status === "Red Channel" || d.status === "Hold",
  );

  const getStatusVisuals = (status: string) => {
    switch (status) {
      case "Green Channel":
      case "Cleared":
        return {
          icon: CheckCircle2,
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
        };
      case "Red Channel":
      case "Hold":
        return {
          icon: AlertCircle,
          color: "text-rose-400",
          bg: "bg-rose-500/10",
          border: "border-rose-500/20",
          glow: "shadow-[0_0_15px_rgba(244,63,94,0.15)]",
        };
      case "Orange Channel":
      case "Pending":
        return {
          icon: Clock,
          color: "text-amber-400",
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
          glow: "shadow-[0_0_15px_rgba(245,158,11,0.1)]",
        };
      default:
        return {
          icon: FileCheck,
          color: "text-slate-400",
          bg: "bg-slate-500/10",
          border: "border-slate-500/20",
          glow: "",
        };
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!selectedDecl || !selectedDecl.shipmentId) return;

    setIsUploading(true);
    const files = Array.from(e.dataTransfer.files);

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "Customs Document");
      formData.append("shipmentId", selectedDecl.shipmentId);

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || "/api"}/documents/upload`,
          {
            method: "POST",
            body: formData,
          },
        );
        if (!res.ok) throw new Error("Upload failed");
      } catch (err) {
        console.error(err);
      }
    }

    await queryClient.invalidateQueries({
      queryKey: ["documents", selectedDecl.shipmentId],
    });
    setIsUploading(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-rose-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Header & Holds Alert */}
      <div className="px-8 pt-8 pb-4 shrink-0 z-10 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
              <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400">
                <ShieldAlert className="w-7 h-7" />
              </div>
              Customs Clearance
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              Manage declarations, upload documents, and track clearance
              lifecycle.
            </p>
          </div>
        </div>

        <AnimatePresence>
          {holds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_30px_rgba(244,63,94,0.1)] mb-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-rose-300">
                    Action Required: Customs Hold
                  </h3>
                  <p className="text-sm text-rose-200/70">
                    You have {holds.length} shipment(s) currently flagged for
                    physical inspection or missing documentation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveFilter("Hold")}
                className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-sm font-medium transition-colors border border-rose-500/20"
              >
                View Holds
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Split Pane */}
      <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
        {/* Left Pane: Declarations List */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
          <div className="p-4 border-b border-white/10 space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Search B/L or Dec ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {(["All", "Pending", "Hold", "Cleared"] as const).map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${
                      activeFilter === filter
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    {filter}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {isLoading ? (
              <div className="text-center p-8 text-slate-500">Loading...</div>
            ) : filteredDeclarations.length === 0 ? (
              <div className="text-center p-8 text-slate-500 flex flex-col items-center">
                <FileCheck className="w-8 h-8 opacity-50 mb-2" />
                <p>No declarations found</p>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-2"
                key={activeFilter + searchQuery}
              >
                {filteredDeclarations.map((dec) => {
                  const visuals = getStatusVisuals(dec.status);
                  const StatusIcon = visuals.icon;
                  const isSelected = selectedDecl?.id === dec.id;

                  return (
                    <motion.button
                      key={dec.id}
                      variants={itemVariants}
                      onClick={() => setSelectedDecl(dec)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                        isSelected
                          ? "bg-white/10 border-white/20 shadow-lg"
                          : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-xl mt-1 ${visuals.bg} ${visuals.border} border ${visuals.glow}`}
                          >
                            <StatusIcon
                              className={`w-4 h-4 ${visuals.color}`}
                            />
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm tracking-wide">
                              {dec.id.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-xs text-slate-400 mb-2">
                              B/L: {dec.blNumber || "N/A"}
                            </p>

                            {/* Status Pill */}
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${visuals.bg} ${visuals.border} ${visuals.color}`}
                            >
                              {dec.status}
                            </span>
                          </div>
                        </div>
                        {dec.aiRiskScore && (
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-slate-500 mb-1">
                              AI RISK
                            </span>
                            <span
                              className={`text-lg font-black ${dec.aiRiskScore > 60 ? "text-rose-400" : dec.aiRiskScore > 30 ? "text-amber-400" : "text-emerald-400"}`}
                            >
                              {dec.aiRiskScore}%
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Pane: Declaration Details & Workflow Wizard */}
        <div className="w-full lg:w-2/3 bg-slate-900/50 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative min-h-[600px] lg:min-h-0">
          {!selectedDecl ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <ShieldAlert className="w-16 h-16 opacity-20 mb-4" />
              <p>Select a declaration to view details</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              {/* Top Banner */}
              <div className="p-8 border-b border-white/10 bg-white/5 relative overflow-hidden">
                {/* Decorative BG */}
                <div
                  className={`absolute top-0 right-0 w-64 h-64 blur-3xl opacity-20 pointer-events-none rounded-full translate-x-1/2 -translate-y-1/2 ${getStatusVisuals(
                    selectedDecl.status,
                  ).color.replace("text-", "bg-")}`}
                />

                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-wider mb-2">
                      DEC-{selectedDecl.id.slice(0, 8).toUpperCase()}
                    </h2>
                    <p className="text-slate-400 flex gap-4">
                      <span>
                        Type:{" "}
                        <strong className="text-slate-200">
                          {selectedDecl.type || "Import"}
                        </strong>
                      </span>
                      <span>
                        B/L:{" "}
                        <strong className="text-slate-200">
                          {selectedDecl.blNumber || "N/A"}
                        </strong>
                      </span>
                    </p>
                  </div>

                  {/* AI Circular Progress (Likelihood of Clearance) */}
                  <div className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-2xl border border-white/5 shadow-inner">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      {/* SVG Circle for Progress */}
                      <svg
                        className="w-full h-full transform -rotate-90"
                        viewBox="0 0 100 100"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-slate-800"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray="251.2"
                          strokeDashoffset={
                            251.2 -
                            (251.2 * (100 - (selectedDecl.aiRiskScore || 10))) /
                              100
                          }
                          className={`${(selectedDecl.aiRiskScore || 10) > 60 ? "text-rose-500" : (selectedDecl.aiRiskScore || 10) > 30 ? "text-amber-500" : "text-emerald-500"} transition-all duration-1000 ease-out`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-sm font-black text-white">
                          {100 - (selectedDecl.aiRiskScore || 10)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Clearance
                      </p>
                      <p className="text-sm text-slate-300">Likelihood</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Workflow Stepper */}
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-400" />{" "}
                      Declaration Lifecycle
                    </h3>

                    <div className="space-y-0 relative">
                      {/* Connecting Line */}
                      <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-slate-800" />

                      {/* Step 1 */}
                      <div className="relative flex gap-6 pb-8">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shrink-0 z-10">
                          <Check className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="pt-2">
                          <h4 className="text-sm font-bold text-white">
                            Draft Created
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">
                            Basic shipment details gathered and HS codes
                            applied.
                          </p>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="relative flex gap-6 pb-8">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 ${
                            selectedDecl.status === "Draft"
                              ? "bg-slate-900 border-slate-700"
                              : "bg-emerald-500/20 border-emerald-500"
                          }`}
                        >
                          {selectedDecl.status === "Draft" ? (
                            <div className="w-3 h-3 rounded-full bg-slate-500" />
                          ) : (
                            <Check className="w-5 h-5 text-emerald-400" />
                          )}
                        </div>
                        <div className="pt-2">
                          <h4 className="text-sm font-bold text-white">
                            Documents Uploaded
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">
                            Commercial Invoice, Packing List, and BL attached.
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="relative flex gap-6 pb-8">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 ${
                            selectedDecl.status === "Draft" ||
                            selectedDecl.status === "Pending"
                              ? "bg-indigo-500/20 border-indigo-500"
                              : selectedDecl.status === "Red Channel" ||
                                  selectedDecl.status === "Hold"
                                ? "bg-rose-500/20 border-rose-500"
                                : "bg-emerald-500/20 border-emerald-500"
                          }`}
                        >
                          {selectedDecl.status === "Red Channel" ||
                          selectedDecl.status === "Hold" ? (
                            <X className="w-5 h-5 text-rose-400" />
                          ) : selectedDecl.status === "Draft" ||
                            selectedDecl.status === "Pending" ? (
                            <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                          ) : (
                            <Check className="w-5 h-5 text-emerald-400" />
                          )}
                        </div>
                        <div className="pt-2">
                          <h4 className="text-sm font-bold text-white">
                            Customs Review
                          </h4>
                          {selectedDecl.status === "Red Channel" ||
                          selectedDecl.status === "Hold" ? (
                            <div className="mt-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                              <p className="text-xs font-medium text-rose-300">
                                Shipment flagged for physical inspection.
                                Awaiting port authority clearance.
                              </p>
                            </div>
                          ) : selectedDecl.status === "Draft" ||
                            selectedDecl.status === "Pending" ? (
                            <p className="text-xs text-slate-400 mt-1">
                              Awaiting assessment from customs officials.
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 mt-1">
                              Review completed successfully.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className="relative flex gap-6">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 ${
                            selectedDecl.status === "Green Channel" ||
                            selectedDecl.status === "Cleared"
                              ? "bg-emerald-500/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                              : "bg-slate-900 border-slate-700"
                          }`}
                        >
                          {selectedDecl.status === "Green Channel" ||
                          selectedDecl.status === "Cleared" ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-slate-500" />
                          )}
                        </div>
                        <div className="pt-2">
                          <h4 className="text-sm font-bold text-white">
                            Cleared for Entry
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">
                            Duties paid and goods released.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Documents & AI */}
                <div className="space-y-6">
                  {/* Drag and Drop Zone */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-white/20 hover:border-indigo-500/50 bg-white/5 hover:bg-indigo-500/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                        <p className="text-indigo-400 font-medium">
                          Scanning Document...
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <h4 className="text-white font-bold mb-2">
                          Upload Supporting Documents
                        </h4>
                        <p className="text-xs text-slate-400 max-w-[200px]">
                          Drag & drop Commercial Invoices or Packing Lists here,
                          or click to browse.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Uploaded Docs List */}
                  {realDocs.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                        Attached Documents
                      </h4>
                      <div className="space-y-2">
                        {realDocs.map((doc, i) => (
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={doc.id || i}
                            className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-indigo-400" />
                              <div>
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm font-medium text-slate-200 hover:text-indigo-300"
                                >
                                  {doc.name}
                                </a>
                                <p className="text-[10px] text-slate-500">
                                  {doc.type}
                                </p>
                              </div>
                            </div>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Duty Calculator summary */}
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-emerald-400" />{" "}
                        Estimated Duties
                      </h4>
                      <span className="text-xs font-mono text-slate-400">
                        HS: 8517.12.00
                      </span>
                    </div>
                    <div className="text-3xl font-black text-emerald-400 mb-2">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(selectedDecl.dutiesAmount || 2450.0)}
                    </div>
                    <p className="text-xs text-slate-500">
                      Auto-calculated based on HS code and declared value of
                      goods via AI scanning.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
