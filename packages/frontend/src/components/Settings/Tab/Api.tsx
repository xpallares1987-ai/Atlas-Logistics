/**
 * @file Api.tsx
 * @description B2B integration tokens and API key management tab.
 * @module @atlas/frontend/components/Settings/Tab/Api
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@atlas/ui";

export const Api: React.FC = () => {
  const [generatedKey, setGeneratedKey] = React.useState<string | null>(null);

  const handleGenerateKey = async () => {
    try {
      const randomKey =
        "atk_live_" +
        Array.from(crypto.getRandomValues(new Uint8Array(24)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      setGeneratedKey(randomKey);
    } catch {
      alert("Error generating API key");
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            API Keys
          </h3>
          <p className="text-xs text-slate-500">
            Manage your B2B integration tokens. Keep these secret.
          </p>
        </div>
        <Button
          onClick={handleGenerateKey}
          className="px-4 py-2 rounded-lg shadow-sm text-sm"
        >
          Generate New Token
        </Button>
      </div>

      {generatedKey && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
          <div className="text-xs font-semibold text-emerald-400">
            Token recién generado (cópialo ahora, no se volverá a mostrar):
          </div>
          <div className="font-mono text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-200 select-all break-all">
            {generatedKey}
          </div>
        </div>
      )}

      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
            <TableRow>
              <TableHead>NAME</TableHead>
              <TableHead>CREATED</TableHead>
              <TableHead className="text-right">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                Production ERP Sync
              </TableCell>
              <TableCell>Oct 12, 2025</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  className="text-rose-500 hover:text-rose-600 font-medium h-auto p-0"
                >
                  Revoke
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
