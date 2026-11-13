/**
 * @file Header.tsx
 * @description Top header, chain verification status pills, and verification feedback banner for Smart Contracts module.
 * @module @atlas/frontend/components/SmartContracts
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button } from "@atlas/ui";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  FileCode2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { SmartContractsHeaderProps } from "../../types/smart-contracts.types";

export function Header({
  chainVerification,
  isVerifying,
  onVerifyChain,
  onDownloadLedger,
  verificationFeedback,
  onDismissFeedback,
}: SmartContractsHeaderProps) {
  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Smart Contracts, e-BL MLETR & Escrow
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  DLT Merkle DAG
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Ley Modelo CNUDMI/UNCITRAL MLETR • Custodia & Transmisión de
                Título • Escrow con Oráculos
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Consenso:</span>
            <span className="font-semibold text-slate-200">
              Atlas Authority Node 1
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              chainVerification.isValid
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
            }`}
          >
            {chainVerification.isValid ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            )}
            <span>
              {chainVerification.isValid ? "Cadena Íntegra" : "Cadena Corrupta"}
            </span>
          </div>

          <Button
            variant="outline"
            className="border-slate-700 hover:bg-slate-800 text-xs flex items-center gap-1.5"
            onClick={onVerifyChain}
            disabled={isVerifying}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`}
            />
            Verificar Cadena
          </Button>

          <Button
            variant="outline"
            className="border-slate-700 hover:bg-slate-800 text-xs flex items-center gap-1.5"
            onClick={onDownloadLedger}
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Ledger JSON
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {verificationFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
              verificationFeedback.isValid
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200"
                : "bg-rose-950/40 border-rose-500/30 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-3">
              {verificationFeedback.isValid ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{verificationFeedback.message}</span>
            </div>
            <button
              onClick={onDismissFeedback}
              className="text-xs opacity-60 hover:opacity-100 ml-4 underline"
            >
              Cerrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
