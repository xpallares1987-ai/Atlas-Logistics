/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";

export interface ColumnStatus {
  name: string;
  found: boolean;
  required: boolean;
  aliasUsed?: string;
}

interface ExcelValidatorProps {
  columns: ColumnStatus[];
  sheetName: string;
}

export default function ExcelValidator({
  columns,
  sheetName,
}: ExcelValidatorProps) {
  const missingRequired = columns.filter(
    (c) => c.required && !columns.find((col) => col.name === c.name)?.found,
  );

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 mt-3 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
          Validation: {sheetName}
        </h4>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${missingRequired.length === 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
        >
          {missingRequired.length === 0 ? "READY" : "INCOMPLETE"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {columns.map((col, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between bg-slate-800/50 p-2 rounded border border-slate-700/50"
          >
            <div className="flex items-center gap-2 min-w-0">
              {col.found ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              ) : col.required ? (
                <XCircle className="h-3 w-3 text-red-500 shrink-0" />
              ) : (
                <Info className="h-3 w-3 text-slate-500 shrink-0" />
              )}
              <span
                className={`text-[10px] truncate ${col.found ? "text-slate-200" : "text-slate-500"}`}
              >
                {col.name}
              </span>
            </div>
            {col.aliasUsed && (
              <span className="text-[8px] text-indigo-400 font-mono italic truncate ml-2">
                as {col.aliasUsed}
              </span>
            )}
          </div>
        ))}
      </div>

      {missingRequired.length > 0 && (
        <p className="text-[9px] text-red-400 mt-2 italic">
          * Missing required columns:{" "}
          {missingRequired.map((c) => c.name).join(", ")}
        </p>
      )}
    </div>
  );
}
