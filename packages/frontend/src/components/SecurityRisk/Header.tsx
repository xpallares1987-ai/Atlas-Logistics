/**
 * @file Header.tsx
 * @description Hero header card and 4-column status KPI badges for Security, Risk & Resilience Center.
 * @module @atlas/frontend/components/SecurityRisk
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react";

export interface SecurityHeaderProps {
  riskScore: number;
  riskBadgeText: string;
  offlineTotal: number;
}

export function Header({
  riskScore,
  riskBadgeText,
  offlineTotal,
}: SecurityHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 shadow-2xl text-white">
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles size={14} className="text-indigo-400" />
            Advanced Security & Edge Computing
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <ShieldCheck className="text-indigo-400" size={32} />
            Security, Risk & Resilience Center
          </h1>
          <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
            Centro unificado de autenticación biométrica Passkeys (FIDO2), doble
            factor TOTP, sellado criptográfico de documentos con WebCrypto,
            radar predictivo de riesgo multimodal y motor de resiliencia
            offline.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-xl p-3 text-center">
            <span className="text-[11px] text-slate-400 block font-medium">
              WebAuthn FIDO2
            </span>
            <span className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
              <CheckCircle2 size={14} /> Listo
            </span>
          </div>
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-xl p-3 text-center">
            <span className="text-[11px] text-slate-400 block font-medium">
              SubtleCrypto
            </span>
            <span className="text-sm font-bold text-indigo-400 flex items-center justify-center gap-1 mt-0.5">
              SHA-256
            </span>
          </div>
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-xl p-3 text-center">
            <span className="text-[11px] text-slate-400 block font-medium">
              Score de Riesgo
            </span>
            <span
              className={`text-sm font-bold flex items-center justify-center gap-1 mt-0.5 ${riskBadgeText}`}
            >
              {riskScore}/100
            </span>
          </div>
          <div className="bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-xl p-3 text-center">
            <span className="text-[11px] text-slate-400 block font-medium">
              Cola Offline
            </span>
            <span className="text-sm font-bold text-amber-400 flex items-center justify-center gap-1 mt-0.5">
              {offlineTotal} Docs
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
