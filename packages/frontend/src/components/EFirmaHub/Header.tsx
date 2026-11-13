/**
 * @file Header.tsx
 * @description Header and cryptographic status indicators for the SAT e.firma Hub.
 * @module @atlas/frontend/components/EFirmaHub
 * @see {@link docs/adr/0020-modular-file-size-guardrails.md}
 */

import React from "react";
import { Key, ShieldCheck, Sparkles } from "lucide-react";

interface HeaderProps {
  isVaultUnlocked: boolean;
  vaultExpiresInMinutes: number;
}

export const Header: React.FC<HeaderProps> = ({
  isVaultUnlocked,
  vaultExpiresInMinutes,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              e.firma Hub & Bóveda Criptográfica Zero-Knowledge
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                SAT WebCrypto API
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Zero-Knowledge
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Sellado Digital RSA-SHA256 en memoria volátil de navegador para
              Pedimentos, Carta Porte 3.1 y e-BLs (Cero fuga de llave privada)
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isVaultUnlocked ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
            }`}
          />
          <span className="text-slate-400">Bóveda RAM:</span>
          <span
            className={`font-semibold ${isVaultUnlocked ? "text-emerald-400" : "text-rose-400"}`}
          >
            {isVaultUnlocked
              ? `Desbloqueada (${vaultExpiresInMinutes}m)`
              : "Bloqueada"}
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Algoritmo:</span>
          <span className="font-semibold text-cyan-400">RSASSA-PKCS1-v1_5</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Sellado:</span>
          <span className="font-semibold text-amber-400">RFC 3161 TSA</span>
        </div>
      </div>
    </div>
  );
};
