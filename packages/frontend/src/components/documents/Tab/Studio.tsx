import React from "react";
import { motion, Variants } from "framer-motion";
import { ShieldCheck, Eye, Lock } from "lucide-react";
import { Input, Button } from "@atlas/ui";
import { DocumentStudioTabProps } from "../../../types/document-vault.types";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

export const DocumentStudioTab: React.FC<DocumentStudioTabProps> = ({
  templates,
  selectedType,
  onSelectTemplate,
  formData,
  onFormDataChange,
  docReference,
  onDocReferenceChange,
  isGenerating,
  onGenerateDocument,
  getTypeIcon,
}) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* Document Catalog Grid */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Seleccione el Documento Oficial a Emitir:
        </span>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {templates.map((tpl) => (
            <button
              key={tpl.type}
              onClick={() => onSelectTemplate(tpl)}
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
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {tpl.regulation}
                </div>
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
                Configuración de Emisión:{" "}
                {templates.find((t) => t.type === selectedType)?.name ||
                  selectedType}
              </h3>
              <p className="text-xs text-slate-400">
                Edite los datos o utilice los valores predeterminados para
                compilar el PDF oficial y estampar el sello digital.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="doc-reference-input"
              className="text-[11px] text-slate-400 block mb-1"
            >
              Referencia Oficial:
            </label>
            <Input
              id="doc-reference-input"
              name="docReference"
              aria-label="Referencia Oficial"
              value={docReference}
              onChange={(e: any) => onDocReferenceChange(e.target.value)}
              className="bg-slate-950 border-slate-800 font-mono text-xs w-48"
            />
          </div>
        </div>

        {/* Dynamic Form Editor */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {Object.keys(formData).map((key) => {
            const val = formData[key];
            if (typeof val === "object") return null; // skip nested structures
            const inputId = `doc-form-${key}`;
            return (
              <div key={key} className="flex flex-col gap-1">
                <label
                  htmlFor={inputId}
                  className="text-[11px] font-semibold text-slate-400 capitalize"
                >
                  {key.replace(/([A-Z])/g, " $1")}
                </label>
                <Input
                  id={inputId}
                  name={key}
                  value={String(val ?? "")}
                  onChange={(e: any) =>
                    onFormDataChange((prev) => ({
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
            <span>
              La emisión calculará automáticamente la huella criptográfica
              SHA-256 para trazabilidad legal.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => onGenerateDocument(false)}
              disabled={isGenerating}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl flex items-center gap-2"
            >
              <Eye size={16} />
              {isGenerating ? "Generando..." : "Previsualizar PDF"}
            </Button>
            <Button
              onClick={() => onGenerateDocument(true)}
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
  );
};
