"use client";

import { Download, Activity, DollarSign, AlertTriangle } from "lucide-react";
import { downloadTemplate } from "../services/template-service";

export function TemplateDownloader() {
  return (
    <div className="template-downloader mt-8 border-t border-slate-800 pt-8">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-200">
          Need a template?
        </h3>
        <p className="text-xs text-slate-400">
          Download pre-formatted Excel templates for clean ingestion.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => downloadTemplate("operational")}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-medium transition-colors"
        >
          <Activity size={14} />
          Operational Template
          <Download size={12} className="ml-1 opacity-70" />
        </button>

        <button
          onClick={() => downloadTemplate("financial")}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors"
        >
          <DollarSign size={14} />
          Financial Template
          <Download size={12} className="ml-1 opacity-70" />
        </button>

        <button
          onClick={() => downloadTemplate("exception")}
          className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors"
        >
          <AlertTriangle size={14} />
          Exception Template
          <Download size={12} className="ml-1 opacity-70" />
        </button>
      </div>
    </div>
  );
}
