import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Network,
  Database,
  Activity,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowLeftRight,
  Wifi,
  WifiOff,
  FileCode,
  DollarSign,
  Package,
  Send,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@atlas/ui";
import {
  ERP_DEMO_PRESETS,
  erpQueueManager,
  type ErpConnectorStatus,
  type ErpQueuedMutation,
} from "@atlas/shared";
import { useApiMutation } from "../hooks/useApiQuery";

type TabKey = "TOPOLOGY" | "MAPPING" | "SANDBOX" | "QUEUE";
type PresetKey = "sap_automotive_tier1" | "netsuite_retail_hightech";

export default function ErpIntegrationsModule() {
  const [activeTab, setActiveTab] = useState<TabKey>("TOPOLOGY");
  const [selectedPresetKey, setSelectedPresetKey] = useState<PresetKey>("sap_automotive_tier1");
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [activeConsoleLog, setActiveConsoleLog] = useState<any>(null);
  const [queueItems, setQueueItems] = useState<ErpQueuedMutation[]>([]);

  // Telemetry status state
  const [connectors] = useState<ErpConnectorStatus[]>([
    {
      system: "SAP_S4HANA",
      endpoint: "https://s4hana-api.corp.internal/sap/opu/odata4/sap/api_purchaseorder_process_srv/srvd_a2x/sap/purchaseorder/0001",
      status: "ONLINE",
      circuitBreaker: "CLOSED",
      latencyMs: 115,
      lastSyncTimestamp: Date.now() - 45000,
      activeAuthMethod: "ODATA_CSRF",
      metrics: {
        totalSyncedToday: 148,
        failedSyncCount: 0,
        pendingQueueDepth: 0,
        averageLatencyMs: 122,
      },
    },
    {
      system: "ORACLE_NETSUITE",
      endpoint: "https://rest.netsuite.com/services/rest/record/v1",
      status: "ONLINE",
      circuitBreaker: "CLOSED",
      latencyMs: 165,
      lastSyncTimestamp: Date.now() - 120000,
      activeAuthMethod: "SUITETALK_TBA_HMAC256",
      metrics: {
        totalSyncedToday: 92,
        failedSyncCount: 0,
        pendingQueueDepth: 0,
        averageLatencyMs: 174,
      },
    },
  ]);

  const currentPreset = ERP_DEMO_PRESETS[selectedPresetKey];

  // Refresh local Dexie queue
  const refreshQueue = async () => {
    const items = await erpQueueManager.getAll();
    setQueueItems(items);
  };

  useEffect(() => {
    refreshQueue();
  }, []);

  // API Mutations
  const syncSapPoMutation = useApiMutation<any, { poNumber: string }>(
    "/erp-integrations/sap/sync-po",
    "POST",
    {
      onSuccess: (res) => {
        setActiveConsoleLog({
          title: "SAP S/4HANA PO Sincronizado Exitosamente",
          system: "SAP_S4HANA",
          protocol: "OData v4 REST (JSON)",
          csrfToken: res.csrfToken,
          data: res.data,
        });
      },
    }
  );

  const postSapDeliveryMutation = useApiMutation<any, any>(
    "/erp-integrations/sap/post-delivery",
    "POST",
    {
      onSuccess: (res) => {
        setActiveConsoleLog({
          title: "Entrega Entrante (ASN) Generada en SAP",
          system: "SAP_S4HANA",
          protocol: "OData v4 (A_InboundDeliveryHeader)",
          deliveryDocument: res.deliveryDocument,
          data: res.data,
        });
      },
    }
  );

  const postNetSuiteReceiptMutation = useApiMutation<any, any>(
    "/erp-integrations/netsuite/post-receipt",
    "POST",
    {
      onSuccess: (res) => {
        setActiveConsoleLog({
          title: "Item Receipt & Landed Cost Generado en NetSuite",
          system: "ORACLE_NETSUITE",
          protocol: "SuiteTalk REST Web Services",
          receiptId: res.receiptId,
          data: res.landedCost,
        });
      },
    }
  );

  const batchQueueMutation = useApiMutation<any, { mutations: any[] }>(
    "/erp-integrations/queue/batch",
    "POST",
    {
      onSuccess: async (res) => {
        await erpQueueManager.purgeCompleted();
        await refreshQueue();
        setActiveConsoleLog({
          title: "Cola Local Dexie Drenada hacia el Servidor",
          system: "HYBRID_DEXIE_LIB_SQL",
          protocol: "Batch Sync Pipeline",
          processedCount: res.processedCount,
          data: res.results,
        });
      },
    }
  );

  // Handlers
  const handleSelectPreset = (key: PresetKey) => {
    setSelectedPresetKey(key);
  };

  const handleExecuteSapPoSync = () => {
    if (isSimulatedOffline) {
      handleEnqueueOffline("SAP_S4HANA", "SYNC_PO", {
        poNumber: currentPreset.sampleInput.referenceNumber,
      });
      return;
    }
    syncSapPoMutation.mutate({ poNumber: currentPreset.sampleInput.referenceNumber });
  };

  const handleExecuteSapDelivery = () => {
    if (isSimulatedOffline) {
      handleEnqueueOffline("SAP_S4HANA", "POST_INBOUND_DELIVERY", {
        poNumber: currentPreset.sampleInput.referenceNumber,
        billOfLading: "MSCUBCN992811",
        carrierName: "MSC",
        containerId: "MSCU119920",
        items: [{ material: "MAT-AUTO-ENG", quantity: 40 }],
      });
      return;
    }
    postSapDeliveryMutation.mutate({
      poNumber: currentPreset.sampleInput.referenceNumber,
      billOfLading: "MSCUBCN992811",
      carrierName: "MSC Mediterranean Shipping",
      containerId: "MSCU119920",
      items: [{ material: "MAT-AUTO-ENG", quantity: 40 }],
    });
  };

  const handleExecuteNetSuiteReceipt = () => {
    if (isSimulatedOffline) {
      handleEnqueueOffline("ORACLE_NETSUITE", "POST_ITEM_RECEIPT", {
        orderNumber: currentPreset.sampleInput.referenceNumber,
        totalFreight: currentPreset.sampleInput.freightChargesUsd,
      });
      return;
    }
    postNetSuiteReceiptMutation.mutate({
      orderNumber: currentPreset.sampleInput.referenceNumber,
      bolNumber: "HLCUTPE88192",
      totalFreight: currentPreset.sampleInput.freightChargesUsd,
      method: "VOLUME",
      items: currentPreset.sampleInput.items,
    });
  };

  const handleEnqueueOffline = async (
    erpSystem: "SAP_S4HANA" | "ORACLE_NETSUITE",
    operation: any,
    payload: any
  ) => {
    const item = await erpQueueManager.enqueue({
      erpSystem,
      operation,
      payloadJson: JSON.stringify(payload),
      idempotencyKey: erpQueueManager.generateIdempotencyKey(erpSystem, operation, "MOCK"),
    });
    await refreshQueue();
    setActiveConsoleLog({
      title: "Transacción Encolada en IndexedDB (Modo Offline)",
      system: erpSystem,
      protocol: "Dexie.js Local Store",
      offlineId: item.id,
      status: "PENDING_NETWORK",
    });
  };

  const handleFlushDexieQueue = () => {
    const pending = queueItems.filter((q) => q.status === "PENDING" || q.status === "FAILED");
    if (pending.length === 0) return;
    batchQueueMutation.mutate({
      mutations: pending.map((p) => ({
        id: p.id,
        erpSystem: p.erpSystem,
        operation: p.operation,
        payloadJson: p.payloadJson,
      })),
    });
  };

  const handleCopyJson = () => {
    if (activeConsoleLog) {
      navigator.clipboard.writeText(JSON.stringify(activeConsoleLog, null, 2));
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* 1. Top Header & Enterprise Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Conectores ERP & Integración Empresarial
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  SAP S/4HANA OData
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  NetSuite SuiteTalk
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Orquestación bidireccional de Órdenes de Compra (PO), Entregas Entrantes (ASN), Recepción y Landed Cost con resiliencia IndexedDB
              </p>
            </div>
          </div>
        </div>

        {/* Action Pills & Network Status */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            onClick={() => setIsSimulatedOffline(!isSimulatedOffline)}
            className={`cursor-pointer px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
              isSimulatedOffline
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            {isSimulatedOffline ? <WifiOff className="w-4 h-4 text-rose-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
            <span className="font-semibold">{isSimulatedOffline ? "Modo Offline (Simulado)" : "Conectividad Online"}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Cola Dexie:</span>
            <span className="font-mono text-cyan-300 font-bold">{queueItems.length} Registros</span>
          </div>
        </div>
      </div>

      {/* 2. Preset Selector Banner */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-300">Escenarios Demostrativos ERP:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSelectPreset("sap_automotive_tier1")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              selectedPresetKey === "sap_automotive_tier1"
                ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
          >
            SAP S/4HANA (Automotriz Alemania)
          </button>
          <button
            onClick={() => handleSelectPreset("netsuite_retail_hightech")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              selectedPresetKey === "netsuite_retail_hightech"
                ? "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30"
                : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
          >
            Oracle NetSuite (High-Tech Taiwán)
          </button>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("TOPOLOGY")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeTab === "TOPOLOGY"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Network className="w-4 h-4" />
          Conectores & Topología ERP
        </button>

        <button
          onClick={() => setActiveTab("MAPPING")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeTab === "MAPPING"
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Estudio de Mapeo de Esquemas (Bi-Direccional)
        </button>

        <button
          onClick={() => setActiveTab("SANDBOX")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeTab === "SANDBOX"
              ? "border-amber-500 text-amber-400 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-4 h-4" />
          Simulador de Telemetría & Sandbox en Vivo
        </button>

        <button
          onClick={() => setActiveTab("QUEUE")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeTab === "QUEUE"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Database className="w-4 h-4" />
          Cola Offline Dexie & Resiliencia de Red
        </button>
      </div>

      {/* 4. Tab 1: Conectores & Topología ERP */}
      {activeTab === "TOPOLOGY" && (
        <motion.div
          key="topology"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SAP S/4HANA Card */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold font-mono">
                    SAP
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">SAP S/4HANA Cloud Gateway</h3>
                    <span className="text-xs text-slate-400">OData v4 REST / BAPI Business Object Pipeline</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ONLINE
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Endpoint Primario:</span>
                  <span className="font-mono text-slate-200 text-[11px] truncate max-w-[280px]">
                    {connectors[0].endpoint}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Autenticación / Handshake:</span>
                  <span className="text-blue-300 font-mono font-semibold">OAuth 2.0 + CSRF Token (x-csrf-token)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Circuit Breaker:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                    CLOSED (Normal)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Latencia Ping Promedio:</span>
                  <span className="font-mono text-slate-200">{connectors[0].latencyMs} ms</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Transacciones Hoy:</span>
                  <span className="font-mono text-emerald-400 font-bold">148 Transacciones (100% Éxito)</span>
                </div>
              </div>
            </div>

            {/* Oracle NetSuite Card */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold font-mono">
                    NS
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Oracle NetSuite ERP Production</h3>
                    <span className="text-xs text-slate-400">SuiteTalk REST Web Services & Landed Cost Engine</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ONLINE
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Endpoint Primario:</span>
                  <span className="font-mono text-slate-200 text-[11px] truncate max-w-[280px]">
                    {connectors[1].endpoint}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Autenticación / Handshake:</span>
                  <span className="text-amber-300 font-mono font-semibold">TBA (OAuth 1.0a HMAC-SHA256)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Circuit Breaker:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                    CLOSED (Normal)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Latencia Ping Promedio:</span>
                  <span className="font-mono text-slate-200">{connectors[1].latencyMs} ms</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Transacciones Hoy:</span>
                  <span className="font-mono text-emerald-400 font-bold">92 Transacciones (100% Éxito)</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 5. Tab 2: Estudio de Mapeo de Esquemas */}
      {activeTab === "MAPPING" && (
        <motion.div
          key="mapping"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
                Matriz de Transformación y Equivalencia de Campos
              </h3>
              <p className="text-xs text-slate-400">
                Transformación canónica entre entidades de Atlas-Logistics y estructuras BAPI OData / SuiteTalk
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                  <th className="p-3">Entidad Canónica Atlas</th>
                  <th className="p-3">Campo SAP S/4HANA (OData)</th>
                  <th className="p-3">Campo Oracle NetSuite (REST)</th>
                  <th className="p-3">Regla de Transformación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                <tr>
                  <td className="p-3 font-mono text-indigo-300 font-semibold">shipment.referenceNumber</td>
                  <td className="p-3 font-mono text-blue-300">PurchaseOrder (EBELN)</td>
                  <td className="p-3 font-mono text-amber-300">tranId</td>
                  <td className="p-3 text-slate-400">Mapeo directo bidireccional</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-indigo-300 font-semibold">shipment.bolNumber</td>
                  <td className="p-3 font-mono text-blue-300">BillOfLading (BOLNR)</td>
                  <td className="p-3 font-mono text-amber-300">package.packageTrackingNumber</td>
                  <td className="p-3 text-slate-400">Inyección en manifiesto de transporte</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-indigo-300 font-semibold">shipment.incoterm</td>
                  <td className="p-3 font-mono text-blue-300">IncotermsClassification (INCO1)</td>
                  <td className="p-3 font-mono text-amber-300">incoterm</td>
                  <td className="p-3 text-slate-400">Normalización Incoterms 2020 (ICC)</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-indigo-300 font-semibold">cargo.weightKg</td>
                  <td className="p-3 font-mono text-blue-300">GrossWeight (BRGEW / KGM)</td>
                  <td className="p-3 font-mono text-amber-300">packageWeight (Lbs / Kg)</td>
                  <td className="p-3 text-slate-400">Conversión métrica e ISO UoM (KGM)</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-indigo-300 font-semibold">finance.freightAccrual</td>
                  <td className="p-3 font-mono text-blue-300">ServiceEntrySheet (SES)</td>
                  <td className="p-3 font-mono text-amber-300">landedCost.allocatedAmount</td>
                  <td className="p-3 text-slate-400">Prorrateo por Volumen CBM o Valor</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* 6. Tab 3: Simulador de Telemetría & Sandbox en Vivo */}
      {activeTab === "SANDBOX" && (
        <motion.div
          key="sandbox"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Controls Left Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                Acciones de Disparo & Sincronización
              </h3>

              <div className="space-y-3">
                <Button
                  onClick={handleExecuteSapPoSync}
                  disabled={syncSapPoMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center justify-between py-3"
                >
                  <span className="flex items-center gap-2">
                    <Send className="w-3.5 h-3.5" />
                    1. Ingestar Orden de Compra SAP (OData v4)
                  </span>
                  {syncSapPoMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                </Button>

                <Button
                  onClick={handleExecuteSapDelivery}
                  disabled={postSapDeliveryMutation.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center justify-between py-3"
                >
                  <span className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5" />
                    2. Generar Entrega Entrante SAP (ASN / BAPI)
                  </span>
                  {postSapDeliveryMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                </Button>

                <Button
                  onClick={handleExecuteNetSuiteReceipt}
                  disabled={postNetSuiteReceiptMutation.isPending}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs flex items-center justify-between py-3"
                >
                  <span className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5" />
                    3. Postear Item Receipt & Landed Cost en NetSuite
                  </span>
                  {postNetSuiteReceiptMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Console Right Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 min-h-[380px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Consola de Respuesta ERP en Vivo
                    </span>
                  </div>
                  {activeConsoleLog && (
                    <button
                      onClick={handleCopyJson}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                    >
                      {copiedResponse ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedResponse ? "Copiado" : "Copiar JSON"}
                    </button>
                  )}
                </div>

                <div className="mt-4 p-4 rounded-xl bg-slate-950 font-mono text-xs overflow-auto max-h-[360px] border border-slate-800 text-emerald-400">
                  {activeConsoleLog ? (
                    <pre>{JSON.stringify(activeConsoleLog, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-600 italic">
                      Presione una acción de sincronización para ver el payload OData o SuiteTalk en tiempo real.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 7. Tab 4: Cola Offline Dexie & Resiliencia */}
      {activeTab === "QUEUE" && (
        <motion.div
          key="queue"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                Bandeja de Mutaciones Offline (Dexie.js / IndexedDB)
              </h3>
              <p className="text-xs text-slate-400">
                Almacenamiento local desacoplado de transacciones pendientes con drenaje garantizado al restaurar red
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() =>
                  handleEnqueueOffline("SAP_S4HANA", "POST_INBOUND_DELIVERY", {
                    demo: "manual_enqueue",
                    timestamp: Date.now(),
                  })
                }
                size="sm"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
              >
                + Encolar Transacción Manual
              </Button>
              <Button
                onClick={handleFlushDexieQueue}
                disabled={batchQueueMutation.isPending || queueItems.length === 0}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1.5"
              >
                {batchQueueMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Drenar Cola hacia el Servidor
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {queueItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No hay transacciones pendientes en la cola local IndexedDB.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                    <th className="p-3">ID Mutación</th>
                    <th className="p-3">Sistema ERP</th>
                    <th className="p-3">Operación</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Reintentos</th>
                    <th className="p-3">Idempotency Key</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {queueItems.map((q) => (
                    <tr key={q.id}>
                      <td className="p-3 text-slate-300">{q.id}</td>
                      <td className="p-3 text-blue-300 font-bold">{q.erpSystem}</td>
                      <td className="p-3 text-slate-200">{q.operation}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                          {q.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{q.retryCount}</td>
                      <td className="p-3 text-[10px] text-slate-500">{q.idempotencyKey}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
