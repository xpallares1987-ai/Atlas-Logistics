/**
 * @file BackupCodes.tsx
 * @description Emergency one-time recovery backup codes display and clipboard exporter.
 * @module @atlas/frontend/components/Settings/Tab/Security/BackupCodes
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@atlas/ui";

interface BackupCodesProps {
  backupCodes: string[];
  copiedBackupCodes: boolean;
  onCopyBackupCodes: () => void;
}

export const BackupCodes: React.FC<BackupCodesProps> = ({
  backupCodes,
  copiedBackupCodes,
  onCopyBackupCodes,
}) => {
  return (
    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          Emergency Recovery Codes (5 One-Time Codes)
        </span>
        <Button
          variant="ghost"
          onClick={onCopyBackupCodes}
          className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 h-auto p-0"
        >
          {copiedBackupCodes ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}{" "}
          Copy All
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {backupCodes.map((code, idx) => (
          <div
            key={idx}
            className="p-1.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-center text-slate-700 dark:text-slate-300 font-bold"
          >
            {code}
          </div>
        ))}
      </div>
    </div>
  );
};
