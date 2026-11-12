/**
 * @file Devices.tsx
 * @description Active user sessions and hardware authentication device management tab.
 * @module @atlas/frontend/components/Settings/Tab/Devices
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@atlas/ui";

export const Devices: React.FC = () => {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
          Active Sessions
        </h3>
        <div className="space-y-4">
          <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-4">
              <Monitor className="w-8 h-8 text-indigo-500" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Windows 11 • Chrome
                </p>
                <p className="text-xs text-slate-500">
                  Madrid, ES • Active now
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-bold rounded-full">
              Current
            </span>
          </div>

          <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Smartphone className="w-8 h-8 text-slate-400" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  iPhone 14 Pro • Safari
                </p>
                <p className="text-xs text-slate-500">
                  London, UK • Last active: 2 hours ago
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="text-sm text-rose-500 hover:text-rose-600 font-medium h-auto p-0"
            >
              Revoke
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
