/**
 * @file Header.tsx
 * @description Header, live channel status pills, and navigation tabs for Omnichannel Notifications.
 * @module @atlas/frontend/components/OmnichannelNotifications/Header
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import { BellRing, ShieldCheck, Truck, FileText } from "lucide-react";
import { OmnichannelTabId } from "../../types/omnichannel-notifications.types";

export interface HeaderProps {
  activeTab: OmnichannelTabId;
  setActiveTab: (tab: OmnichannelTabId) => void;
  auditCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  auditCount,
}) => {
  return (
    <>
      {/* 1. Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Notificaciones Omnicanal & Despacho a Choferes
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                MS Teams 1.5 & Telegram
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Tarjetas Interactivas Adaptive Cards • Bot Telegram para
              Transportistas • Alertas Operacionales con HMAC-SHA256
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Teams Webhook:</span>
            <span className="font-semibold text-slate-200">ACTIVO</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-slate-400">Telegram Bot:</span>
            <span className="font-semibold text-slate-200">ONLINE</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>HMAC-SHA256</span>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("TEAMS_STUDIO")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "TEAMS_STUDIO"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <BellRing className="w-4 h-4" />
          Estudio de Adaptive Cards (MS Teams)
        </button>

        <button
          onClick={() => setActiveTab("TELEGRAM_DRIVER")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "TELEGRAM_DRIVER"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <Truck className="w-4 h-4" />
          Centro de Choferes (Telegram Gateway)
        </button>

        <button
          onClick={() => setActiveTab("AUDIT_LOG")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "AUDIT_LOG"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <FileText className="w-4 h-4" />
          Auditoría de Despacho ({auditCount})
        </button>
      </div>
    </>
  );
};
