/**
 * @file useContainerPlanner.ts
 * @description Custom domain hook managing 3D container stowage optimization, SQLite persistence,
 * IMO/CSS Code stability certification, and Gemini CTU/IMDG safety audits.
 * @module @atlas/frontend/components/ContainerPlanner/hooks
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  EQUIPMENT_CATALOG,
  ContainerTypeKey,
  CargoItemInput,
  optimizeStowage3D,
  StowageOptimizationResult,
} from "@atlas/shared";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { authFetch } from "../../../lib/api";
import {
  PlannerTabId,
  TransformMode,
  StowagePlanSummary,
  CertificationFeedback,
  GeminiStowageAuditResponse,
  CANONICAL_FALLBACK_ITEMS,
  CARGO_ITEM_PALETTE,
} from "../../../types/container-planner.types";

// ============================================================================
// 1. PURE HELPER FUNCTIONS (EXPORTED FOR UNIT TESTING)
// ============================================================================

/**
 * Maps raw SQLite stowage plan cargo items into normalized `CargoItemInput` records.
 */
export function mapDbStowageItems(rawItems: any[]): CargoItemInput[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return CANONICAL_FALLBACK_ITEMS;
  }
  return rawItems.map((it: any) => ({
    id: String(it.id),
    name: String(it.label || it.name || "Cargo Item"),
    widthM: Number(it.width || it.widthM || 1.2),
    heightM: Number(it.height || it.heightM || 1.4),
    lengthM: Number(it.depth || it.lengthM || 1.2),
    weightKg: Number(it.weight || it.weightKg || 1000),
    stackable: it.stackable ?? true,
    color: it.color || "#3b82f6",
    hazardClass: it.hazardClass,
  }));
}

/**
 * Extracts conflicting item IDs from an IMO/IMDG segregation result.
 */
export function extractConflictingItemIds(
  optResult: StowageOptimizationResult,
): Set<string> {
  const ids = new Set<string>();
  if (optResult.imoSegregation?.hasIncompatibleHazard) {
    for (const check of optResult.imoSegregation.checks) {
      if (!check.isCompliant) {
        ids.add(check.itemAId);
        ids.add(check.itemBId);
      }
    }
  }
  return ids;
}

// ============================================================================
// 2. MAIN DOMAIN HOOK
// ============================================================================

