/**
 * @file Header.tsx
 * @description Header banner, waybill selector, and navigation tabs for IATA ONE Record Hub.
 * @module @atlas/frontend/components/IataOneRecord/Header
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import {
  Plane,
  Download,
  Sparkles,
  Clock,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { Button } from "@atlas/ui";
import type { OneRecordWaybill } from "@atlas/shared";
import { IataOneRecordTabKey } from "../../types/iata-one-record.types";

export interface HeaderProps {
  waybills: OneRecordWaybill[];
  selectedWaybillId: string;
  setSelectedWaybillId: (id: string) => void;
  selectedWaybill: OneRecordWaybill;
  activeTab: IataOneRecordTabKey;
  setActiveTab: (tab: IataOneRecordTabKey) => void;
  onDownloadEawbPDF: (wbl: OneRecordWaybill) => void;
}

export const Header: React.FC<HeaderProps> = ({
  waybills,
  selectedWaybillId,
  setSelectedWaybillId,
  selectedWaybill,
  activeTab,
  setActiveTab,
  onDownloadEawbPDF,
}) => {
  return (
    <>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Plane className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                IATA ONE Record Hub & Cargo iQ e-AWB
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  W3C JSON-LD
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Linked Data Ontology para Carga Aérea · Cargo iQ SLA Milestones
                · IATA DGR e-DGD Validation Studio
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            id="waybillSelect"
            value={selectedWaybillId}
            onChange={(e) => setSelectedWaybillId(e.target.value)}
            className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {waybills.map((w) => (
              <option key={w.waybillId} value={w.waybillId}>
                {w.fullAwbNumber} ({w.originAirport} → {w.destinationAirport})
              </option>
            ))}
          </select>
          <Button
            id="btnDownloadAwbTop"
            onClick={() => onDownloadEawbPDF(selectedWaybill)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm"
          >
            <Download className="w-4 h-4" />
            Descargar e-AWB
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          id="tabJsonLdExplorer"
          onClick={() => setActiveTab("JSON_LD_EXPLORER")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "JSON_LD_EXPLORER"
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          JSON-LD Linked Data Explorer
        </button>

        <button
          id="tabCargoIqTimeline"
          onClick={() => setActiveTab("CARGO_IQ_TIMELINE")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "CARGO_IQ_TIMELINE"
              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Clock className="w-4 h-4" />
          Cargo iQ Milestone Control Tower
        </button>

        <button
          id="tabEdgdStudio"
          onClick={() => setActiveTab("EDGD_STUDIO")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "EDGD_STUDIO"
              ? "bg-amber-600/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          e-DGD Dangerous Goods Studio
        </button>

        <button
          id="tabEawbPouch"
          onClick={() => setActiveTab("EAWB_DIGITAL_POUCH")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "EAWB_DIGITAL_POUCH"
              ? "bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <FileText className="w-4 h-4" />
          e-AWB Digital Pouch & Resolution 600b
        </button>
      </div>
    </>
  );
};
