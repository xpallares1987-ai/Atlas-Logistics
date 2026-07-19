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
  ShippingMap,
  type NavItem,
  useFirebase,
  loadTheme,
  applyTheme,
} from "@atlas/ui";

import { FileUploader } from "../components/FileUploader";
import { ColumnMapper } from "../components/ColumnMapper";
import { KpiPanel } from "../components/KpiPanel";
import { FinancialPanel } from "../components/FinancialPanel";
import { ExceptionPanel } from "../components/ExceptionPanel";
import { TemplateDownloader } from "../components/TemplateDownloader";
import { DndTracker } from "../components/DndTracker";

import { parseFile } from "../services/csv-parser";
import { buildMappingState, applyMapping } from "../services/column-mapper";
import { useDashboardStore, computeKpis } from "../services/data-store";
import { autoDetectReportType } from "../services/csv-parser";
import type {
  MappingState,
  ColumnMapping,
  UploadedFile,
} from "../types/dashboard";

type TabType =
  "Upload" | "KPIs" | "Financial" | "Exceptions" | "Demurrage" | "ESG";

// Defined outside the component — icons are stable React elements with no runtime deps.
const NAV_ITEMS: NavItem[] = [
  { id: "Upload", label: "Data Import", icon: <UploadCloud size={18} /> },
  { id: "KPIs", label: "Operational KPIs", icon: <BarChart3 size={18} /> },
  { id: "Financial", label: "Financial", icon: <DollarSign size={18} /> },
  { id: "Exceptions", label: "Exceptions", icon: <ShieldAlert size={18} /> },
  { id: "Demurrage", label: "D&D Alerts", icon: <Timer size={18} /> },
  { id: "ESG", label: "ESG Tracker", icon: <Leaf size={18} /> },
];

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState<TabType>("Upload");

  // Store state
  const store = useDashboardStore();
  const kpis = useMemo(
    () => computeKpis(store.operational, store.financial, store.exceptions),
    [store.operational, store.financial, store.exceptions],
  );

  // Import state
  const [mappingState, setMappingState] = useState<MappingState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    id: string;
  } | null>(null);

  const { dataConnect } = useFirebase();

  useEffect(() => {
    // Retain mock functionality since schema was purged
  }, [dataConnect]);

  useEffect(() => {
    // Initialize theme using the already-loaded @atlas/ui exports
    applyTheme(loadTheme());

    // Auto-import polling
    const pollAutoImport = async () => {
      try {
        const res = await fetch("/api/inbound");
        if (res.ok) {
          const data = await res.json();
          if (data.files && data.files.length > 0) {
            // Process auto-imported files
            for (const fileUrl of data.files) {
              const fileName = fileUrl.split("/").pop();
              if (!fileName) continue;

              // Skip if already processed in this session
              if (store.uploadedFiles.some((f) => f.name === fileName))
                continue;

              try {
                const fileRes = await fetch(fileUrl);
                if (!fileRes.ok) continue;

                const blob = await fileRes.blob();
                const file = new File([blob], fileName, {
                  type: fileRes.headers.get("content-type") || "text/csv",
                });

                // Directly auto-detect and import (skip mapping for auto-import)
                const parsed = await parseFile(file);
                const detectedType =
                  autoDetectReportType(parsed.columns) || "operational";

                const uploadedFile: UploadedFile = {
                  id: `auto-${Date.now()}-${fileName}`,
                  name: fileName,
                  type: detectedType,
                  uploadedAt: new Date().toISOString(),
                  rowCount: parsed.rowCount,
                };

                // Assume 1-to-1 mapping for auto-imports if they use templates
                if (detectedType === "operational")
                  store.addOperational(parsed.rows as never, uploadedFile);
                else if (detectedType === "financial")
                  store.addFinancial(parsed.rows as never, uploadedFile);
                else store.addExceptions(parsed.rows as never, uploadedFile);
              } catch (err) {
                console.error(`Error auto-importing ${fileName}:`, err);
              }
            }
          }
        }
      } catch (err) {
        console.error("Auto-import polling failed", err);
      }
    };

    // Poll every 30 seconds
    const intervalId = setInterval(pollAutoImport, 30000);
    pollAutoImport(); // initial call

    return () => clearInterval(intervalId);
  }, []);

  const handleFilesReady = async (files: File[]) => {
    if (files.length === 0) return;
    setIsProcessing(true);

    try {
      const file = files[0]; // Process one by one for mapping step
      const parsed = await parseFile(file);
      const detectedType =
        autoDetectReportType(parsed.columns) || "operational";

      setPendingFile({ file, id: `file-${Date.now()}` });
      setMappingState(
        buildMappingState(file.name, parsed.columns, parsed.rows, detectedType),
      );
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
      subtitle="Analytics & Exception Dashboard"
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as TabType)}
      navItems={NAV_ITEMS}
      searchTerm=""
      onSearchChange={() => {}}
      isSyncing={false}
    >
      <div
        style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 50 }}
        className="flex items-center gap-4"
      >
        {store.lastImported && (
          <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-300">
            <DatabaseZap size={14} className="text-emerald-400" />
            <span>{store.uploadedFiles.length} files loaded</span>
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
          <div className="mb-2 shadow-2xl rounded-3xl overflow-hidden border border-slate-700/50">
            <ShippingMap shipments={[]} />
          </div>
          <KpiPanel
            metrics={kpis}
            isEmpty={store.operational.length === 0}
            liveKpis={null}
          />
        </div>
      )}

      {activeTab === "Financial" && <FinancialPanel data={store.financial} />}

      {activeTab === "Exceptions" && <ExceptionPanel data={store.exceptions} />}

      {activeTab === "Demurrage" && <DndTracker />}

      {activeTab === "ESG" && <ESGCarbonTracker />}
    </LogisticsDashboardLayout>
  );
}
