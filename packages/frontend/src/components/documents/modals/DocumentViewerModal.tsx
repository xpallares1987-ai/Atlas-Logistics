import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ExternalLink, Lock, Copy, Download } from "lucide-react";
import { Input, Button } from "@atlas/ui";
import { DocumentViewerModalProps } from "../../../types/document-vault.types";

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  doc,
  pdfUrl,
  onClose,
  selectedSigner,
  onSelectedSignerChange,
  signerTitle,
  onSignerTitleChange,
  isSigning,
  onSignDocument,
  copyToClipboard,
}) => {
  return (
    <AnimatePresence>
      {doc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <FileText size={18} />
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {doc.name} - {doc.documentReference || doc.id}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    ID: {doc.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() =>
                    window.open(`/api/documents/${doc.id}/pdf`, "_blank")
                  }
                  variant="ghost"
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
                >
                  <ExternalLink size={14} /> Abrir en Nueva Pestaña
                </Button>
                <Button
                  onClick={onClose}
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
                {pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    title="PDF Preview"
                    className="w-full h-full border-none"
                  />
                ) : (
                  <div className="text-slate-500 text-xs">
                    Cargando previsualizador PDF...
                  </div>
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
                          doc.status === "SIGNED"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>

                    {doc.signedBy && (
                      <div className="flex flex-col gap-1 border-t border-slate-800 pt-2 text-[11px]">
                        <div className="text-slate-400">Firmado por:</div>
                        <div className="font-bold text-white">
                          {doc.signedBy}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {doc.signerTitle}
                        </div>
                        <div className="text-[9px] font-mono text-emerald-400 mt-1">
                          {doc.signerCertificate}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SHA-256 Fingerprint */}
                  {doc.sha256Hash && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Huella Inmutable (SHA-256):
                      </span>
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5 text-[10px] font-mono text-emerald-400 break-all flex items-center justify-between gap-2">
                        <span>{doc.sha256Hash}</span>
                        <button
                          onClick={() => copyToClipboard(doc.sha256Hash!)}
                          className="text-slate-400 hover:text-white shrink-0"
                          title="Copiar Hash"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sign Action Form (if not signed) */}
                  {doc.status !== "SIGNED" && (
                    <div className="flex flex-col gap-3 pt-2">
                      <div className="flex flex-col gap-1 text-xs">
                        <label className="text-[11px] font-semibold text-slate-400">
                          Firmante Acreditado:
                        </label>
                        <select
                          value={selectedSigner}
                          onChange={(e) => {
                            const val = e.target.value;
                            onSelectedSignerChange(val);
                            if (val === "Carlos Mendoza") {
                              onSignerTitleChange(
                                "Director de Operaciones & Tráfico",
                              );
                            } else if (val === "Mateo Ortiz") {
                              onSignerTitleChange(
                                "Representante Aduanero Colegiado OEA",
                              );
                            } else if (val === "Elena Vega") {
                              onSignerTitleChange(
                                "Gestor de Tráfico Terrestre",
                              );
                            } else if (val === "Lucía Domínguez") {
                              onSignerTitleChange(
                                "Agente de Carga IATA Acreditado",
                              );
                            }
                          }}
                          className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:outline-none"
                        >
                          <option value="Carlos Mendoza">Carlos Mendoza</option>
                          <option value="Mateo Ortiz">Mateo Ortiz</option>
                          <option value="Elena Vega">Elena Vega</option>
                          <option value="Lucía Domínguez">
                            Lucía Domínguez
                          </option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1 text-xs">
                        <label className="text-[11px] font-semibold text-slate-400">
                          Cargo Oficial / Autorización:
                        </label>
                        <Input
                          value={signerTitle}
                          onChange={(e: any) =>
                            onSignerTitleChange(e.target.value)
                          }
                          className="bg-slate-950 border-slate-800 text-xs"
                        />
                      </div>

                      <Button
                        onClick={onSignDocument}
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
                      a.href = `/api/documents/${doc.id}/pdf`;
                      a.download = `${doc.documentReference || doc.id}.pdf`;
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
  );
};
