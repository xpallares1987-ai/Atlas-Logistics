"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3,
  DollarSign,
  ShieldAlert,
  UploadCloud,
  DatabaseZap,
  Trash2,
  Timer,
  Leaf,
} from "lucide-react";
import {
  LogisticsDashboardLayout,
  ESGCarbonTracker,
  InteractiveGlobe,
  OmniSearch,
  type NavItem,
  useFirebase,
  loadTheme,
  applyTheme,
  DemurrageAlerts,
  LclConsolidationEngine,
  AiCopilot,
  DataAnalystChat,
  HumanTasklist,
} from "@atlas/ui";

import { FileUploader } from "../components/FileUploader";
import { ColumnMapper } from "../components/ColumnMapper";
import { KpiPanel } from "../components/KpiPanel";
import { FinancialPanel } from "../components/FinancialPanel";
import { ExceptionPanel } from "../components/ExceptionPanel";
import { TemplateDownloader } from "../components/TemplateDownloader";

import { parseFile } from "../services/csv-parser";
import { buildMappingState, applyMapping } from "../services/column-mapper";
import { useDashboardStore, computeKpis } from "../services/data-store";
import { autoDetectReportType } from "../services/csv-parser";
import type {
  MappingState,
  ColumnMapping,
  UploadedFile,
} from "../types/dashboard";
import { Package, Zap } from "lucide-react";
import type { LclCargoItem, MasterContainer } from "@atlas/ui";
import { INITIAL_POOL } from "@atlas/ui";

import { useListShipments } from "../dataconnect-generated/react";

type TabType =
  | "Upload"
  | "KPIs"
  | "Financial"
  | "Exceptions"
  | "Demurrage"
  | "ESG"
  | "Consolidation"
  | "Copilot"
  | "Tasklist";

// Defined outside the component — icons are stable React elements with no runtime deps.
type Role = "ADMIN" | "BROKER" | "SHIPPER";

const NAV_ITEMS: (NavItem & { roles: Role[] })[] = [
  { id: "Upload", label: "Data Import", icon: <UploadCloud size={18} />, roles: ["ADMIN", "BROKER"] },
  { id: "KPIs", label: "Operational KPIs", icon: <BarChart3 size={18} />, roles: ["ADMIN", "SHIPPER"] },
  { id: "Financial", label: "Financial", icon: <DollarSign size={18} />, roles: ["ADMIN"] },
  { id: "Exceptions", label: "Exceptions", icon: <ShieldAlert size={18} />, roles: ["ADMIN", "BROKER"] },
  { id: "Demurrage", label: "D&D Alerts", icon: <Timer size={18} />, roles: ["ADMIN", "BROKER"] },
  { id: "Consolidation", label: "LCL Planner", icon: <Package size={18} />, roles: ["ADMIN", "BROKER"] },
  { id: "Copilot", label: "AI Copilot", icon: <Zap size={18} />, roles: ["ADMIN", "SHIPPER", "BROKER"] },
  { id: "Tasklist", label: "Tasklist", icon: <CheckCircle2 size={18} />, roles: ["ADMIN", "BROKER"] },
  { id: "ESG", label: "ESG Tracker", icon: <Leaf size={18} />, roles: ["ADMIN", "SHIPPER"] },
];

