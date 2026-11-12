/**
 * @file SystemAdmin.tsx
 * @description Consolidated System Administration portal entry tab providing routing to SystemPanel.
 * @module @atlas/frontend/components/Settings/Tab/SystemAdmin
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { Link } from "react-router-dom";
import { Sliders } from "lucide-react";

export const SystemAdmin: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Consolidated System Administration Panel
          </h3>
          <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1 max-w-xl">
            Centralized administrative governance managing Resolution Protocols,
            RBAC Matrix, ERP Connectors, Platform Governance (CQRS), and e.firma
            Security Vault.
          </p>
        </div>
        <Link
          to="/system-panel"
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors duration-150 shadow-md shadow-indigo-600/20 shrink-0"
        >
          <Sliders size={16} /> Open Full System Panel
        </Link>
      </div>
    </div>
  );
};
