import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  Upload,
  Copy,
  ExternalLink,
  Eye,
  RefreshCw,
  Ship,
  Plane,
  Truck,
  TrainTrack,
  FileCheck,
  Snowflake,
  Leaf,
  Anchor,
  FileSignature,
  ShieldAlert,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";
import { Input, Button } from "@atlas/ui";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

interface DocumentTemplate {
  type: string;
  name: string;
  domain: string;
  regulation: string;
  icon: string;
  defaultData: Record<string, any>;
}

interface VaultDocument {
  id: string;
  name: string;
  type: string;
  documentReference?: string;
  sha256Hash?: string;
  status: "DRAFT" | "EMITTED" | "SIGNED" | "REVOKED";
  signedBy?: string;
  signerTitle?: string;
  signerCertificate?: string;
  signedAt?: string | number;
  fileSize?: number;
  url: string;
  createdAt: string | number;
}

export default function DocumentVaultModule() {
  const [activeTab, setActiveTab] = useState<
    "STUDIO" | "VAULT" | "VERIFY" | "UPLOAD"
  >("STUDIO");

  // Document Templates & Selection
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<string>("HBL");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [docReference, setDocReference] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Vault Ledger & Search
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Modal Viewer & Digital Signature
  const [activeModalDoc, setActiveModalDoc] = useState<VaultDocument | null>(null);
  const [modalPdfUrl, setModalPdfUrl] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [selectedSigner, setSelectedSigner] = useState("Carlos Mendoza");
  const [signerTitle, setSignerTitle] = useState("Director de Operaciones & Tráfico");

  // Verification State
  const [verifyQuery, setVerifyQuery] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Manual Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTemplates();
    fetchDocuments();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/documents/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.data || []);
        if (data.data && data.data.length > 0) {
          const first = data.data[0];
          setSelectedType(first.type);
          setFormData(first.defaultData || {});
          setDocReference(`${first.type}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
        }
      }
    } catch (e) {
      console.error("Failed to load templates", e);
    }
  };

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data || []);
      }
    } catch (e) {
      console.error("Failed to load documents", e);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleSelectTemplate = (template: DocumentTemplate) => {
    setSelectedType(template.type);
    setFormData(template.defaultData || {});
    setDocReference(`${template.type}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleGenerateDocument = async (autoSign: boolean = false) => {
    setIsGenerating(true);
    try {
      const signer = autoSign
        ? {
            signedBy: selectedSigner,
            signerTitle,
            signerCertificate: `CERT-ATLAS-${Date.now()}`,
          }
        : undefined;

      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          documentReference: docReference,
          payloadData: formData,
          signer,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchDocuments();
        // Open modal immediately with new document
        openViewerModal(data.data);
      } else {
        alert(`Error al generar documento: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error de red: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const openViewerModal = (doc: VaultDocument) => {
    setActiveModalDoc(doc);
    setModalPdfUrl(`/api/documents/${doc.id}/pdf?t=${Date.now()}`);
  };

  const closeViewerModal = () => {
    setActiveModalDoc(null);
    setModalPdfUrl(null);
  };

  const handleSignDocument = async () => {
    if (!activeModalDoc) return;
    setIsSigning(true);
    try {
      const res = await fetch(`/api/documents/${activeModalDoc.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedBy: selectedSigner,
          signerTitle,
          signerCertificate: `CERT-ATLAS-PKI-${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchDocuments();
        setActiveModalDoc((prev) =>
          prev
            ? {
                ...prev,
                status: "SIGNED",
                signedBy: data.data.signedBy,
                signerTitle: data.data.signerTitle,
                signedAt: data.data.signedAt,
                signerCertificate: data.data.signerCertificate,
              }
            : null,
        );
        alert("¡Documento firmado y sellado criptográficamente con éxito!");
      } else {
        alert(`Error al firmar: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error al firmar: ${err.message}`);
    } finally {
      setIsSigning(false);
    }
  };

  const handleVerify = async (queryToVerify?: string) => {
    const q = (queryToVerify || verifyQuery).trim();
    if (!q) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/documents/verify/${encodeURIComponent(q)}`);
      const data = await res.json();
      setVerifyResult(data);
      if (queryToVerify) {
        setVerifyQuery(queryToVerify);
        setActiveTab("VERIFY");
      }
    } catch (err: any) {
      alert(`Error al verificar: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "Commercial Invoice");

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      await fetchDocuments();
      alert("Archivo subido y registrado en la bóveda.");
    } catch (err: any) {
      alert(err.message || "Error al subir documento");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiado al portapapeles");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "HBL":
        return <Ship className="text-blue-400" size={18} />;
      case "DUA":
        return <FileCheck className="text-amber-400" size={18} />;
      case "ECMR":
        return <Truck className="text-emerald-400" size={18} />;
      case "AWB":
        return <Plane className="text-indigo-400" size={18} />;
      case "CIM":
        return <TrainTrack className="text-orange-400" size={18} />;
      case "INSURANCE_CERT":
        return <ShieldCheck className="text-teal-400" size={18} />;
      case "CONTRACT":
        return <FileSignature className="text-cyan-400" size={18} />;
      case "GDP_CERT":
        return <Snowflake className="text-sky-400" size={18} />;
      case "CBAM_DECLARATION":
        return <Leaf className="text-lime-400" size={18} />;
      case "DGR_DECLARATION":
        return <AlertTriangle className="text-red-400" size={18} />;
      case "AEO_7POINT":
        return <ShieldAlert className="text-violet-400" size={18} />;
      case "LAYTIME_SHEET":
        return <Anchor className="text-amber-500" size={18} />;
      default:
        return <FileText className="text-slate-400" size={18} />;
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      (doc.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (doc.documentReference?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (doc.sha256Hash?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (doc.signedBy?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "ALL" || doc.type === typeFilter;
    const matchesStatus = statusFilter === "ALL" || doc.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6 max-w-7xl mx-auto pb-12"
    >
      {/* Top Header Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-8 shadow-2xl"
      >
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
                <ShieldCheck size={26} />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Official Multimodal Vault & PKI
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Centro de Emisión & Firma Digital
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Generación de documentos oficiales de transporte y aduanas (HBL, DUA, e-CMR, AWB, CIM, GDP, CBAM) con previsualización en vivo, estampa digital criptográfica SHA-256 y verificación de autenticidad inmutable.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/security-risk"
              className="flex items-center gap-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 px-3.5 py-2 rounded-2xl text-indigo-300 text-xs font-semibold transition-all"
            >
              <ShieldAlert size={14} />
              Security & Resilience Center
            </Link>
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-2xl text-emerald-400 text-xs font-semibold">
              <Lock size={14} />
              Bóveda Criptográfica Activa
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-8 border-t border-white/10 pt-4">
          <button
            onClick={() => setActiveTab("STUDIO")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "STUDIO"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles size={16} />
            Centro de Emisión (Studio)
          </button>
          <button
            onClick={() => setActiveTab("VAULT")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "VAULT"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers size={16} />
            Bóveda de Documentos ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab("VERIFY")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "VERIFY"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ShieldCheck size={16} />
            Verificador de Autenticidad SHA-256
          </button>
          <button
            onClick={() => setActiveTab("UPLOAD")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "UPLOAD"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Upload size={16} />
            Carga Manual Externa
          </button>
        </div>
      </motion.div>

      {/* TAB 1: EMISSION STUDIO */}
      {activeTab === "STUDIO" && (
        <motion.div variants={containerVariants} className="flex flex-col gap-6">
          {/* Document Catalog Grid (12 Cards) */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Seleccione el Documento Oficial a Emitir:
            </span>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {templates.map((tpl) => (
                <button
                  key={tpl.type}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`flex flex-col gap-2 p-3.5 rounded-2xl border text-left transition-all ${
                    selectedType === tpl.type
                      ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                      : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-slate-950/60 border border-white/5">
                      {getTypeIcon(tpl.type)}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                      {tpl.domain}
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">{tpl.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{tpl.regulation}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Form & Actions Section */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                  {getTypeIcon(selectedType)}
                </span>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Configuración de Emisión: {templates.find((t) => t.type === selectedType)?.name || selectedType}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Edite los datos o utilice los valores predeterminados para compilar el PDF oficial y estampar el sello digital.
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Referencia Oficial:</span>
                <Input
                  value={docReference}
                  onChange={(e: any) => setDocReference(e.target.value)}
                  className="bg-slate-950 border-slate-800 font-mono text-xs w-48"
                />
              </div>
            </div>

            {/* Dynamic Form Editor */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {Object.keys(formData).map((key) => {
                const val = formData[key];
                if (typeof val === "object") return null; // skip nested arrays for simple view
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-400 capitalize">
                      {key.replace(/([A-Z])/g, " $1")}
                    </label>
                    <Input
                      value={String(val ?? "")}
                      onChange={(e: any) =>
                        setFormData((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      className="bg-slate-950 border-slate-800 text-xs text-slate-200 font-mono"
                    />
                  </div>
                );
              })}
            </div>

            {/* Emission Buttons */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span>La emisión calculará automáticamente la huella criptográfica SHA-256 para trazabilidad legal.</span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => handleGenerateDocument(false)}
                  disabled={isGenerating}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl flex items-center gap-2"
                >
                  <Eye size={16} />
                  {isGenerating ? "Generando..." : "Previsualizar PDF"}
                </Button>
                <Button
                  onClick={() => handleGenerateDocument(true)}
                  disabled={isGenerating}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <Lock size={16} />
                  {isGenerating ? "Generando..." : "Emitir y Firmar Digitalmente"}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: VAULT LEDGER */}
      {activeTab === "VAULT" && (
        <motion.div variants={itemVariants} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers size={20} className="text-indigo-400" />
                Bóveda de Documentos Emitidos
              </h2>
              <p className="text-xs text-slate-400">
                Historial completo de documentos legales emitidos con sus hashes criptográficos y certificados de firma.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Buscar por referencia, hash o firmante..."
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs w-64"
              />

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">Todos los Tipos</option>
                {templates.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.type}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="SIGNED">SIGNED (Firmado)</option>
                <option value="EMITTED">EMITTED (Sin Firmar)</option>
              </select>

              <Button
                onClick={fetchDocuments}
                variant="ghost"
                className="text-slate-400 hover:text-white p-2"
              >
                <RefreshCw size={16} className={isLoadingDocs ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Tipo</th>
                  <th className="p-3.5">Referencia</th>
                  <th className="p-3.5">Huella SHA-256</th>
                  <th className="p-3.5">Firmante</th>
                  <th className="p-3.5">Estado</th>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                      No se encontraron documentos en la bóveda con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2 font-sans font-bold text-white">
                          {getTypeIcon(doc.type)}
                          <span>{doc.type}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-indigo-300">
                        {doc.documentReference || doc.id}
                      </td>
                      <td className="p-3.5">
                        {doc.sha256Hash ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-white/5">
                              {doc.sha256Hash.substring(0, 10)}...{doc.sha256Hash.substring(58)}
                            </span>
                            <button
                              onClick={() => copyToClipboard(doc.sha256Hash!)}
                              className="text-slate-500 hover:text-indigo-400"
                              title="Copiar Hash"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-sans">Sin calcular</span>
                        )}
                      </td>
                      <td className="p-3.5 font-sans">
                        {doc.signedBy ? (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 size={14} />
                            <span className="font-semibold">{doc.signedBy}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Pendiente</span>
                        )}
                      </td>
                      <td className="p-3.5 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.status === "SIGNED"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            onClick={() => openViewerModal(doc)}
                            className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] px-2.5 py-1 rounded-xl h-auto transition-all"
                          >
                            <Eye size={12} className="mr-1 inline" /> Ver PDF
                          </Button>
                          <Button
                            onClick={() => handleVerify(doc.sha256Hash || doc.documentReference)}
                            className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] px-2 py-1 rounded-xl h-auto"
                            title="Verificar Autenticidad"
                          >
                            <ShieldCheck size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* TAB 3: VERIFICATION */}
      {activeTab === "VERIFY" && (
        <motion.div variants={itemVariants} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col gap-6 max-w-3xl mx-auto w-full">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-400">
                <ShieldCheck size={24} />
              </span>
              <h2 className="text-xl font-bold text-white">
                Verificador Público de Autenticidad e Integridad Criptográfica
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Introduzca la huella digital SHA-256 o el número de referencia del documento para comprobar su validez, inmutabilidad y certificado de firma.
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Pegue aquí el hash SHA-256 (64 caracteres) o la referencia (ej. HBL-2026-0081)..."
              value={verifyQuery}
              onChange={(e: any) => setVerifyQuery(e.target.value)}
              className="bg-slate-950 border-slate-800 text-xs font-mono"
            />
            <Button
              onClick={() => handleVerify()}
              disabled={isVerifying || !verifyQuery.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 shrink-0"
            >
              <Search size={14} />
              {isVerifying ? "Verificando..." : "Verificar"}
            </Button>
          </div>

          {/* Verification Certificate Result */}
          {verifyResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-6 rounded-3xl border flex flex-col gap-4 shadow-2xl ${
                verifyResult.authentic
                  ? "bg-emerald-950/30 border-emerald-500/40"
                  : "bg-red-950/30 border-red-500/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`p-3 rounded-2xl ${
                    verifyResult.authentic
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
                >
                  {verifyResult.authentic ? <ShieldCheck size={32} /> : <AlertTriangle size={32} />}
                </span>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    {verifyResult.authentic
                      ? "CERTIFICADO DE AUTENTICIDAD VÁLIDO"
                      : "VERIFICACIÓN FALLIDA"}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">{verifyResult.message}</p>
                </div>
              </div>

              {verifyResult.document && (
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/70 p-4 rounded-2xl border border-white/5 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">Documento</span>
                    <div className="font-bold text-white mt-0.5">{verifyResult.document.name}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">Referencia</span>
                    <div className="font-bold text-indigo-400 mt-0.5">
                      {verifyResult.document.documentReference}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 uppercase">Huella Digital (SHA-256)</span>
                    <div className="text-[11px] text-emerald-400 break-all mt-0.5">
                      {verifyResult.document.sha256Hash}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">Firmante Acreditado</span>
                    <div className="font-bold text-white mt-0.5">
                      {verifyResult.document.signedBy || "Sin firmar"}
                    </div>
                    <div className="text-[10px] text-slate-400">{verifyResult.document.signerTitle}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">Certificado PKI</span>
                    <div className="font-bold text-slate-300 mt-0.5">
                      {verifyResult.document.signerCertificate || "N/A"}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}

      {/* TAB 4: MANUAL UPLOAD */}
      {activeTab === "UPLOAD" && (
        <motion.div variants={itemVariants} className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col items-center justify-center text-center gap-4 max-w-xl mx-auto w-full">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Upload size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Subir Documento Externo al Vault</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Permite archivar facturas comerciales, listas de empaque o certificados externos con cálculo de hash SHA-256 inmediato.
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 mt-2"
          >
            <Upload size={14} />
            {isUploading ? "Subiendo..." : "Seleccionar Archivo Local"}
          </Button>
        </motion.div>
      )}

      {/* FULL-SCREEN / LARGE MODAL: LIVE PDF VIEWER & DIGITAL SIGNATURE */}
      <AnimatePresence>
        {activeModalDoc && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full h-[90vh] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                    {getTypeIcon(activeModalDoc.type)}
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-white">{activeModalDoc.name}</h2>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>Ref: {activeModalDoc.documentReference || activeModalDoc.id}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold uppercase">{activeModalDoc.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() =>
                      window.open(modalPdfUrl || `/api/documents/${activeModalDoc.id}/pdf`, "_blank")
                    }
                    variant="ghost"
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
                  >
                    <ExternalLink size={14} /> Abrir en Nueva Pestaña
                  </Button>
                  <Button
                    onClick={closeViewerModal}
                    variant="ghost"
                    className="text-slate-400 hover:text-white font-bold"
                  >
                    ✕
                  </Button>
                </div>
              </div>

              {/* Modal Body: Left PDF Iframe / Right Signature Panel */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                {/* PDF Viewer Area */}
                <div className="lg:col-span-8 bg-slate-950 h-full border-r border-slate-800 relative flex items-center justify-center">
                  {modalPdfUrl ? (
                    <iframe
                      src={modalPdfUrl}
                      title="PDF Preview"
                      className="w-full h-full border-none"
                    />
                  ) : (
                    <div className="text-slate-500 text-xs">Cargando previsualizador PDF...</div>
                  )}
                </div>

                {/* Right Signature & Metadata Panel */}
                <div className="lg:col-span-4 bg-slate-900/60 p-6 flex flex-col justify-between overflow-y-auto">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
                      <Lock size={16} className="text-indigo-400" />
                      Firma Digital & Sello Criptográfico
                    </div>

                    {/* Status Badge */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 flex flex-col gap-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Estado Legal:</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            activeModalDoc.status === "SIGNED"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          }`}
                        >
                          {activeModalDoc.status}
                        </span>
                      </div>

                      {activeModalDoc.signedBy && (
                        <div className="flex flex-col gap-1 border-t border-slate-800 pt-2 text-[11px]">
                          <div className="text-slate-400">Firmado por:</div>
                          <div className="font-bold text-white">{activeModalDoc.signedBy}</div>
                          <div className="text-[10px] text-slate-500">{activeModalDoc.signerTitle}</div>
                          <div className="text-[9px] font-mono text-emerald-400 mt-1">
                            {activeModalDoc.signerCertificate}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SHA-256 Fingerprint */}
                    {activeModalDoc.sha256Hash && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Huella Inmutable (SHA-256):
                        </span>
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5 text-[10px] font-mono text-emerald-400 break-all flex items-center justify-between gap-2">
                          <span>{activeModalDoc.sha256Hash}</span>
                          <button
                            onClick={() => copyToClipboard(activeModalDoc.sha256Hash!)}
                            className="text-slate-400 hover:text-white shrink-0"
                            title="Copiar Hash"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Sign Action Form (if not signed) */}
                    {activeModalDoc.status !== "SIGNED" && (
                      <div className="flex flex-col gap-3 pt-2">
                        <div className="flex flex-col gap-1 text-xs">
                          <label className="text-[11px] font-semibold text-slate-400">
                            Firmante Acreditado:
                          </label>
                          <select
                            value={selectedSigner}
                            onChange={(e) => {
                              setSelectedSigner(e.target.value);
                              if (e.target.value === "Carlos Mendoza")
                                setSignerTitle("Director de Operaciones & Tráfico");
                              if (e.target.value === "Mateo Ortiz")
                                setSignerTitle("Representante Aduanero Colegiado OEA");
                              if (e.target.value === "Elena Vega")
                                setSignerTitle("Gestor de Tráfico Terrestre");
                              if (e.target.value === "Lucía Domínguez")
                                setSignerTitle("Agente de Carga IATA Acreditado");
                            }}
                            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:outline-none"
                          >
                            <option value="Carlos Mendoza">Carlos Mendoza</option>
                            <option value="Mateo Ortiz">Mateo Ortiz</option>
                            <option value="Elena Vega">Elena Vega</option>
                            <option value="Lucía Domínguez">Lucía Domínguez</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1 text-xs">
                          <label className="text-[11px] font-semibold text-slate-400">
                            Cargo Oficial / Autorización:
                          </label>
                          <Input
                            value={signerTitle}
                            onChange={(e: any) => setSignerTitle(e.target.value)}
                            className="bg-slate-950 border-slate-800 text-xs"
                          />
                        </div>

                        <Button
                          onClick={handleSignDocument}
                          disabled={isSigning}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-xs mt-1"
                        >
                          <Lock size={14} />
                          {isSigning ? "Firmando..." : "Firmar & Estampar Sello"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Download Button */}
                  <div className="pt-4 border-t border-slate-800">
                    <Button
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = `/api/documents/${activeModalDoc.id}/pdf`;
                        a.download = `${activeModalDoc.documentReference || activeModalDoc.id}.pdf`;
                        a.click();
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-xs"
                    >
                      <Download size={14} /> Descargar PDF Oficial
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