function LclConsolidationEngineWrapper() {
  const [cargoPool] = useState<LclCargoItem[]>(INITIAL_POOL);
  const [masterContainers, setMasterContainers] = useState<MasterContainer[]>([
    {
      id: "mc-1",
      specId: "40ft",
      route: "Shanghai -> Rotterdam",
      assignedCargoIds: [],
    },
  ]);
  const [activeContainerId, setActiveContainerId] = useState("mc-1");
  const [selectedPoolIds, setSelectedPoolIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleSelection = (id: string) => {
    setSelectedPoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const assignSelected = () => {
    if (!activeContainerId || selectedPoolIds.size === 0) return;
    setMasterContainers((prev) =>
      prev.map((c) => {
        if (c.id === activeContainerId) {
          return {
            ...c,
            assignedCargoIds: [
              ...c.assignedCargoIds,
              ...Array.from(selectedPoolIds),
            ],
          };
        }
        return c;
      }),
    );
    setSelectedPoolIds(new Set());
  };

  const autoOptimize = (cargoIds: string[]) => {
    if (!activeContainerId || cargoIds.length === 0) return;
    setMasterContainers((prev) =>
      prev.map((c) => {
        if (c.id === activeContainerId) {
          return {
            ...c,
            assignedCargoIds: [
              ...c.assignedCargoIds,
              ...cargoIds,
            ],
          };
        }
        return c;
      }),
    );
  };

  const removeAssigned = (cargoId: string) => {
    setMasterContainers((prev) =>
      prev.map((c) => ({
        ...c,
        assignedCargoIds: c.assignedCargoIds.filter((id) => id !== cargoId),
      })),
    );
  };

  const createNewContainer = () => {
    const newId = `mc-${masterContainers.length + 1}`;
    setMasterContainers((prev) => [
      ...prev,
      {
        id: newId,
        specId: "20ft",
        route: "New Route",
        assignedCargoIds: [],
      },
    ]);
    setActiveContainerId(newId);
  };

  return (
    <LclConsolidationEngine
      cargoPool={cargoPool}
      masterContainers={masterContainers}
      activeContainerId={activeContainerId}
      selectedPoolIds={selectedPoolIds}
      toggleSelection={toggleSelection}
      assignSelected={assignSelected}
      removeAssigned={removeAssigned}
      createNewContainer={createNewContainer}
      setActiveContainerId={setActiveContainerId}
      autoOptimize={autoOptimize}
    />
  );
}

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState<TabType>("KPIs");
  const [activeRole, setActiveRole] = useState<Role>("ADMIN");
  
  const allowedNavItems = useMemo(() => NAV_ITEMS.filter(item => item.roles.includes(activeRole)), [activeRole]);

  const store = useDashboardStore();
  const { dataConnect, auth } = useFirebase();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        setIsAuthenticated(!!user);
      });
      return unsubscribe;
    }
  }, [auth]);

  // Load real data from Data Connect only when authenticated to prevent 401 Unauthorized errors
  // TypeScript hack needed because generated SDK uses its own DataConnect type vs ui exported type
  const { data: remoteData, isLoading: isLoadingShipments } = useListShipments(
    dataConnect as any,
    {
      enabled: isAuthenticated,
    },
  );

  const finalOperational = useMemo(() => {
    if (remoteData?.shipments && remoteData.shipments.length > 0) {
      // Map remote PostgreSQL schema to the Dashboard's operational metrics structure
      const mapped = remoteData.shipments.map((s: any, idx: number) => ({
        shipment_ref: s.trackingNumber,
        status: s.status,
        pol: s.origin,
        pod: s.destination,
        trade_lane: `${s.origin}-${s.destination}`,
        eta: new Date(Date.now() + 86400000 * (idx + 1)).toISOString(),
        ata: new Date().toISOString(),
        weight_kg: 5000 + Math.random() * 15000,
      }));
      // Merge real data with any local uploaded data (real data takes precedence if same ID)
      const newRefs = new Set(mapped.map((r: any) => r.shipment_ref));
      return [
        ...mapped,
        ...store.operational.filter((r: any) => !newRefs.has(r.shipment_ref)),
      ];
    }
    return store.operational;
  }, [remoteData, store.operational]);

  const kpis = useMemo(
    () =>
      computeKpis(finalOperational as any, store.financial, store.exceptions),
    [finalOperational, store.financial, store.exceptions],
  );

  // Import state
  const [mappingState, setMappingState] = useState<MappingState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    id: string;
  } | null>(null);

  useEffect(() => {
    // Retain mock functionality since schema was purged
  }, [dataConnect]);

  useEffect(() => {
    // Initialize theme using the already-loaded @atlas/ui exports
    applyTheme(loadTheme());

    // Auto-import polling
    // const pollAutoImport = async () => {
    //   // API currently unassigned after monorepo migration
    //   // try {
    //   //   const res = await fetch('/api/inbound');
    //   //   const json = await res.json();
    //   // } catch (e) {}
    // };

    // Poll every 30 seconds
    // const intervalId = setInterval(pollAutoImport, 30000);
    // pollAutoImport(); // initial call

    return () => {
      // clearInterval(intervalId);
    };
  }, []);

  const handleFilesReady = async (files: File[]) => {
    if (files.length === 0) return;
    setIsProcessing(true);

    try {
      const file = files[0]; // Process one by one for mapping step
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (['png', 'jpg', 'jpeg', 'pdf'].includes(ext || '')) {
        // AI OCR Route
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
        const base64Image = await base64Promise;
        
        const { getApp } = await import("firebase/app");
        const { getFunctions, httpsCallable } = await import("firebase/functions");
        const app = getApp();
        const functions = getFunctions(app);
        const documentOCR = httpsCallable(functions, "documentOCR");
        
        const result = await documentOCR({ base64Image, mimeType: file.type || "image/jpeg" });
        const data = result.data as any;
        
        if (data.success && data.data) {
          // Push directly into the store
          store.addOperationalData([{
            shipment_ref: data.data.referenceNumber || `REF-${Date.now()}`,
            status: "IN_TRANSIT",
            pol: data.data.originPort || "UNKNOWN",
            pod: data.data.destinationPort || "UNKNOWN",
            trade_lane: `${data.data.originPort}-${data.data.destinationPort}`,
            eta: new Date(Date.now() + 86400000 * 10).toISOString(),
            ata: new Date().toISOString(),
            weight_kg: data.data.totalWeightKg || 0,
          }], file.name, "operational");
          alert(`Documento OCR Procesado: ${data.data.documentType}`);
        } else {
          throw new Error("OCR Failed");
        }
      } else {
        // Standard CSV/Excel Route
        const parsed = await parseFile(file);
        const detectedType = autoDetectReportType(parsed.columns) || "operational";

        setPendingFile({ file, id: `file-${Date.now()}` });
        setMappingState(
          buildMappingState(file.name, parsed.columns, parsed.rows, detectedType),
        );
      }
    } catch (err) {
      console.error("Failed to parse file:", err);
      alert("Error parsing file. Check console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMappingChange = useCallback((mappings: ColumnMapping[]) => {
    setMappingState((prev) => (prev ? { ...prev, mappings } : null));
  }, []);

  const handleMappingConfirm = () => {
    if (!mappingState || !pendingFile) return;

    const { reportType, mappings, rawData, fileName } = mappingState;
    const typedRows = applyMapping(rawData, mappings, reportType);

    const uploadedFile: UploadedFile = {
      id: pendingFile.id,
      name: fileName,
      type: reportType,
      uploadedAt: new Date().toISOString(),
      rowCount: typedRows.length,
    };

    if (reportType === "operational")
      store.addOperational(typedRows as never, uploadedFile);
    else if (reportType === "financial")
      store.addFinancial(typedRows as never, uploadedFile);
    else store.addExceptions(typedRows as never, uploadedFile);

    setMappingState(null);
    setPendingFile(null);

    // Switch to corresponding tab
    if (reportType === "operational") setActiveTab("KPIs");
    else if (reportType === "financial") setActiveTab("Financial");
    else setActiveTab("Exceptions");
  };

  const handleMappingCancel = () => {
    setMappingState(null);
    setPendingFile(null);
  };

  return (
    <LogisticsDashboardLayout
      title="Shipment Intelligence"
      subtitle={`Analytics & Exception Dashboard - ${activeRole} View`}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as TabType)}
      navItems={allowedNavItems}
      searchTerm=""
      onSearchChange={() => {}}
      isSyncing={false}
    >
      <div
        style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 50 }}
        className="flex items-center gap-4"
      >
        <select 
          value={activeRole} 
          onChange={(e) => {
            setActiveRole(e.target.value as Role);
            setActiveTab("KPIs");
          }}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="ADMIN">Admin / Forwarder</option>
          <option value="SHIPPER">Shipper / BCO</option>
          <option value="BROKER">Customs Broker</option>
        </select>
        {isLoadingShipments ? (
          <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-300">
            <span className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span>Loading DataConnect...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-300">
            <DatabaseZap size={14} className="text-emerald-400" />
            <span>
              {remoteData?.shipments?.length || 0} remote |{" "}
              {store.uploadedFiles.length} local
            </span>
          </div>
        )}
      </div>

      {activeTab === "Upload" && (
        <div className="max-w-4xl mx-auto py-8">
          {mappingState ? (
            <ColumnMapper
              state={mappingState}
              onChange={handleMappingChange}
              onConfirm={handleMappingConfirm}
              onCancel={handleMappingCancel}
            />
          ) : (
            <>
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Import Report Data
                </h2>
                <p className="text-slate-400">
                  Upload Operational, Financial, or Exception reports to update
                  the dashboard.
                </p>
              </div>

              <FileUploader
                onFilesReady={handleFilesReady}
                isProcessing={isProcessing}
              />

              {store.uploadedFiles.length > 0 && (
                <div className="mt-8 border border-slate-800 rounded-xl bg-slate-900/50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
                    <h3 className="font-semibold text-sm text-slate-200">
                      Loaded Files
                    </h3>
                    <button
                      onClick={store.clearAll}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Clear all data
                    </button>
                  </div>
                  <ul className="divide-y divide-slate-800">
                    {store.uploadedFiles.map((f) => (
                      <li
                        key={f.id}
                        className="px-4 py-3 flex justify-between items-center hover:bg-slate-800/30"
                      >
                        <div>
                          <div className="font-medium text-sm text-slate-300">
                            {f.name}
                          </div>
                          <div className="text-xs text-slate-500 flex gap-3 mt-1">
                            <span
                              className={`capitalize badge badge--${f.type} px-1.5 py-0.5 text-[10px]`}
                            >
                              {f.type}
                            </span>
                            <span>{f.rowCount} rows</span>
                            <span>
                              {new Date(f.uploadedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => store.removeFile(f.id, f.type)}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-md hover:bg-slate-800 transition-colors"
                          title="Remove file data"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <TemplateDownloader />
            </>
          )}
        </div>
      )}

      {activeTab === "KPIs" && (
        <div className="flex flex-col gap-6">
          <div className="mb-2 h-[500px] shadow-2xl rounded-3xl overflow-hidden border border-slate-700/50">
            <InteractiveGlobe shipments={finalOperational as any} />
          </div>
          <KpiPanel
            metrics={kpis}
            isEmpty={finalOperational.length === 0}
            liveKpis={null}
          />
        </div>
      )}

      {activeTab === "Financial" && <FinancialPanel data={store.financial} />}

      {activeTab === "Exceptions" && <ExceptionPanel data={store.exceptions} />}

      {activeTab === "Demurrage" && <DemurrageAlerts />}

      {activeTab === "Consolidation" && <LclConsolidationEngineWrapper />}

      {activeTab === "Copilot" && (
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1">
            <AiCopilot />
          </div>
          <div className="flex-1 flex justify-center items-start">
            <DataAnalystChat />
          </div>
        </div>
      )}

      {activeTab === "Tasklist" && <HumanTasklist />}

      {activeTab === "ESG" && <ESGCarbonTracker />}
      
      <OmniSearch />
    </LogisticsDashboardLayout>
  );
}
