/**
 * @file Navigation.tsx
 * @description Sub-tab navigation bar for System Administration Panel modules.
 * @module @atlas/frontend/components/SystemPanel
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import {
  CheckCircle2,
  Users,
  Database,
  Network,
  Server,
  Key,
  BellRing,
} from "lucide-react";
import type { SystemSubTab } from "../../types/system-panel.types";

interface NavigationProps {
  activeSubTab: SystemSubTab;
  onTabChange: (tab: SystemSubTab) => void;
  notesCount: number;
}

export function Navigation({
  activeSubTab,
  onTabChange,
  notesCount,
}: NavigationProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner">
      <button
        onClick={() => onTabChange("RESOLUTIONS")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          activeSubTab === "RESOLUTIONS"
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <CheckCircle2 size={15} />
        <span>Resolution Protocols</span>
        <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded-full text-indigo-300">
          {notesCount}
        </span>
      </button>

      <button
        onClick={() => onTabChange("RBAC")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          activeSubTab === "RBAC"
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <Users size={15} />
        <span>Roles & Access (RBAC)</span>
      </button>

      <button
        onClick={() => onTabChange("DATABASE_SEED")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          activeSubTab === "DATABASE_SEED"
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <Database size={15} />
        <span>Database & Seeds</span>
        <span className="text-[10px] px-1.5 py-0.2 bg-cyan-950 text-cyan-400 border border-cyan-800/40 rounded-full font-bold">
          5 Phases
        </span>
      </button>

      <button
        onClick={() => onTabChange("INTEGRATIONS")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          activeSubTab === "INTEGRATIONS"
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <Network size={15} />
        <span>ERP & B2B EDI Connectors</span>
      </button>

      <button
        onClick={() => onTabChange("CONTROL_PLANE")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          activeSubTab === "CONTROL_PLANE"
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <Server size={15} />
        <span>Platform Governance (CQRS)</span>
      </button>

      <button
        onClick={() => onTabChange("SECURITY_VAULT")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          activeSubTab === "SECURITY_VAULT"
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <Key size={15} />
        <span>e.firma & Digital Vault</span>
      </button>

      <button
        onClick={() => onTabChange("WEBHOOKS")}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
          activeSubTab === "WEBHOOKS"
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <BellRing size={15} />
        <span>Alerts & Webhooks</span>
      </button>
    </div>
  );
}