export function useContainerPlanner() {
  // Active Entity & Equipment Selection
  const [selectedShipmentId, setSelectedShipmentId] =
    useState<string>("sh_demo_01");
  const [selectedContainerId, setSelectedContainerId] =
    useState<string>("cnt_msku_9284712");
  const [selectedContainerKey, setSelectedContainerKey] =
    useState<ContainerTypeKey>("40ft_hc");

  const activeContainer = useMemo(
    () => EQUIPMENT_CATALOG[selectedContainerKey],
    [selectedContainerKey],
  );

  // Live SQLite Queries
  const { data: shipments = [] } = useApiQuery<any[]>(
    ["/api/shipments"],
    "/shipments",
  );

  const { data: availablePlans = [] } = useApiQuery<StowagePlanSummary[]>(
    ["stowage-plans-list"],
    "/stowage/plans",
  );

  const {
    data: stowagePlan,
    refetch: refetchStowagePlan,
    isLoading: isLoadingPlan,
  } = useApiQuery<any>(
    ["stowage-plan", selectedContainerId],
    `/stowage/plan?containerId=${selectedContainerId}`,
  );

  // Certification & Gemini Audit States
  const [isCertifying, setIsCertifying] = useState(false);
  const [certificationFeedback, setCertificationFeedback] =
    useState<CertificationFeedback | null>(null);
  const [isAuditingGemini, setIsAuditingGemini] = useState(false);
  const [geminiStowageAudit, setGeminiStowageAudit] =
    useState<GeminiStowageAuditResponse | null>(null);

  // Active Cargo Manifest & 3D Optimization State
  const [cargoList, setCargoList] = useState<CargoItemInput[]>(
    CANONICAL_FALLBACK_ITEMS,
  );
  const [optResult, setOptResult] = useState<StowageOptimizationResult>(() =>
    optimizeStowage3D(EQUIPMENT_CATALOG["40ft_hc"], CANONICAL_FALLBACK_ITEMS),
  );

  // 3D Viewport & Workbench Controls
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] =
    useState<TransformMode>("translate");
  const [showCogMarker, setShowCogMarker] = useState(true);
  const [showWalls, setShowWalls] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeTab, setActiveTab] = useState<PlannerTabId>("AXLE");

  // Quick-Add Cargo Form State
  const [newItemName, setNewItemName] = useState("");
  const [newItemWidth, setNewItemWidth] = useState(1.2);
  const [newItemLength, setNewItemLength] = useState(1.0);
  const [newItemHeight, setNewItemHeight] = useState(1.2);
  const [newItemWeight, setNewItemWeight] = useState(800);
  const [newItemStackable, setNewItemStackable] = useState(true);
  const [newItemHazard, setNewItemHazard] = useState("");

  // Synchronize manifest with live SQLite stowage plan when loaded
  useEffect(() => {
    if (
      stowagePlan?.items &&
      Array.isArray(stowagePlan.items) &&
      stowagePlan.items.length > 0
    ) {
      const dbMappedItems = mapDbStowageItems(stowagePlan.items);
      setCargoList(dbMappedItems);
      setOptResult(
        optimizeStowage3D(activeContainer, dbMappedItems, {
          centerPayload: true,
        }),
      );
    }
  }, [stowagePlan, activeContainer]);

  // Handlers
  const handleRunOptimizer = useCallback(
    (itemsToPack: CargoItemInput[] = cargoList) => {
      const result = optimizeStowage3D(activeContainer, itemsToPack, {
        centerPayload: true,
      });
      setOptResult(result);
    },
    [activeContainer, cargoList],
  );

  const handleClearCargo = useCallback(() => {
    setCargoList([]);
    setOptResult(
      optimizeStowage3D(activeContainer, [], {
        centerPayload: true,
      }),
    );
  }, [activeContainer]);

  const handleCertifyStability = useCallback(async () => {
    setIsCertifying(true);
    setCertificationFeedback(null);
    try {
      handleRunOptimizer(cargoList);
      const res = await authFetch("/api/stowage/calculate-stability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          containerId: selectedContainerId,
          certifiedBy: "Chief Mate Roberts (Safety Officer)",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          err.message || "Error al certificar el plan de estiba.",
        );
      }
      await refetchStowagePlan();
      setCertificationFeedback({
        type: "success",
        message:
          "Plan de carga 3D y Centro de Gravedad (CoG) certificados oficialmente en SQLite (IMO/CSS Code Anexo 13).",
      });
    } catch (err: any) {
      setCertificationFeedback({
        type: "error",
        message: err.message || "Error al calcular estabilidad.",
      });
    } finally {
      setIsCertifying(false);
    }
  }, [cargoList, handleRunOptimizer, refetchStowagePlan, selectedContainerId]);

  const handleSelectContainer = useCallback(
    (key: ContainerTypeKey) => {
      setSelectedContainerKey(key);
      const newContainer = EQUIPMENT_CATALOG[key];
      const result = optimizeStowage3D(newContainer, cargoList, {
        centerPayload: true,
      });
      setOptResult(result);
    },
    [cargoList],
  );

  const handleAddCargoItem = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItemName.trim()) return;

      const newItem: CargoItemInput = {
        id: `item_${Date.now()}`,
        name: newItemName.trim(),
        widthM: Number(newItemWidth),
        lengthM: Number(newItemLength),
        heightM: Number(newItemHeight),
        weightKg: Number(newItemWeight),
        stackable: newItemStackable,
        hazardClass: newItemHazard.trim() || undefined,
        color: CARGO_ITEM_PALETTE[cargoList.length % CARGO_ITEM_PALETTE.length],
      };

      const updatedList = [...cargoList, newItem];
      setCargoList(updatedList);
      handleRunOptimizer(updatedList);
      setNewItemName("");
    },
    [
      cargoList,
      handleRunOptimizer,
      newItemHazard,
      newItemHeight,
      newItemLength,
      newItemName,
      newItemStackable,
      newItemWeight,
      newItemWidth,
    ],
  );

  const handleRemoveCargoItem = useCallback(
    (id: string) => {
      const updatedList = cargoList.filter((item) => item.id !== id);
      setCargoList(updatedList);
      handleRunOptimizer(updatedList);
    },
    [cargoList, handleRunOptimizer],
  );

  const handleRunGeminiStowageAudit = useCallback(
    async (bypassCache = false) => {
      setIsAuditingGemini(true);
      try {
        const res = await fetch("/api/ai/stowage-safety-audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            containerId: selectedContainerId || "cnt_msku_9284712",
            shipmentId: selectedShipmentId || "sh_demo_01",
            bypassCache,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setGeminiStowageAudit(data);
        }
      } catch (err) {
        console.error("Failed to run Gemini stowage safety audit:", err);
      } finally {
        setIsAuditingGemini(false);
      }
    },
    [selectedContainerId, selectedShipmentId],
  );

  const conflictingItemIds = useMemo(
    () => extractConflictingItemIds(optResult),
    [optResult],
  );

  return {
    selectedShipmentId,
    setSelectedShipmentId,
    selectedContainerId,
    setSelectedContainerId,
    selectedContainerKey,
    activeContainer,
    shipments,
    availablePlans,
    stowagePlan,
    refetchStowagePlan,
    isLoadingPlan,
    isCertifying,
    certificationFeedback,
    setCertificationFeedback,
    isAuditingGemini,
    geminiStowageAudit,
    setGeminiStowageAudit,
    cargoList,
    optResult,
    selectedId,
    setSelectedId,
    transformMode,
    setTransformMode,
    showCogMarker,
    setShowCogMarker,
    showWalls,
    setShowWalls,
    autoRotate,
    setAutoRotate,
    activeTab,
    setActiveTab,
    newItemName,
    setNewItemName,
    newItemWidth,
    setNewItemWidth,
    newItemLength,
    setNewItemLength,
    newItemHeight,
    setNewItemHeight,
    newItemWeight,
    setNewItemWeight,
    newItemStackable,
    setNewItemStackable,
    newItemHazard,
    setNewItemHazard,
    conflictingItemIds,
    handleRunOptimizer,
    handleClearCargo,
    handleCertifyStability,
    handleSelectContainer,
    handleAddCargoItem,
    handleRemoveCargoItem,
    handleRunGeminiStowageAudit,
  };
}
