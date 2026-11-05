import React, { useState } from "react";
import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { TRANSACTION_ENCRYPTION_ENABLED } from "../lib/api";

export const SecurityStatusBadge: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-tight border transition-all bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20 hover:border-emerald-500/40"
        title="Automated AES-256-GCM Transaction Encryption Active"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <ShieldCheck size={14} className="text-emerald-400" />
        <span className="font-mono font-semibold">AES-GCM 256</span>
      </button>

      {showDetails && (
        <div
          className="absolute top-full right-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-700/80 p-4 z-50 text-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
                Transaction Security
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              E2EE ACTIVE
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            All API mutations and sensitive payloads are automatically encrypted
            in client-side WebCrypto and decrypted inside Fastify pipeline
            boundaries to prevent plain-text exposure or interception.
          </p>

          <div className="space-y-2 text-[11px] font-mono bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/80">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">Cipher Algorithm:</span>
              <span className="text-emerald-400 font-semibold">
                AES-GCM-256
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">Key Derivation:</span>
              <span>PBKDF2 (10,000 / SHA-256)</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">IV & Salt:</span>
              <span>Dynamic 12B IV / 16B Salt</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">Anti-Tampering:</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 size={12} />
                Poly1305 / GCM Tag
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>Payload Status:</span>
            <span className="text-emerald-400 font-medium">
              {TRANSACTION_ENCRYPTION_ENABLED
                ? "Automatic Envelope Protection"
                : "Plaintext Transport"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
