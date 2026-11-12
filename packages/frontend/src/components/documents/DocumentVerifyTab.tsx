import React from "react";
import { motion, Variants } from "framer-motion";
import { ShieldCheck, Search, AlertTriangle } from "lucide-react";
import { Input, Button } from "@atlas/ui";
import { DocumentVerifyTabProps } from "../../types/document-vault.types";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export const DocumentVerifyTab: React.FC<DocumentVerifyTabProps> = ({
  verifyQuery,
  onVerifyQueryChange,
  verifyResult,
  isVerifying,
  onVerify,
}) => {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="show"
      className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col gap-6 max-w-3xl mx-auto w-full"
    >
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
          Introduzca la huella digital SHA-256 o el número de referencia del
          documento para comprobar su validez, inmutabilidad y certificado de
          firma.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          id="doc-verify-query"
          name="docVerifyQuery"
          aria-label="Hash SHA-256 o Referencia del Documento"
          placeholder="Pegue aquí el hash SHA-256 (64 caracteres) o la referencia (ej. HBL-2026-0081)..."
          value={verifyQuery}
          onChange={(e: any) => onVerifyQueryChange(e.target.value)}
          className="bg-slate-950 border-slate-800 text-xs font-mono"
        />
        <Button
          onClick={() => onVerify()}
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
              {verifyResult.authentic ? (
                <ShieldCheck size={32} />
              ) : (
                <AlertTriangle size={32} />
              )}
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base">
                {verifyResult.authentic
                  ? "CERTIFICADO DE AUTENTICIDAD VÁLIDO"
                  : "VERIFICACIÓN FALLIDA"}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {verifyResult.message}
              </p>
            </div>
          </div>

          {verifyResult.document && (
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/70 p-4 rounded-2xl border border-white/5 font-mono">
              <div>
                <span className="text-[10px] text-slate-500 uppercase">
                  Documento
                </span>
                <div className="font-bold text-white mt-0.5">
                  {verifyResult.document.name}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase">
                  Referencia
                </span>
                <div className="font-bold text-indigo-400 mt-0.5">
                  {verifyResult.document.documentReference}
                </div>
              </div>

              <div className="col-span-2">
                <span className="text-[10px] text-slate-500 uppercase">
                  Huella Digital (SHA-256)
                </span>
                <div className="text-[11px] text-emerald-400 break-all mt-0.5">
                  {verifyResult.document.sha256Hash}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase">
                  Firmante Acreditado
                </span>
                <div className="font-bold text-white mt-0.5">
                  {verifyResult.document.signedBy || "Sin firmar"}
                </div>
                <div className="text-[10px] text-slate-400">
                  {verifyResult.document.signerTitle}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase">
                  Certificado PKI
                </span>
                <div className="font-bold text-slate-300 mt-0.5">
                  {verifyResult.document.signerCertificate || "N/A"}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};
