/**
 * @file EmittedDocument.tsx
 * @description Modal dialog displaying cryptographically signed PKI documents emitted from cockpit actions.
 * @module @atlas/frontend/components/Cockpit/Modal/EmittedDocument
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React, { useState } from "react";
import { Check, CheckCircle2, Copy, Download, ShieldCheck } from "lucide-react";
import type { EmittedDocumentModalData } from "../../../types/cockpit.types";

// ============================================================================
// 1. COMPONENT PROPS
// ============================================================================

interface EmittedDocumentProps {
  document: EmittedDocumentModalData;
  onClose: () => void;
  onNavigateToVault: () => void;
}

// ============================================================================
// 2. COMPONENT IMPLEMENTATION
// ============================================================================

export const EmittedDocument: React.FC<EmittedDocumentProps> = ({
  document,
  onClose,
  onNavigateToVault,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);

  const handleCopyHash = () => {
    navigator.clipboard.writeText(document.sha256Hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-700/60 text-emerald-400">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Official Document Issued & PKI Signed
              </h3>
              <p className="text-xs text-slate-400">
                Cryptographic integrity guarantee and auditability in SQLite
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Close document dialog"
          >
            ✕
          </button>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Document Type:
            </span>
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/60">
              {document.type} · {document.name}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Reference Number:
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {document.documentReference || document.id}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Signature Status:
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />{" "}
              {document.status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Signed By:
            </span>
            <span className="text-xs text-slate-200">
              {document.signedBy || "Atlas Operations PKI"}
            </span>
          </div>
          <div className="flex flex-col gap-1 pt-2 border-t border-slate-800/80">
            <span className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>SHA-256 Digital Fingerprint (Immutable):</span>
              <button
                onClick={handleCopyHash}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                {copiedHash ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy Hash
                  </>
                )}
              </button>
            </span>
            <code className="text-[11px] font-mono text-emerald-400 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 break-all select-all">
              {document.sha256Hash}
            </code>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              window.open(
                `/api/documents/verify/${document.sha256Hash}`,
                "_blank",
              );
            }}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-700/40 transition flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Verify Integrity
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToVault();
              }}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Document Vault
            </button>
            <a
              href={`/api/documents/${document.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
            >
              <Download className="w-3.5 h-3.5" />
              Download Official PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
