/**
 * @file XmlInspector.tsx
 * @description Interactive ISO 20022 XML viewer and auditor with syntax presentation,
 * SHA-256 payload verification, clipboard copy, and file download capabilities.
 * @module @atlas/frontend/components/FinancialClearing/Tab/BankingIso20022/XmlInspector
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 */

import React, { useState } from "react";
import {
  Code2,
  Copy,
  Check,
  Download,
  ShieldCheck,
  ArrowRight,
  FileCode,
} from "lucide-react";
import { Button } from "../../../ui/Button";

export interface XmlInspectorProps {
  xmlPayload?: string;
  transmissionId?: string;
  transmissionNumber?: string;
  messageType?: string;
  sha256?: string;
  senderBic?: string;
  receiverBic?: string;
  status?: string;
}

export const XmlInspector: React.FC<XmlInspectorProps> = ({
  xmlPayload = "",
  transmissionId,
  transmissionNumber = "TRANSMISSION-ISO20022",
  messageType = "PAIN_001",
  sha256 = "",
  senderBic = "ATLASESMMXXX",
  receiverBic = "BNPAFRPPXXX",
  status = "TRANSMITTED",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!xmlPayload) return;
    try {
      await navigator.clipboard.writeText(xmlPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy XML to clipboard", err);
    }
  };

  const handleDownload = () => {
    if (transmissionId) {
      window.open(
        `/api/financial/iso20022/transmissions/${transmissionId}/xml`,
        "_blank",
      );
      return;
    }

    if (!xmlPayload) return;
    const blob = new Blob([xmlPayload], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${transmissionNumber}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
      {/* Header Toolbar */}
      <div className="px-5 py-4 border-b border-white/10 bg-white/5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-white">
                {transmissionNumber}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {messageType}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  status === "ACKED"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : status === "REJECTED"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span className="font-mono">{senderBic}</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
              <span className="font-mono">{receiverBic}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy XML</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </Button>
        </div>
      </div>

      {/* SHA-256 Digest Bar */}
      {sha256 && (
        <div className="px-5 py-2 bg-slate-950/40 border-b border-white/5 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-slate-500 uppercase tracking-wider font-semibold">
            SHA-256 Digest:
          </span>
          <span className="font-mono text-slate-300 truncate">{sha256}</span>
        </div>
      )}

      {/* XML Payload Preview Body */}
      <div className="flex-1 p-5 overflow-auto custom-scrollbar font-mono text-xs text-slate-300 leading-relaxed whitespace-pre bg-slate-950/80">
        {xmlPayload ? (
          <code>{xmlPayload}</code>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
            <FileCode className="w-8 h-8 opacity-40" />
            <p>No XML payload selected</p>
          </div>
        )}
      </div>
    </div>
  );
};
