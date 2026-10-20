import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BellRing,
  Send,
  MessageSquare,
  ShieldCheck,
  Radio,
  Clock,
  Truck,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Plus,
  Flame,
  Snowflake,
  Anchor,
  FileText,
  TrendingDown,
  Lock,
} from "lucide-react";
import { Button, Input } from "@atlas/ui";
import { useApiQuery, useApiMutation, useQueryClient } from "../hooks/useApiQuery";
import type {
  OperationalAnomalyType,
  AnomalyPayloadContext,
  WebhookAuditLog,
  TelegramDriverMessage,
  TelegramDispatchOrder,
} from "@atlas/shared";
import {
  generateAdaptiveCardPayload,
  getAnomalyMetadata,
  getSampleAnomalyContext,
} from "@atlas/shared";

export default function OmnichannelNotificationsModule() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"TEAMS_STUDIO" | "TELEGRAM_DRIVER" | "AUDIT_LOG">("TEAMS_STUDIO");
  const [copiedJson, setCopiedJson] = useState(false);

  // Studio State
  const [selectedAnomaly, setSelectedAnomaly] = useState<OperationalAnomalyType>("COLD_CHAIN_TEMP_BREACH");
  const [targetWebhookUrl, setTargetWebhookUrl] = useState("SIMULATED");
  const [activeContext, setActiveContext] = useState<AnomalyPayloadContext>(
    getSampleAnomalyContext("COLD_CHAIN_TEMP_BREACH")
  );

  // New Driver Report Modal State
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [driverName, setDriverName] = useState("Antonio Ramos");
  const [driverChatId, setDriverChatId] = useState("@driver_antonio_bcn");
  const [driverTruckId, setDriverTruckId] = useState("TRK-7712-BXZ");
  const [driverReportType, setDriverReportType] = useState<"GATE_OUT_TIMESTAMP" | "YARD_DELAY" | "FUEL_RECEIPT" | "POD_SUBMISSION">("YARD_DELAY");
  const [driverDetails, setDriverDetails] = useState("Saturación en muelle de espera Can Tunis. Retraso estimado de 45 minutos.");
  const [driverAmount, setDriverAmount] = useState<number | undefined>(45);
  const [driverLocation, setDriverLocation] = useState("Can Tunis (Barcelona)");

  // New Dispatch Order Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderDriverName, setOrderDriverName] = useState("Juan Carlos Mendoza");
  const [orderChatId, setOrderChatId] = useState("@driver_juan_scm");
  const [orderTruckId, setOrderTruckId] = useState("TRK-4821-LXZ");
  const [orderPickup, setOrderPickup] = useState("Can Tunis Logistainer (Barcelona)");
  const [orderDelivery, setOrderDelivery] = useState("Customer01 Paper El Prat (TLSA)");
  const [orderCargo, setOrderCargo] = useState("1x 40ft HC Bobinas Papel Kraft (24,800 kg)");
  const [orderContainer, setOrderContainer] = useState("MSKU7729104");

  // Queries
  const { data: auditData } = useApiQuery<{ success: boolean; logs: WebhookAuditLog[] }>(
    ["teams-audit-log"],
    "/notifications/teams/audit-log"
  );

  const { data: telegramMessagesData } = useApiQuery<{ success: boolean; messages: TelegramDriverMessage[] }>(
    ["telegram-messages"],
    "/notifications/telegram/messages"
  );

  const { data: telegramOrdersData } = useApiQuery<{ success: boolean; orders: TelegramDispatchOrder[] }>(
    ["telegram-orders"],
    "/notifications/telegram/orders"
  );

  // Mutations
  const dispatchMutation = useApiMutation<any, { anomalyType: OperationalAnomalyType; context: AnomalyPayloadContext; targetWebhookUrl: string }>(
    "/notifications/teams/dispatch",
    "POST",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["teams-audit-log"] });
      },
    }
  );

  const driverReportMutation = useApiMutation<any, any>(
    "/notifications/telegram/driver-report",
    "POST",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["telegram-messages"] });
        setIsDriverModalOpen(false);
      },
    }
  );

  const dispatchOrderMutation = useApiMutation<any, any>(
    "/notifications/telegram/dispatch-order",
    "POST",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["telegram-orders"] });
        queryClient.invalidateQueries({ queryKey: ["telegram-messages"] });
        setIsOrderModalOpen(false);
      },
    }
  );

  const handleSelectAnomaly = (type: OperationalAnomalyType) => {
    setSelectedAnomaly(type);
    setActiveContext(getSampleAnomalyContext(type));
  };

  const currentPayload = generateAdaptiveCardPayload(selectedAnomaly, activeContext);
  const metadata = getAnomalyMetadata(selectedAnomaly, activeContext);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(currentPayload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const getAnomalyIcon = (type: OperationalAnomalyType) => {
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
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto text-slate-100">
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
              Tarjetas Interactivas Adaptive Cards • Bot Telegram para Transportistas • Alertas Operacionales con HMAC-SHA256
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
          Auditoría de Despacho ({auditData?.logs?.length || 0})
        </button>
      </div>

      {/* 3. TAB 1: MS TEAMS ADAPTIVE CARDS STUDIO */}
      {activeTab === "TEAMS_STUDIO" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Template Selector & Parameters Editor (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Anomaly Templates Selector */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Plantillas de Anomalías Operacionales (8)
              </span>

              <div className="grid grid-cols-1 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                {[
                  { type: "COLD_CHAIN_TEMP_BREACH", label: "Excursión Térmica en Frío (Pharma/Reefer)" },
                  { type: "CUSTOMS_CANAL_ROJO", label: "Canal Rojo Aduanero (Inspección Física)" },
                  { type: "HAZMAT_VIOLATION", label: "Infracción IMDG / ADR Mercancías Peligrosas" },
                  { type: "ETA_P1_CRITICAL_DELAY", label: "Retraso Crítico en Tránsito (> 48h)" },
                  { type: "DEMURRAGE_DETENTION_SPIKE", label: "Vencimiento Inminente de Días Libres (D&D)" },
                  { type: "GROSS_PROFIT_LEAKAGE", label: "Fuga de Margen de Beneficio Financiero" },
                  { type: "BL_RELEASE_BLOCKED", label: "Bloqueo de e-BL por Facturas Impagadas" },
                  { type: "SPAIN_FWD_REF_DUPLICATE", label: "Duplicidad de Referencia Transitaria" },
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleSelectAnomaly(item.type as OperationalAnomalyType)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition-all ${
                      selectedAnomaly === item.type
                        ? "bg-indigo-950/60 border-indigo-500 text-white font-semibold shadow-md"
                        : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getAnomalyIcon(item.type as OperationalAnomalyType)}
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
                  <label className="text-slate-400 block mb-1">GSID (Global Shipment ID)</label>
                  <Input
                    value={activeContext.gsid}
                    onChange={(e) => setActiveContext({ ...activeContext, gsid: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Severidad</label>
                    <select
                      value={activeContext.severity}
                      onChange={(e) => setActiveContext({ ...activeContext, severity: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Modo de Transporte</label>
                    <select
                      value={activeContext.transportMode || "MULTIMODAL"}
                      onChange={(e) => setActiveContext({ ...activeContext, transportMode: e.target.value })}
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
                  <label className="text-slate-400 block mb-1">Ubicación / Terminal</label>
                  <Input
                    value={activeContext.location || ""}
                    onChange={(e) => setActiveContext({ ...activeContext, location: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">URL de Webhook Entrante MS Teams</label>
                  <Input
                    placeholder="https://outlook.office.com/webhook/... o SIMULATED"
                    value={targetWebhookUrl}
                    onChange={(e) => setTargetWebhookUrl(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs font-mono text-slate-300"
                  />
                </div>

                <Button
                  onClick={() =>
                    dispatchMutation.mutate({
                      anomalyType: selectedAnomaly,
                      context: activeContext,
                      targetWebhookUrl,
                    })
                  }
                  disabled={dispatchMutation.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 mt-2 flex items-center justify-center gap-2"
                >
                  <Send className={`w-3.5 h-3.5 ${dispatchMutation.isPending ? "animate-pulse" : ""}`} />
                  {dispatchMutation.isPending ? "Despachando..." : "Despachar a MS Teams / Simular Webhook"}
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
                  onClick={handleCopyJson}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs flex items-center gap-1.5"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
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
                    <h3 className="text-sm font-bold leading-tight">{metadata.headline}</h3>
                    <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-0.5">
                      ATLAS-LOGISTICS SCM CONTROL TOWER • PRIORIDAD {activeContext.severity}
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
                      <span className="font-mono font-semibold text-white">{activeContext.gsid}</span>
                    </div>
                    <div>
                      <span className="text-[#A19F9D] block text-[11px]">Severidad</span>
                      <span className="font-semibold text-rose-400">{activeContext.severity}</span>
                    </div>
                    <div>
                      <span className="text-[#A19F9D] block text-[11px]">Modo de Transporte</span>
                      <span className="text-white">{activeContext.transportMode || "MULTIMODAL"}</span>
                    </div>
                    <div>
                      <span className="text-[#A19F9D] block text-[11px]">Ubicación</span>
                      <span className="text-white">{activeContext.location || "En Tránsito"}</span>
                    </div>
                    {activeContext.forwardingRef && (
                      <div>
                        <span className="text-[#A19F9D] block text-[11px]">Referencia Transitaria</span>
                        <span className="font-mono text-white">{activeContext.forwardingRef}</span>
                      </div>
                    )}
                    {activeContext.metadata &&
                      Object.entries(activeContext.metadata).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-[#A19F9D] block text-[11px] truncate">{k}</span>
                          <span className="text-white truncate block">{String(v)}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Operator Notice */}
                <div className="text-[11px] text-[#A19F9D] italic px-1">
                  Disparado por Motor de Telemetría & Torre de Control • Operador:{" "}
                  <strong className="text-white">{activeContext.operator || "Dispatcher de Guardia"}</strong>
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
      )}

      {/* 4. TAB 2: TELEGRAM DRIVER GATEWAY */}
      {activeTab === "TELEGRAM_DRIVER" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Driver Feed & Reports (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-5 h-5 text-sky-400" />
                  <h2 className="text-base font-bold text-white">Feed en Vivo de Transportistas (Telegram)</h2>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setIsDriverModalOpen(true)}
                    className="bg-sky-600 hover:bg-sky-500 text-white text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Simular Reporte de Chofer
                  </Button>
                </div>
              </div>

              {/* Messages Feed */}
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {telegramMessagesData?.messages?.map((msg) => (
                  <motion.div
                    key={msg.messageId}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sky-400">{msg.driverName}</span>
                        <span className="font-mono text-[10px] text-slate-500">{msg.telegramChatId}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                          {msg.truckId}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/60 text-slate-200 leading-relaxed">
                      {msg.details}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                      <span className="flex items-center gap-1">
                        <Radio className="w-3.5 h-3.5 text-sky-400" />
                        {msg.location || "Terminal Operativo"}
                      </span>
                      <span className="font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                        {msg.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Transport Orders Assigned (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-bold text-white">Órdenes de Transporte Asignadas</h2>
                </div>

                <Button
                  size="sm"
                  onClick={() => setIsOrderModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nueva Orden
                </Button>
              </div>

              {/* Orders List */}
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {telegramOrdersData?.orders?.map((ord) => (
                  <div
                    key={ord.orderId}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-400">{ord.orderId}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {ord.status}
                      </span>
                    </div>

                    <div className="text-slate-300 font-semibold">{ord.cargoDescription}</div>

                    <div className="space-y-1 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/40">
                      <div>
                        Chofer: <strong className="text-white">{ord.driverName}</strong> ({ord.truckId})
                      </div>
                      <div>
                        Origen: <span className="text-slate-300">{ord.pickupLocation}</span>
                      </div>
                      <div>
                        Destino: <span className="text-slate-300">{ord.deliveryLocation}</span>
                      </div>
                      {ord.containerNumber && (
                        <div>
                          Contenedor: <span className="font-mono text-indigo-300">{ord.containerNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 3: AUDIT LOG */}
      {activeTab === "AUDIT_LOG" && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Bitácora de Auditoría de Webhooks Despachados
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300">
                  {auditData?.logs?.length || 0} Registros
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Verificación de entrega, código HTTP y firmas criptográficas HMAC-SHA256
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["teams-audit-log"] })}
              className="border-slate-700 text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar Bitácora
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">ID Despacho</th>
                  <th className="p-3">Tipo de Anomalía</th>
                  <th className="p-3">GSID</th>
                  <th className="p-3">Destino Webhook</th>
                  <th className="p-3">Estatus</th>
                  <th className="p-3">Firma HMAC-SHA256</th>
                  <th className="p-3">Fecha / Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditData?.logs?.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-mono text-slate-400">{log.id}</td>
                    <td className="p-3 font-semibold text-slate-200">{log.anomalyType}</td>
                    <td className="p-3 font-mono text-indigo-400">{log.gsid}</td>
                    <td className="p-3 text-slate-400 truncate max-w-[180px]">{log.targetUrl}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === "DELIVERED"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : log.status === "SIMULATED"
                            ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {log.status} ({log.httpStatus || 200})
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-500 truncate max-w-[150px]">
                      {log.hmacSignature || "N/A"}
                    </td>
                    <td className="p-3 text-slate-400 font-mono">
                      {new Date(log.dispatchedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Simular Reporte de Chofer */}
      <AnimatePresence>
        {isDriverModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100"
            >
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold">Simular Reporte de Chofer (Telegram)</h3>
              </div>

              <div className="space-y-3 mb-5 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Nombre del Chofer</label>
                  <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} className="bg-slate-950 border-slate-800" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Telegram Chat ID</label>
                    <Input value={driverChatId} onChange={(e) => setDriverChatId(e.target.value)} className="bg-slate-950 border-slate-800 font-mono" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Matrícula / Camión</label>
                    <Input value={driverTruckId} onChange={(e) => setDriverTruckId(e.target.value)} className="bg-slate-950 border-slate-800 font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Tipo de Evento</label>
                  <select
                    value={driverReportType}
                    onChange={(e) => setDriverReportType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                  >
                    <option value="GATE_OUT_TIMESTAMP">Salida de Garita Aduanal (Gate-Out)</option>
                    <option value="YARD_DELAY">Retraso / Espera en Patio</option>
                    <option value="FUEL_RECEIPT">Recibo de Combustible / Peaje</option>
                    <option value="POD_SUBMISSION">Entrega Confirmada POD</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Detalle del Reporte</label>
                  <Input value={driverDetails} onChange={(e) => setDriverDetails(e.target.value)} className="bg-slate-950 border-slate-800" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Minutos / Monto €</label>
                    <Input
                      type="number"
                      value={driverAmount || ""}
                      onChange={(e) => setDriverAmount(parseFloat(e.target.value) || undefined)}
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Ubicación</label>
                    <Input value={driverLocation} onChange={(e) => setDriverLocation(e.target.value)} className="bg-slate-950 border-slate-800" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDriverModalOpen(false)} className="border-slate-800 text-xs">
                  Cancelar
                </Button>
                <Button
                  onClick={() =>
                    driverReportMutation.mutate({
                      driverName,
                      telegramChatId: driverChatId,
                      truckId: driverTruckId,
                      reportType: driverReportType,
                      details: driverDetails,
                      amountOrMinutes: driverAmount,
                      location: driverLocation,
                    })
                  }
                  disabled={driverReportMutation.isPending}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                >
                  Enviar Reporte
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Nueva Orden de Despacho */}
      <AnimatePresence>
        {isOrderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100"
            >
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold">Despachar Orden de Transporte a Telegram</h3>
              </div>

              <div className="space-y-3 mb-5 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Chofer Asignado</label>
                  <Input value={orderDriverName} onChange={(e) => setOrderDriverName(e.target.value)} className="bg-slate-950 border-slate-800" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Telegram Chat ID</label>
                    <Input value={orderChatId} onChange={(e) => setOrderChatId(e.target.value)} className="bg-slate-950 border-slate-800 font-mono" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Matrícula</label>
                    <Input value={orderTruckId} onChange={(e) => setOrderTruckId(e.target.value)} className="bg-slate-950 border-slate-800 font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Lugar de Carga (Origen)</label>
                  <Input value={orderPickup} onChange={(e) => setOrderPickup(e.target.value)} className="bg-slate-950 border-slate-800" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Lugar de Entrega (Destino)</label>
                  <Input value={orderDelivery} onChange={(e) => setOrderDelivery(e.target.value)} className="bg-slate-950 border-slate-800" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Descripción de la Carga</label>
                  <Input value={orderCargo} onChange={(e) => setOrderCargo(e.target.value)} className="bg-slate-950 border-slate-800" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Contenedor (Opcional)</label>
                  <Input value={orderContainer} onChange={(e) => setOrderContainer(e.target.value)} className="bg-slate-950 border-slate-800 font-mono" />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOrderModalOpen(false)} className="border-slate-800 text-xs">
                  Cancelar
                </Button>
                <Button
                  onClick={() =>
                    dispatchOrderMutation.mutate({
                      driverName: orderDriverName,
                      telegramChatId: orderChatId,
                      truckId: orderTruckId,
                      pickupLocation: orderPickup,
                      deliveryLocation: orderDelivery,
                      cargoDescription: orderCargo,
                      containerNumber: orderContainer,
                    })
                  }
                  disabled={dispatchOrderMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  Despachar Orden
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
