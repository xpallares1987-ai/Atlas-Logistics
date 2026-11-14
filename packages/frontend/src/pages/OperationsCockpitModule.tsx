/**
 * @file OperationsCockpitModule.tsx
 * @description Orchestrator for the Operations Cockpit 2.0 Work-to-User triage queue.
 * @module @atlas/frontend/pages/OperationsCockpitModule
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

// ============================================================================
// 1. IMPORTS & HOOKS
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, RefreshCw, Building2 } from "lucide-react";
import { authFetch } from "../lib/api";
import { useOrganizationStore } from "../store/useOrganizationStore";
import type {
  CockpitSummaryMetrics,
  CockpitWorkItem,
  EmittedDocumentModalData,
  ExecutionResult,
  StatusFilter,
  TransportMode,
} from "../types/cockpit.types";
import {
  Action,
  Confirmation,
  EmittedDocument,
  FilterBar,
  Header,
  ItemCard,
  SummaryKpi,
  getModeFamily,
} from "../components/Cockpit";

export type {
  ScoreFactor,
  CockpitWorkItem,
  CockpitSummaryMetrics,
  EmittedDocumentModalData,
} from "../types/cockpit.types";

// ============================================================================
// 2. MAIN ORCHESTRATOR COMPONENT
// ============================================================================

export default function OperationsCockpitModule() {
  const navigate = useNavigate();
  const { activeStationId, getActiveStation } = useOrganizationStore();
  const activeStation = getActiveStation();

  const [items, setItems] = useState<CockpitWorkItem[]>([]);
  const [summary, setSummary] = useState<CockpitSummaryMetrics>({
    totalTasks: 0,
    openActionableCount: 0,
    blockedCount: 0,
    completedCount: 0,
    criticalUrgencyCount: 0,
    dueTodayCount: 0,
    activeWorkflowsCount: 0,
    completedWorkflowsCount: 0,
    activeExceptionsCount: 0,
  });

  const [selectedBucket, setSelectedBucket] = useState<string>("ALL");
  const [modeFilter, setModeFilter] = useState<TransportMode>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("OPEN");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<CockpitWorkItem | null>(
    null,
  );
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastExecutionResult, setLastExecutionResult] =
    useState<ExecutionResult | null>(null);
  const [emittedDocModal, setEmittedDocModal] =
    useState<EmittedDocumentModalData | null>(null);

  // ============================================================================
  // 3. DATA FETCHING & SYNCHRONIZATION
  // ============================================================================

  const fetchCockpitData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      if (selectedBucket !== "ALL") {
        params.set("urgencyBucket", selectedBucket);
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }
      if (activeStationId && activeStationId !== "ALL") {
        params.set("branchId", activeStationId);
      }

      const [cockpitRes, summaryRes] = await Promise.all([
        authFetch(`/api/scm/v1/operational/cockpit?${params.toString()}`),
        authFetch("/api/scm/v1/operational/cockpit/summary"),
      ]);

      if (cockpitRes.ok) {
        const data = await cockpitRes.json();
        const fetchedItems: CockpitWorkItem[] = data.items || [];
        setItems(fetchedItems);

        // Keep current item selected if still present, or pick first item
        if (fetchedItems.length > 0) {
          const found = fetchedItems.find(
            (i) => i.workItemId === selectedItem?.workItemId,
          );
          const nextSelected = found || fetchedItems[0];
          setSelectedItem(nextSelected);

          // Reset form inputs for next selected item
          const initialForm: Record<string, any> = {};
          if (nextSelected.primaryAction?.inputFields) {
            for (const f of nextSelected.primaryAction.inputFields) {
              initialForm[f.name] = "";
            }
          }
          if (nextSelected.itemType === "EXCEPTION") {
            initialForm.resolutionNotes = "";
            initialForm.resolutionStatus = "RESOLVED";
          }
          setFormData(initialForm);
        } else {
          setSelectedItem(null);
        }
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }
    } catch (err) {
      console.error("Failed to load Operations Cockpit data:", err);
    } finally {
      setLoading(false);
    }
  }, [
    selectedBucket,
    statusFilter,
    search,
    activeStationId,
    selectedItem?.workItemId,
  ]);

  useEffect(() => {
    fetchCockpitData();
  }, [selectedBucket, statusFilter, activeStationId]);

  // ============================================================================
  // 4. ACTION HANDLERS
  // ============================================================================

  const handleSelectItem = (item: CockpitWorkItem) => {
    setSelectedItem(item);
    setLastExecutionResult(null);

    const initialForm: Record<string, any> = {};
    if (item.primaryAction?.inputFields) {
      for (const f of item.primaryAction.inputFields) {
        initialForm[f.name] = "";
      }
    }
    if (item.itemType === "EXCEPTION") {
      initialForm.resolutionNotes = "";
      initialForm.resolutionStatus = "RESOLVED";
    }
    setFormData(initialForm);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleExecuteInSitu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const previousItems = [...items];
    const executedId = selectedItem.workItemId;

    // Optimistic UI: Immediately mark completed or remove from open view
    setItems((prev) =>
      statusFilter === "OPEN"
        ? prev.filter((i) => i.workItemId !== executedId)
        : prev.map((i) =>
            i.workItemId === executedId
              ? { ...i, status: "COMPLETED", isBlocked: false }
              : i,
          ),
    );

    try {
      setSubmitting(true);
      const res = await authFetch(
        `/api/scm/v1/operational/cockpit/${executedId}/execute`,
        {
          method: "POST",
          body: JSON.stringify({
            result: formData,
            notes:
              formData.resolutionNotes ||
              formData.notes ||
              "Executed via Operations Cockpit",
            resolutionNotes: formData.resolutionNotes,
            resolutionStatus: formData.resolutionStatus || "RESOLVED",
            ...formData,
          }),
        },
      );

      if (res.ok) {
        const result: ExecutionResult = await res.json();
        setLastExecutionResult(result);
        if (result.emittedDocument) {
          setEmittedDocModal(result.emittedDocument);
        }
        await fetchCockpitData();
      } else {
        // Rollback optimistic update on error
        setItems(previousItems);
        const errJson = await res.json().catch(() => ({}));
        alert(
          `Error executing work item: ${errJson.message || res.statusText}`,
        );
      }
    } catch (err) {
      setItems(previousItems);
      console.error("Failed to execute in-situ action:", err);
      alert("Network error executing work item in-situ.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleModeFilterChange = (newMode: TransportMode) => {
    setModeFilter(newMode);
    if (
      newMode !== "ALL" &&
      selectedItem &&
      getModeFamily(selectedItem.serviceType) !== newMode
    ) {
      const nextItem = items.find(
        (i) => getModeFamily(i.serviceType) === newMode,
      );
      if (nextItem) {
        handleSelectItem(nextItem);
      } else {
        setSelectedItem(null);
      }
    }
  };

  const handleNavigateResolveIn360 = (item: CockpitWorkItem) => {
    const targetTab = item.itemType === "EXCEPTION" ? "exceptions" : "tasks";
    const targetId =
      item.itemType === "EXCEPTION"
        ? item.workItemId
        : item.taskId || item.workItemId;
    navigate(
      `/shipment-360?id=${item.shipmentId}&tab=${targetTab}&highlight=${targetId}&action=resolve`,
    );
  };

  // ============================================================================
  // 5. COMPUTED VALUES & FILTERING
  // ============================================================================

  const countAll = items.length;
  const countOcean = items.filter(
    (i) => getModeFamily(i.serviceType) === "OCEAN",
  ).length;
  const countAir = items.filter(
    (i) => getModeFamily(i.serviceType) === "AIR",
  ).length;
  const countRoad = items.filter(
    (i) => getModeFamily(i.serviceType) === "ROAD",
  ).length;

  const displayedItems =
    modeFilter === "ALL"
      ? items
      : items.filter((i) => getModeFamily(i.serviceType) === modeFilter);

  // ============================================================================
  // 6. RENDER
  // ============================================================================

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-slate-950 text-slate-100">
      {/* 1. Header & KPI Bar */}
      <Header
        loading={loading}
        onRefresh={() => fetchCockpitData()}
        onNavigateExceptions={() => navigate("/exceptions")}
        onNavigateShipment360={() => navigate("/shipment-360")}
      />

      {/* Station Context Banner */}
      {activeStation && (
        <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Operating Station Scope:{" "}
              <strong className="text-white font-semibold">
                {activeStation.stationCode}
              </strong>{" "}
              &bull; {activeStation.name} ({activeStation.unLocode})
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>Currency: {activeStation.primaryCurrency}</span>
            <span>Timezone: {activeStation.timezone}</span>
            {activeStation.fmcOtiNumber && (
              <span>FMC OTI: {activeStation.fmcOtiNumber}</span>
            )}
          </div>
        </div>
      )}

      {/* KPI Summary Strip */}
      <SummaryKpi summary={summary} />

      {/* 2. Filters & Search Strip */}
      <FilterBar
        modeFilter={modeFilter}
        onModeFilterChange={handleModeFilterChange}
        countAll={countAll}
        countOcean={countOcean}
        countAir={countAir}
        countRoad={countRoad}
        selectedBucket={selectedBucket}
        onSelectBucket={setSelectedBucket}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Confirmation Notification (CONFIRM Step) & Next Action Dispatch */}
      {lastExecutionResult && (
        <Confirmation
          result={lastExecutionResult}
          onNavigateShipmentTasks={(shipmentId) =>
            navigate(`/shipment-360?id=${shipmentId}&tab=tasks`)
          }
          onSelectNextItem={(nextItem) => handleSelectItem(nextItem)}
        />
      )}

      {/* 3. Main Workspace: Split View (Cards on Left, Detail & Actions on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Work Item Cards */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {loading && displayedItems.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm bg-slate-900/30 rounded-xl border border-slate-800">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
              Loading prioritized operational items...
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm bg-slate-900/30 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              {modeFilter === "ALL"
                ? "No work items in this category. Queue is clear!"
                : `No work items for ${modeFilter.toLowerCase()} transport in this category.`}
            </div>
          ) : (
            displayedItems.map((item) => (
              <ItemCard
                key={item.workItemId}
                item={item}
                isSelected={selectedItem?.workItemId === item.workItemId}
                onSelect={handleSelectItem}
                onNavigateResolveIn360={handleNavigateResolveIn360}
              />
            ))
          )}
        </div>

        {/* Right Column: Explain → Decide → Act Detail Panel */}
        <div className="lg:col-span-7">
          {selectedItem ? (
            <Action
              item={selectedItem}
              formData={formData}
              submitting={submitting}
              onInputChange={handleInputChange}
              onExecute={handleExecuteInSitu}
              onInvestigateIn360={handleNavigateResolveIn360}
            />
          ) : (
            <div className="p-12 text-center text-slate-500 text-sm bg-slate-900/30 rounded-2xl border border-slate-800">
              Select an item from the queue to inspect and act upon.
            </div>
          )}
        </div>
      </div>

      {/* Emitted Document Modal */}
      {emittedDocModal && (
        <EmittedDocument
          document={emittedDocModal}
          onClose={() => setEmittedDocModal(null)}
          onNavigateToVault={() => navigate("/documents")}
        />
      )}
    </div>
  );
}
