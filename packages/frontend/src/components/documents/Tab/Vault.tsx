import React from "react";
import { motion, Variants } from "framer-motion";
import {
  Layers,
  RefreshCw,
  Copy,
  CheckCircle2,
  Eye,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Input, Button } from "@atlas/ui";
import { DocumentVaultTabProps } from "../../../types/document-vault.types";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export const DocumentVaultTab: React.FC<DocumentVaultTabProps> = ({
  documents: _documents,
  filteredDocuments,
  templates,
  searchQuery,
  onSearchQueryChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  isLoadingDocs,
  onRefresh,
  onOpenViewer,
  onVerifyDocument,
  onFileUpload,
  isUploading,
  fileInputRef,
  getTypeIcon,
}) => {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="show"
      className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers size={20} className="text-indigo-400" />
            Bóveda de Documentos Emitidos
          </h2>
          <p className="text-xs text-slate-400">
            Historial completo de documentos legales emitidos con sus hashes
            criptográficos y certificados de firma.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            id="doc-search-query"
            name="docSearchQuery"
            aria-label="Buscar por referencia, hash o firmante"
            placeholder="Buscar por referencia, hash o firmante..."
            value={searchQuery}
            onChange={(e: any) => onSearchQueryChange(e.target.value)}
            className="bg-slate-950 border-slate-800 text-xs w-64"
          />

          <select
            id="doc-type-filter"
            name="docTypeFilter"
            aria-label="Filtrar por tipo de documento"
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
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
            id="doc-status-filter"
            name="docStatusFilter"
            aria-label="Filtrar por estado de documento"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="SIGNED">SIGNED (Firmado)</option>
            <option value="EMITTED">EMITTED (Sin Firmar)</option>
          </select>

          {/* Hidden File Input & Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileUpload}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            id="doc-manual-upload-input"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5"
            title="Subir documento escaneado a la bóveda"
          >
            <Upload size={14} />
            {isUploading ? "Subiendo..." : "Subir Archivo"}
          </Button>

          <Button
            onClick={onRefresh}
            variant="ghost"
            className="text-slate-400 hover:text-white p-2"
          >
            <RefreshCw
              size={16}
              className={isLoadingDocs ? "animate-spin" : ""}
            />
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
                <td
                  colSpan={7}
                  className="p-8 text-center text-slate-500 font-sans"
                >
                  No se encontraron documentos en la bóveda con los filtros
                  seleccionados.
                </td>
              </tr>
            ) : (
              filteredDocuments.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-slate-800/30 transition-colors"
                >
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
                          {doc.sha256Hash.substring(0, 10)}...
                          {doc.sha256Hash.substring(58)}
                        </span>
                        <button
                          onClick={() => handleCopy(doc.sha256Hash!)}
                          className="text-slate-500 hover:text-indigo-400"
                          title="Copiar Hash"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-600 font-sans">
                        Sin calcular
                      </span>
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
                        onClick={() => onOpenViewer(doc)}
                        className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] px-2.5 py-1 rounded-xl h-auto transition-all"
                      >
                        <Eye size={12} className="mr-1 inline" /> Ver PDF
                      </Button>
                      <Button
                        onClick={() =>
                          onVerifyDocument(
                            doc.sha256Hash || doc.documentReference || doc.id,
                          )
                        }
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
  );
};
