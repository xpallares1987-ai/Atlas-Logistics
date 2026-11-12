/**
 * @file SecurityVault.tsx
 * @description Digital key vault for e.firma certificates and AEO security standards tab.
 * @module @atlas/frontend/components/SystemPanel/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { Key, ShieldCheck } from "lucide-react";

export function SecurityVault() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Key size={18} className="text-amber-400" />
          <span>e.firma WebCrypto Vault</span>
        </h3>
        <p className="text-xs text-slate-400">
          Digital signature certificates (RSA-PSS / ECDSA) used for electronic
          Bill of Lading (MLETR) and SAT Carta de Porte sealing.
        </p>
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2 text-xs">
          <div className="flex justify-between text-slate-300">
            <span>Certificate Issuer:</span>
            <span className="font-bold text-white">
              SAT Autoridad Certificadora
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Algorithm:</span>
            <span className="font-mono text-amber-300">
              RSA-PSS 2048-bit / SHA-256
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Status:</span>
            <span className="text-emerald-400 font-bold">
              VALID (Expires Nov 2027)
            </span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-400" />
          <span>AEO Security Standards (ISO 17712)</span>
        </h3>
        <p className="text-xs text-slate-400">
          Operador Económico Autorizado verification rules and high-security
          mechanical container seals audits.
        </p>
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2 text-xs">
          <div className="flex justify-between text-slate-300">
            <span>AEO Authorization:</span>
            <span className="font-bold text-white">ESAEOF26000042</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>7-Point Audit Protocol:</span>
            <span className="text-emerald-400 font-bold">
              MANDATORY ON DEPARTURE
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Smart Seal Battery Alert:</span>
            <span className="text-slate-300">&gt; 15% Threshold</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SecurityVault;
