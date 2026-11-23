/**
 * @file ErpIntegrationsModule.tsx
 * @description Enterprise ERP Bi-Directional Connectors Workspace (SAP S/4HANA, NetSuite, and Dynamics 365 BC).
 * @module @atlas/frontend/pages/ErpIntegrationsModule
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import { useState, useEffect, useCallback } from "react";
import {
  Network,
  Database,
  Activity,
  ArrowLeftRight,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { Button } from "@atlas/ui";
import {
  erpQueueManager,
  type ErpConnectorStatus,
  type ErpQueuedMutation,
} from "@atlas/shared";
import { useApiMutation, useApiQuery } from "../hooks/useApiQuery";
import { useShipments, type Shipment } from "../hooks/useShipments";
import {
  Topology,
  Mapping,
  Sandbox,
  Queue,
  type PresetKey,
  type ErpPurchaseOrder,
} from "../components/ErpIntegrations";

type TabKey = "TOPOLOGY" | "MAPPING" | "SANDBOX" | "QUEUE";

export default function ErpIntegrationsModule() {
  const [activeTab, setActiveTab] = useState<TabKey>("TOPOLOGY");
  const [selectedShipmentId, setSelectedShipmentId] =
    useState<string>("sh_demo_01");
  const [selectedPoNumber, setSelectedPoNumber] =
    useState<string>("4500891234");
  const [selectedPresetKey, setSelectedPresetKey] = useState<PresetKey>(
    "sap_automotive_tier1",
  );
  const [copiedResponse, setCopiedResponse] = useState<boolean>(false);
  const [isOffline] = useState<boolean>(!navigator.onLine);
  const [activeConsoleLog, setActiveConsoleLog] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [queueItems, setQueueItems] = useState<ErpQueuedMutation[]>([]);

  // 1. Data queries
  const { data: shipments = [] } = useShipments();
  const activeShipment = shipments.find(
    (s: Shipment) => s.id === selectedShipmentId,
  );

  const { data: statusData } = useApiQuery<{
    success: boolean;
    connectors: ErpConnectorStatus[];
  }>(["erp-status"], "/erp-integrations/status", {
    refetchInterval: 15000,
  });

  const connectors: ErpConnectorStatus[] = statusData?.connectors || [
    {
      system: "SAP_S4HANA",
      endpoint:
        "https://s4hana-api.corp.internal/sap/opu/odata4/sap/api_purchaseorder_process_srv/srvd_a2x/sap/purchaseorder/0001",
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
    {
      system: "MICROSOFT_DYNAMICS_365_BC",
      endpoint:
        "https://api.businesscentral.dynamics.com/v2.0/atlas-corp/Production/ODataV4/Company('Atlas_Logistics')/GeneralJournals",
      status: "ONLINE",
      circuitBreaker: "CLOSED",
      latencyMs: 135,
      lastSyncTimestamp: Date.now() - 60000,
      activeAuthMethod: "OAUTH2_BEARER",
      metrics: {
        totalSyncedToday: 64,
        failedSyncCount: 0,
        pendingQueueDepth: 0,
        averageLatencyMs: 140,
      },
    },
  ];

  const { data: ordersData, refetch: refetchOrders } = useApiQuery<{
    success: boolean;
    orders: ErpPurchaseOrder[];
  }>(
    ["erp-orders", selectedShipmentId],
    `/erp-integrations/orders?shipmentId=${selectedShipmentId}`,
    {
      enabled: !!selectedShipmentId,
    },
  );

  const orders: ErpPurchaseOrder[] = ordersData?.orders || [];

  const refreshQueue = useCallback(async () => {
    const items = await erpQueueManager.getAll();
    setQueueItems(items);
  }, []);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  // Mutations
  const syncOrderMutation = useApiMutation<
    {
      order?: ErpPurchaseOrder;
      syncLog?: Record<string, unknown>;
    },
    { poNumber: string }
  >("/erp-integrations/sync", "POST", {
    onSuccess: (res) => {
      refetchOrders();
      setActiveConsoleLog({
        title: "Orden de Compra Sincronizada con SQLite",
        system: res.order?.erpSystem || "ERP_GATEWAY",
        poNumber: res.order?.poNumber,
        status: "SYNCED",
        syncLog: res.syncLog,
      });
    },
  });

  const syncSapPoMutation = useApiMutation<
    {
      csrfToken?: string;
      data?: unknown;
    },
    { poNumber: string }
  >("/erp-integrations/sap/sync-po", "POST", {
    onSuccess: (res) => {
      refetchOrders();
      setActiveConsoleLog({
        title: "SAP S/4HANA PO Sincronizado Exitosamente",
        system: "SAP_S4HANA",
        protocol: "OData v4 REST (JSON)",
        csrfToken: res.csrfToken,
        data: res.data,
      });
    },
  });

  const postSapDeliveryMutation = useApiMutation<
    {
      deliveryDocument?: string;
      data?: unknown;
    },
    Record<string, unknown>
  >("/erp-integrations/sap/post-delivery", "POST", {
    onSuccess: (res) => {
      refetchOrders();
      setActiveConsoleLog({
        title: "Entrega Entrante (ASN) Generada en SAP",
        system: "SAP_S4HANA",
        protocol: "OData v4 (A_InboundDeliveryHeader)",
        deliveryDocument: res.deliveryDocument,
        data: res.data,
      });
    },
  });

  const postNetSuiteReceiptMutation = useApiMutation<
    {
      receiptId?: string;
      landedCost?: unknown;
    },
    Record<string, unknown>
  >("/erp-integrations/netsuite/post-receipt", "POST", {
    onSuccess: (res) => {
      refetchOrders();
      setActiveConsoleLog({
        title: "Item Receipt & Landed Cost Generado en NetSuite",
        system: "ORACLE_NETSUITE",
        protocol: "SuiteTalk REST Web Services",
        receiptId: res.receiptId,
        data: res.landedCost,
      });
    },
  });

  const postDynamicsBcJournalMutation = useApiMutation<
    {
      journalBatchName?: string;
      postedLinesCount?: number;
      totalAmountEur?: number;
    },
    { lines: Array<Record<string, unknown>> }
  >("/erp-integrations/dynamics-bc/journal", "POST", {
    onSuccess: (res) => {
      refetchOrders();
      setActiveConsoleLog({
        title: "Asiento General Publicado en MS Dynamics 365 Business Central",
        system: "MICROSOFT_DYNAMICS_365_BC",
        protocol: "OData v4 /GeneralJournals",
        batch: res.journalBatchName,
        linesCount: res.postedLinesCount,
        totalEur: res.totalAmountEur,
      });
    },
  });

  const batchQueueMutation = useApiMutation<
    {
      processedCount?: number;
      results?: unknown;
    },
    { mutations: Array<Record<string, unknown>> }
  >("/erp-integrations/queue/batch", "POST", {
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
  });

  // Handlers
  const handleEnqueueOffline = async (
    erpSystem: "SAP_S4HANA" | "ORACLE_NETSUITE" | "MICROSOFT_DYNAMICS_365_BC",
    operation: ErpQueuedMutation["operation"],
    payload: Record<string, unknown>,
  ) => {
    await erpQueueManager.enqueue({
      erpSystem,
      operation,
      payloadJson: JSON.stringify(payload),
      idempotencyKey: `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    });
    await refreshQueue();
  };

  const handleCopyJson = () => {
    if (!activeConsoleLog) return;
    navigator.clipboard.writeText(JSON.stringify(activeConsoleLog, null, 2));
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  const handleFlushDexieQueue = () => {
    if (queueItems.length === 0) return;
    const formatted = queueItems.map((q) => ({
      id: q.id,
      erpSystem: q.erpSystem,
      operation: q.operation,
      payloadJson: q.payloadJson,
    }));
    batchQueueMutation.mutate({ mutations: formatted });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8 space-y-6 font-sans">
      {/* 1. Header & Telemetry */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 text-indigo-400 border border-indigo-500/30">
            <Network className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex flex-wrap items-center gap-2">
              Corporate ERP Connectors
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                SAP S/4HANA
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                NetSuite
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Dynamics 365 BC
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Orquestación bidireccional de Órdenes de Compra (PO), Entregas
              Entrantes (ASN), Asientos Contables y Pasivos Ambientales
            </p>
          </div>
        </div>

        {/* Network Status Pill */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${
              isOffline
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            {isOffline ? (
              <WifiOff className="w-4 h-4 text-rose-400" />
            ) : (
              <Wifi className="w-4 h-4 text-emerald-400" />
            )}
            <span className="font-semibold">
              {isOffline ? "Modo Offline" : "Conectividad Online"}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Cola SCM Dexie:</span>
            <span className="font-mono text-cyan-300 font-bold">
              {queueItems.length} Registros
            </span>
          </div>
        </div>
      </div>

      {/* 2. Relational Shipment & ERP Orders Selector Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">
                Órdenes de Compra ERP Relacionales (SQLite)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {orders.length} Órdenes
              </span>
            </div>
            <span className="text-sm text-slate-200 font-medium">
              {activeShipment
                ? `${activeShipment.id} — ${activeShipment.origin || "CNSHA"} ➔ ${activeShipment.destination || "ESVLC"} (${orders.map((o) => `${o.erpSystem === "SAP_S4HANA" ? "SAP" : o.erpSystem === "MICROSOFT_DYNAMICS_365_BC" ? "BC" : "NetSuite"}: ${o.poNumber}`).join(" · ") || "Sin órdenes"})`
                : "Cargando embarques..."}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Embarque:</span>
            <select
              value={selectedShipmentId}
              onChange={(e) => setSelectedShipmentId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {shipments.map((s: Shipment) => (
                <option key={s.id} value={s.id}>
                  {s.id} ({s.origin} ➔ {s.destination})
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            onClick={() => {
              const po =
                selectedPoNumber || orders[0]?.poNumber || "4500891234";
              syncOrderMutation.mutate({ poNumber: po });
            }}
            disabled={syncOrderMutation.isPending}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
          >
            <Zap className="w-3.5 h-3.5" />
            {syncOrderMutation.isPending
              ? "Sincronizando..."
              : "Sincronizar Pedido con ERP"}
          </Button>
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
          Estudio de Mapeo de Esquemas
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
          Consola de Ejecución & Sincronización
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
          Cola Offline Dexie & Resiliencia
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "TOPOLOGY" && <Topology connectors={connectors} />}
      {activeTab === "MAPPING" && <Mapping />}
      {activeTab === "SANDBOX" && (
        <Sandbox
          orders={orders}
          selectedPoNumber={selectedPoNumber}
          setSelectedPoNumber={setSelectedPoNumber}
          selectedPresetKey={selectedPresetKey}
          setSelectedPresetKey={setSelectedPresetKey}
          activeConsoleLog={activeConsoleLog}
          copiedResponse={copiedResponse}
          onCopyJson={handleCopyJson}
          onSyncSapPo={() => {
            if (isOffline) {
              void handleEnqueueOffline("SAP_S4HANA", "SYNC_PO", {
                poNumber: selectedPoNumber,
              });
              return;
            }
            syncSapPoMutation.mutate({ poNumber: selectedPoNumber });
          }}
          onPostSapDelivery={() => {
            const payload = {
              poNumber: selectedPoNumber,
              billOfLading: "MSCUBCN992819",
              carrierName: "Mediterranean Shipping Company (MSC)",
              containerId: "MSKU9284712",
              items: [{ material: "MAT-AUTO-ENG-V6", quantity: 40 }],
            };
            if (isOffline) {
              void handleEnqueueOffline(
                "SAP_S4HANA",
                "POST_INBOUND_DELIVERY",
                payload,
              );
              return;
            }
            postSapDeliveryMutation.mutate(payload);
          }}
          onPostNetSuiteReceipt={() => {
            const payload = {
              orderNumber: selectedPoNumber,
              bolNumber: "MSCUBCN992819",
              totalFreight: 9800,
              method: "VALUE",
              items: [
                {
                  line: 1,
                  itemRefName: "Servidores Blade 2U GPU AI",
                  quantity: 15,
                  unitValue: 12000,
                  weightKg: 950,
                  volumeCbm: 5.2,
                },
              ],
            };
            if (isOffline) {
              void handleEnqueueOffline(
                "ORACLE_NETSUITE",
                "POST_ITEM_RECEIPT",
                payload,
              );
              return;
            }
            postNetSuiteReceiptMutation.mutate(payload);
          }}
          onPostDynamicsBcJournal={() => {
            const payload = {
              lines: [
                {
                  journalTemplateName: "GENERAL",
                  journalBatchName: "ATLAS_GL",
                  lineNumber: 10000,
                  accountType: "G/L Account",
                  accountNo: "600000",
                  postingDate: new Date().toISOString().split("T")[0],
                  documentType: "Invoice",
                  documentNo: selectedPoNumber,
                  description: "Transporte Intermodal Rotterdam - Zaragoza",
                  debitAmount: 8750.0,
                  creditAmount: 0,
                },
                {
                  journalTemplateName: "GENERAL",
                  journalBatchName: "ATLAS_GL",
                  lineNumber: 20000,
                  accountType: "Vendor",
                  accountNo: "400000",
                  postingDate: new Date().toISOString().split("T")[0],
                  documentType: "Invoice",
                  documentNo: selectedPoNumber,
                  description: "Provisión Flete y Operaciones",
                  debitAmount: 0,
                  creditAmount: 8750.0,
                },
              ],
            };
            if (isOffline) {
              void handleEnqueueOffline(
                "MICROSOFT_DYNAMICS_365_BC",
                "POST_GENERAL_JOURNAL",
                payload,
              );
              return;
            }
            postDynamicsBcJournalMutation.mutate(payload);
          }}
          isSapPoPending={syncSapPoMutation.isPending}
          isSapDeliveryPending={postSapDeliveryMutation.isPending}
          isNetSuitePending={postNetSuiteReceiptMutation.isPending}
          isDynamicsPending={postDynamicsBcJournalMutation.isPending}
        />
      )}
      {activeTab === "QUEUE" && (
        <Queue
          queueItems={queueItems}
          onEnqueueManual={() => {
            void handleEnqueueOffline(
              "MICROSOFT_DYNAMICS_365_BC",
              "POST_GENERAL_JOURNAL",
              {
                manual: true,
                timestamp: Date.now(),
              },
            );
          }}
          onFlushQueue={handleFlushDexieQueue}
          isFlushing={batchQueueMutation.isPending}
        />
      )}
    </div>
  );
}
