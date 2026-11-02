import React, { useState } from "react";
import {
  Copy,
  Check,
  FileText,
  Anchor,
  ShieldCheck,
  UserCheck,
  Building2,
} from "lucide-react";
import { formatAllBlBoxes } from "@atlas/shared";
import { Button } from "./Button";

export interface BlCardPreviewProps {
  address: {
    companyName: string;
    tradeName?: string | null;
    taxId?: string | null;
    street1: string;
    street2?: string | null;
    zipCode: string;
    city: string;
    federalState?: string | null;
    country: string;
    unLocode?: string | null;
    addressType?: string;
  };
  contacts?: Array<{
    fullName: string;
    email: string;
    phone?: string | null;
    mobile?: string | null;
    roleCategory?: string | null;
    isPrimary?: boolean | null;
  }>;
  className?: string;
}

export const BlCardPreview: React.FC<BlCardPreviewProps> = ({
  address,
  contacts = [],
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState<
    "SHIPPER" | "CONSIGNEE" | "NOTIFY" | "AGENT"
  >("SHIPPER");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];
  const blBoxes = formatAllBlBoxes({
    shipper: address as any,
    shipperContact: primaryContact as any,
    consignee: address as any,
    consigneeContact: primaryContact as any,
    notify: address as any,
    notifyContact: primaryContact as any,
    agent: address as any,
    agentContact: primaryContact as any,
  });

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error("Failed to copy B/L text to clipboard:", err);
    }
  };

  const currentBox =
    activeTab === "SHIPPER"
      ? blBoxes.shipper
      : activeTab === "CONSIGNEE"
        ? blBoxes.consignee
        : activeTab === "NOTIFY"
          ? blBoxes.notify
          : blBoxes.agent;

  const currentBoxText = currentBox.rawBlock;

  const currentTabLabel =
    activeTab === "SHIPPER"
      ? "Shipper / Embarcador (Casilla B/L 1)"
      : activeTab === "CONSIGNEE"
        ? "Consignee / Consignatario (Casilla B/L 2)"
        : activeTab === "NOTIFY"
          ? "Notify Party / Notificar a (Casilla B/L 3)"
          : "Carrier Local Agent (Casilla B/L 4 / Agente de Entrega)";

  const lines: string[] = currentBox.lines;

  return (
    <div
      className={`border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            Formato B/L Marítimo (BIMCO / FIATA / DCSA eBL)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => copyToClipboard(currentBoxText, activeTab)}
            className="text-xs flex items-center gap-1.5 h-8"
          >
            {copiedKey === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-medium">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Casilla</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              const fullText = `=== SHIPPER ===\n${blBoxes.shipper.rawBlock}\n\n=== CONSIGNEE ===\n${blBoxes.consignee.rawBlock}\n\n=== NOTIFY PARTY ===\n${blBoxes.notify.rawBlock}\n\n=== DISCHARGE AGENT ===\n${blBoxes.agent.rawBlock}`;
              copyToClipboard(fullText, "ALL");
            }}
            className="text-xs flex items-center gap-1.5 h-8"
          >
            {copiedKey === "ALL" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-medium">
                  ¡Todo Copiado!
                </span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Todo el B/L</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-slate-50/50 dark:bg-slate-900/30">
        <button
          type="button"
          onClick={() => setActiveTab("SHIPPER")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === "SHIPPER"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>1. Shipper</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("CONSIGNEE")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === "CONSIGNEE"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>2. Consignee</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("NOTIFY")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === "NOTIFY"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>3. Notify Party</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("AGENT")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === "AGENT"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Anchor className="w-3.5 h-3.5" />
          <span>4. Local Agent</span>
        </button>
      </div>

      {/* Box View */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {currentTabLabel}
          </span>
          <span className="font-mono text-[11px]">
            {lines.length} líneas / max 40 car. por línea
          </span>
        </div>

        {/* B/L Physical Box Simulation */}
        <div className="relative font-mono text-xs bg-slate-900 text-emerald-400 p-4 rounded-lg shadow-inner border border-slate-700 overflow-x-auto leading-relaxed">
          <div className="absolute top-2 right-2 text-[10px] text-slate-500 uppercase tracking-widest font-sans select-none">
            Canonical B/L Standard
          </div>
          {lines.map((line: string, idx: number) => (
            <div key={idx} className="flex gap-3">
              <span className="text-slate-600 select-none w-4 text-right">
                {idx + 1}
              </span>
              <span className="font-semibold tracking-wide whitespace-pre">
                {line || <span className="text-slate-700">&lt;vacío&gt;</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
