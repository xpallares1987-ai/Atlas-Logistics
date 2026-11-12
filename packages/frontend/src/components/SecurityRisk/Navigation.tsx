/**
 * @file Navigation.tsx
 * @description Tab navigation bar for the Security, Risk & Resilience Center module.
 * @module @atlas/frontend/components/SecurityRisk
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import React from "react";
import { Fingerprint, FileCheck2, Activity, Wifi, WifiOff } from "lucide-react";
import type { SecurityRiskTab } from "../../types/security-risk.types";

export interface SecurityNavigationProps {
  activeTab: SecurityRiskTab;
  onSelectTab: (tab: SecurityRiskTab) => void;
  isOnline: boolean;
}

export function Navigation({
  activeTab,
  onSelectTab,
  isOnline,
}: SecurityNavigationProps) {
  const select = (tab: SecurityRiskTab) => {
    React.startTransition(() => onSelectTab(tab));
  };

  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
      <button
        onClick={() => select("PASSKEYS_TOTP")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-150 ${
          activeTab === "PASSKEYS_TOTP"
            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
        }`}
      >
        <Fingerprint size={16} />
        Passkeys & TOTP 2FA
      </button>
      <button
        onClick={() => select("DIGITAL_SIGNATURES")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-150 ${
          activeTab === "DIGITAL_SIGNATURES"
            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
        }`}
      >
        <FileCheck2 size={16} />
        Firma Digital WebCrypto
      </button>
      <button
        onClick={() => select("RISK_UNLOCODE")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-150 ${
          activeTab === "RISK_UNLOCODE"
            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
        }`}
      >
        <Activity size={16} />
        Radar de Riesgo & UN/LOCODE
      </button>
      <button
        onClick={() => select("OFFLINE_RESILIENCE")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-150 ${
          activeTab === "OFFLINE_RESILIENCE"
            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
        }`}
      >
        {isOnline ? (
          <Wifi size={16} className="text-emerald-500" />
        ) : (
          <WifiOff size={16} className="text-red-500" />
        )}
        Resiliencia Offline & DLQ
      </button>
    </div>
  );
}
