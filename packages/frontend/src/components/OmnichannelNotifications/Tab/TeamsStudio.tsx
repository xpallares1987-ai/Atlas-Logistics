/**
 * @file TeamsStudio.tsx
 * @description Microsoft Teams Adaptive Card v1.5 template studio and live preview renderer tab.
 * @module @atlas/frontend/components/OmnichannelNotifications/Tab/TeamsStudio
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import {
  Send,
  Check,
  Copy,
  ExternalLink,
  Snowflake,
  AlertTriangle,
  Flame,
  Clock,
  Anchor,
  TrendingDown,
  Lock,
  FileText,
} from "lucide-react";
import { Button, Input } from "@atlas/ui";
import type {
  AnomalyPayloadContext,
  OperationalAnomalyType,
} from "@atlas/shared";
import { ANOMALY_TEMPLATES } from "../hooks/useOmnichannelNotifications";

function getAnomalyIcon(type: OperationalAnomalyType) {
  switch (type) {
    case "COLD_CHAIN_TEMP_BREACH":
      return <Snowflake className="w-4 h-4 text-sky-400" />;
    case "CUSTOMS_CANAL_ROJO":
      return <AlertTriangle className="w-4 h-4 text-rose-400" />;
    case "HAZMAT_VIOLATION":
      return <Flame className="w-4 h-4 text-amber-400" />;
    case "ETA_P1_CRITICAL_DELAY":
      return <Clock className="w-4 h-4 text-orange-400" />;
    case "DEMURRAGE_DETENTION_SPIKE":
      return <Anchor className="w-4 h-4 text-indigo-400" />;
    case "GROSS_PROFIT_LEAKAGE":
      return <TrendingDown className="w-4 h-4 text-red-400" />;
    case "BL_RELEASE_BLOCKED":
      return <Lock className="w-4 h-4 text-purple-400" />;
    case "SPAIN_FWD_REF_DUPLICATE":
    default:
      return <FileText className="w-4 h-4 text-slate-400" />;
  }
}

export interface TeamsStudioProps {
  selectedAnomaly: OperationalAnomalyType;
  onSelectAnomaly: (type: OperationalAnomalyType) => void;
  activeContext: AnomalyPayloadContext;
  setActiveContext: (ctx: AnomalyPayloadContext) => void;
  targetWebhookUrl: string;
  setTargetWebhookUrl: (url: string) => void;
  currentPayload: any;
  metadata: any;
  copiedJson: boolean;
  onCopyJson: () => void;
  isDispatching: boolean;
  onDispatch: () => void;
}

export const TeamsStudio: React.FC<TeamsStudioProps> = ({
  selectedAnomaly,
  onSelectAnomaly,
  activeContext,
  setActiveContext,
  targetWebhookUrl,
  setTargetWebhookUrl,
  currentPayload,
  metadata,
  copiedJson,
  onCopyJson,
  isDispatching,
  onDispatch,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Template Selector & Parameters Editor (5 Cols) */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        {/* Anomaly Templates Selector */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Plantillas de Anomalías Operacionales (8)
          </span>

          <div className="grid grid-cols-1 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
            {ANOMALY_TEMPLATES.map((item) => (
              <button
                key={item.type}
                onClick={() => onSelectAnomaly(item.type)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-all ${
                  selectedAnomaly === item.type
                    ? "bg-indigo-950/60 border-indigo-500 text-white font-semibold shadow-md"
                    : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                }`}
              >
                <div className="flex items-center gap-2">
                  {getAnomalyIcon(item.type)}
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Context Parameter Editor */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Parámetros del Contexto Operativo
          </span>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">
                GSID (Global Shipment ID)
              </label>
              <Input
                value={activeContext.gsid}
                onChange={(e) =>
                  setActiveContext({
                    ...activeContext,
                    gsid: e.target.value,
                  })
                }
                className="bg-slate-950 border-slate-800 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Severidad</label>
                <select
                  value={activeContext.severity}
                  onChange={(e) =>
                    setActiveContext({
                      ...activeContext,
                      severity: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Modo de Transporte
                </label>
                <select
                  value={activeContext.transportMode || "MULTIMODAL"}
                  onChange={(e) =>
                    setActiveContext({
                      ...activeContext,
                      transportMode: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                >
                  <option value="SEA">SEA (Marítimo)</option>
                  <option value="ROAD">ROAD (Carretera)</option>
                  <option value="RAIL">RAIL (Ferrocarril)</option>
                  <option value="AIR">AIR (Aéreo)</option>
                  <option value="MULTIMODAL">MULTIMODAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">
                Ubicación / Terminal
              </label>
              <Input
                value={activeContext.location || ""}
                onChange={(e) =>
                  setActiveContext({
                    ...activeContext,
                    location: e.target.value,
                  })
                }
                className="bg-slate-950 border-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">
                URL de Webhook Entrante MS Teams
              </label>
              <Input
                placeholder="https://outlook.office.com/webhook/... o canal interno"
                value={targetWebhookUrl}
                onChange={(e) => setTargetWebhookUrl(e.target.value)}
                className="bg-slate-950 border-slate-800 text-xs font-mono text-slate-300"
              />
            </div>

            <Button
              onClick={onDispatch}
              disabled={isDispatching}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 mt-2 flex items-center justify-center gap-2"
            >
              <Send
                className={`w-3.5 h-3.5 ${isDispatching ? "animate-pulse" : ""}`}
              />
              {isDispatching
                ? "Despachando..."
                : "Despachar Notificación a MS Teams"}
            </Button>
          </div>
        </div>
      </div>

      {/* Right Column: Live Visual Adaptive Card Renderer (7 Cols) */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex-1 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Previsualizador en Vivo: Adaptive Card v1.5
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Teams Dark Mode
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Renderizado nativo conforme a los componentes de Microsoft Teams
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={onCopyJson}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs flex items-center gap-1.5"
            >
              {copiedJson ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedJson ? "Copiado" : "Copiar JSON"}
            </Button>
          </div>

          {/* Microsoft Teams Card Shell Simulation */}
          <div className="mt-4 p-4 rounded-xl bg-[#201F1F] border border-[#3B3A39] text-[#F3F2F1] shadow-2xl space-y-3 font-sans">
            {/* Header Banner */}
            <div
              className={`p-3.5 rounded-lg flex items-center gap-3.5 ${
                metadata.accentContainerColor === "attention"
                  ? "bg-rose-950/80 border-l-4 border-rose-500 text-white"
                  : metadata.accentContainerColor === "warning"
                    ? "bg-amber-950/80 border-l-4 border-amber-500 text-white"
                    : "bg-indigo-950/80 border-l-4 border-indigo-500 text-white"
              }`}
            >
              <span className="text-3xl shrink-0">{metadata.bannerIcon}</span>
              <div>
                <h3 className="text-sm font-bold leading-tight">
                  {metadata.headline}
                </h3>
                <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-0.5">
                  ATLAS-LOGISTICS SCM CONTROL TOWER • PRIORIDAD{" "}
                  {activeContext.severity}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="p-3 bg-[#292827] rounded-lg text-xs leading-relaxed text-[#E1DFDD]">
              {metadata.description}
            </div>

            {/* FactSet Table */}
            <div className="p-3 bg-[#292827] rounded-lg border border-[#3B3A39]/60">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#A19F9D] block text-[11px]">GSID</span>
                  <span className="font-mono font-semibold text-white">
                    {activeContext.gsid}
                  </span>
                </div>
                <div>
                  <span className="text-[#A19F9D] block text-[11px]">
                    Severidad
                  </span>
                  <span className="font-semibold text-rose-400">
                    {activeContext.severity}
                  </span>
                </div>
                <div>
                  <span className="text-[#A19F9D] block text-[11px]">
                    Modo de Transporte
                  </span>
                  <span className="text-white">
                    {activeContext.transportMode || "MULTIMODAL"}
                  </span>
                </div>
                <div>
                  <span className="text-[#A19F9D] block text-[11px]">
                    Ubicación
                  </span>
                  <span className="text-white">
                    {activeContext.location || "En Tránsito"}
                  </span>
                </div>
                {activeContext.forwardingRef && (
                  <div>
                    <span className="text-[#A19F9D] block text-[11px]">
                      Referencia Transitaria
                    </span>
                    <span className="font-mono text-white">
                      {activeContext.forwardingRef}
                    </span>
                  </div>
                )}
                {activeContext.metadata &&
                  Object.entries(activeContext.metadata).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-[#A19F9D] block text-[11px] truncate">
                        {k}
                      </span>
                      <span className="text-white truncate block">
                        {String(v)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Operator Notice */}
            <div className="text-[11px] text-[#A19F9D] italic px-1">
              Disparado por Motor de Telemetría & Torre de Control • Operador:{" "}
              <strong className="text-white">
                {activeContext.operator || "Dispatcher de Guardia"}
              </strong>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap gap-2">
              <button className="px-3.5 py-1.5 rounded bg-[#4F52B2] hover:bg-[#5B5FC7] text-white text-xs font-semibold flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                Inspeccionar {activeContext.gsid} en Torre de Control
              </button>
              <button className="px-3.5 py-1.5 rounded bg-[#3B3A39] hover:bg-[#484644] text-white text-xs font-semibold">
                Abrir Sala de Incidentes (War Room)
              </button>
            </div>
          </div>

          {/* Raw JSON Accordion */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400 block mb-2">
              Esquema JSON de la Carga Útil (Adaptive Card 1.5):
            </span>
            <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-[10px] text-slate-300 max-h-48 overflow-y-auto">
              {JSON.stringify(currentPayload, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
