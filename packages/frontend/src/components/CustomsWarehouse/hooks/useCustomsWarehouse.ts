/**
 * @file useCustomsWarehouse.ts
 * @description State, queries, and mutations hook for Customs Warehouse (DA/DDA/ADT) operations.
 * @module @atlas/frontend/components/CustomsWarehouse/hooks
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { useState, useEffect } from "react";
import { useApiQuery } from "../../../hooks/useApiQuery";
import type {
  CustomsWarehouseTab,
  DischargeRegimeCode,
  UsualHandlingType,
  CustomsLotStatus,
  CustomsInventoryLot,
  CustomsBankGuarantee,
  CustomsFacility,
  DischargeSimulationResult,
} from "../../../types/customs-warehouse.types";

// ============================================================================
// 1. HELPER UTILITIES
// ============================================================================

export function formatCurrencyEs(val: number): string {
  return val.toLocaleString("es-ES", { minimumFractionDigits: 2 });
}

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("atlas_token") || localStorage.getItem("token")
      : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// ============================================================================
// 2. HOOK IMPLEMENTATION
// ============================================================================

export function useCustomsWarehouse() {
  const [activeTab, setActiveTab] =
    useState<CustomsWarehouseTab>("LOTS_LEDGER");
  const [activeRegimeFilter, setActiveRegimeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLot, setSelectedLot] = useState<CustomsInventoryLot | null>(
    null,
  );

  // Discharge Simulator State
  const [simDischargeRegime, setSimDischargeRegime] =
    useState<DischargeRegimeCode>("4071");
  const [simDischargedPkgs, setSimDischargedPkgs] = useState(20);
  const [dischargeResult, setDischargeResult] =
    useState<DischargeSimulationResult | null>(null);

  // Usual Handling Validator State
  const [selectedHandlingType, setSelectedHandlingType] =
    useState<UsualHandlingType>("LABELING_MARKING");

  // Status Change Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusInput, setStatusInput] = useState<CustomsLotStatus>("ACTIVE");
  const [remarksInput, setRemarksInput] = useState("");

  // Queries
  const {
    data: lots = [],
    isLoading: loadingLots,
    refetch: refetchLots,
  } = useApiQuery<CustomsInventoryLot[]>(
    ["customs-warehouse-lots", activeRegimeFilter, searchQuery],
    `/customs-warehouse/lots?regime=${activeRegimeFilter}&q=${encodeURIComponent(
      searchQuery,
    )}`,
  );

  const { data: facilities = [] } = useApiQuery<CustomsFacility[]>(
    ["customs-facilities"],
    "/customs-warehouse/facilities",
  );

  const { data: guarantees = [] } = useApiQuery<CustomsBankGuarantee[]>(
    ["customs-guarantees"],
    "/customs-warehouse/guarantees",
  );

  const { data: lotDetails } = useApiQuery<CustomsInventoryLot>(
    ["customs-lot-details", selectedLot?.id],
    selectedLot?.id ? `/customs-warehouse/lots/${selectedLot.id}` : "",
  );

  useEffect(() => {
    if (lots.length > 0 && !selectedLot) {
      setSelectedLot(lots[0]);
    }
  }, [lots, selectedLot]);

  const currentLot = lotDetails || selectedLot;

  // Actions
  const handleRunDischargeCalc = async () => {
    if (!currentLot) return;
    try {
      const res = await fetch("/api/customs-warehouse/calculate-discharge", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          totalLotCustomsValueEur: currentLot.customsValueEur,
          totalLotDutyAmountEur: currentLot.suspendedDutyAmountEur,
          totalLotVatAmountEur: currentLot.suspendedVatAmountEur,
          initialPackagesCount: currentLot.initialPackageCount,
          dischargedPackagesCount: Number(simDischargedPkgs),
          dischargeRegimeCode: simDischargeRegime,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDischargeResult(data.result);
      }
    } catch (err) {
      console.error("Discharge calculation error:", err);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedLot) return;
    try {
      const res = await fetch(
        `/api/customs-warehouse/lots/${selectedLot.id}/status`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            status: statusInput,
            remarks:
              remarksInput ||
              "Estado del lote actualizado conforme al registro de inspección de aduanas.",
          }),
        },
      );
      if (res.ok) {
        setShowStatusModal(false);
        refetchLots();
      }
    } catch (err) {
      console.error("Error updating lot status:", err);
    }
  };

  const openStatusModal = (lot: CustomsInventoryLot) => {
    setStatusInput(lot.status || "ACTIVE");
    setRemarksInput(lot.remarks || "");
    setShowStatusModal(true);
  };

  // KPIs
  const totalSuspendedDebtSum = lots.reduce(
    (acc, l) => acc + (l.totalSuspendedDebtEur || 0),
    0,
  );
  const totalPackagesSum = lots.reduce(
    (acc, l) => acc + (l.currentPackageCount || 0),
    0,
  );
  const totalAvailableCreditSum = guarantees.reduce(
    (acc, g) => acc + (g.availableCreditEur || 0),
    0,
  );

  return {
    activeTab,
    setActiveTab,
    activeRegimeFilter,
    setActiveRegimeFilter,
    searchQuery,
    setSearchQuery,
    selectedLot,
    setSelectedLot,
    currentLot,
    lots,
    loadingLots,
    facilities,
    guarantees,
    simDischargeRegime,
    setSimDischargeRegime,
    simDischargedPkgs,
    setSimDischargedPkgs,
    dischargeResult,
    handleRunDischargeCalc,
    selectedHandlingType,
    setSelectedHandlingType,
    showStatusModal,
    setShowStatusModal,
    statusInput,
    setStatusInput,
    remarksInput,
    setRemarksInput,
    openStatusModal,
    handleSaveStatus,
    totalSuspendedDebtSum,
    totalPackagesSum,
    totalAvailableCreditSum,
  };
}
