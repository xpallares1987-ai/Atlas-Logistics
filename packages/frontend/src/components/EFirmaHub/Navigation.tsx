/**
 * @file Navigation.tsx
 * @description Tab navigation bar for the SAT e.firma Hub.
 * @module @atlas/frontend/components/EFirmaHub
 * @see {@link docs/adr/0020-modular-file-size-guardrails.md}
 */

import React from "react";
import { FileCheck, Lock, Scale } from "lucide-react";
import type { EFirmaHubTab } from "../../types/efirma-hub.types";

interface NavigationProps {
  activeTab: EFirmaHubTab;
  onSelectTab: (tab: EFirmaHubTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <div className="flex border-b border-slate-800 gap-2">
      <button
        onClick={() =>
          React.startTransition(() => onSelectTab("SIGNING_STUDIO"))
        }
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 border-b-2 ${
          activeTab === "SIGNING_STUDIO"
            ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
            : "border-transparent text-slate-400 hover:text-slate-200"
        }`}
      >
        <FileCheck className="w-4 h-4" />
        Estudio de Firmado de Documentos
      </button>

      <button
        onClick={() => React.startTransition(() => onSelectTab("VAULT_CERT"))}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 border-b-2 ${
          activeTab === "VAULT_CERT"
            ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
            : "border-transparent text-slate-400 hover:text-slate-200"
        }`}
      >
        <Lock className="w-4 h-4" />
        Bóveda & Certificado SAT X.509
      </button>

      <button
        onClick={() =>
          React.startTransition(() => onSelectTab("PUBLIC_VERIFIER"))
        }
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 border-b-2 ${
          activeTab === "PUBLIC_VERIFIER"
            ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
            : "border-transparent text-slate-400 hover:text-slate-200"
        }`}
      >
        <Scale className="w-4 h-4" />
        Validador Criptográfico Público
      </button>
    </div>
  );
};
