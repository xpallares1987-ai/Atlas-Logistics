/**
 * @file useRailFreight.ts
 * @description Custom state and API orchestration hook for the Intermodal Rail Freight & TEN-T Corridors module.
 * @module @atlas/frontend/components/RailFreight/hooks
 * @see {@link docs/adr/0020-modular-file-size-guardrails.md}
 */

import { useState, useEffect } from "react";
import { useApiQuery } from "../../../hooks/useApiQuery";
import type {
  RailFreightTab,
  RailLineCategory,
  RailConsignmentStatus,
} from "../../../types/rail-freight.types";

export function useRailFreight() {
  const [activeTab, setActiveTab] = useState<RailFreightTab>("CONSIGNMENTS");
  const [activeCorridorFilter, setActiveCorridorFilter] =
    useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConsignment, setSelectedConsignment] = useState<any>(null);

  // Train Simulator State
  const [simLocoWeight, setSimLocoWeight] = useState(123.0);
  const [simLocoBrake, setSimLocoBrake] = useState(110.0);
  const [simWagonCount, setSimWagonCount] = useState(18);
  const [simAvgWagonTare, setSimAvgWagonTare] = useState(28.5);
  const [simAvgWagonPayload, setSimAvgWagonPayload] = useState(32.0);
  const [simAvgWagonBrake, setSimAvgWagonBrake] = useState(80.0);
  const [trainPhysicsResult, setTrainPhysicsResult] = useState<any>(null);

  // Axle Load Simulator State
  const [calcWagonTare, setCalcWagonTare] = useState(28.5);
  const [calcPayload, setCalcPayload] = useState(60.0);
  const [calcAxles, setCalcAxles] = useState(6);
  const [calcLineCategory, setCalcLineCategory] =
    useState<RailLineCategory>("D");
  const [axleResult, setAxleResult] = useState<any>(null);

  // Status Change Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusInput, setStatusInput] =
    useState<RailConsignmentStatus>("IN_TRANSIT");
  const [remarksInput, setRemarksInput] = useState("");

  const {
    data: consignments = [],
    isLoading: loadingConsignments,
    refetch: refetchConsignments,
  } = useApiQuery<any[]>(
    ["rail-consignments", activeCorridorFilter, searchQuery],
    `/rail/consignments?corridorId=${activeCorridorFilter}&q=${encodeURIComponent(
      searchQuery,
    )}`,
  );

  const { data: corridors = [] } = useApiQuery<any[]>(
    ["rail-corridors"],
    "/rail/corridors",
  );

  const { data: terminals = [] } = useApiQuery<any[]>(
    ["rail-terminals"],
    "/rail/terminals",
  );

  const { data: wagons = [] } = useApiQuery<any[]>(
    ["rail-wagons"],
    "/rail/wagons",
  );

  const { data: trains = [] } = useApiQuery<any[]>(
    ["rail-trains"],
    "/rail/trains",
  );

  const { data: consignmentDetails } = useApiQuery<any>(
    ["rail-consignment-details", selectedConsignment?.id],
    selectedConsignment?.id
      ? `/rail/consignments/${selectedConsignment.id}`
      : "",
  );

  useEffect(() => {
    if (consignments.length > 0 && !selectedConsignment) {
      setSelectedConsignment(consignments[0]);
    }
  }, [consignments, selectedConsignment]);

  const getAuthHeaders = () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("atlas_token") || localStorage.getItem("token")
        : null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const handleRunTrainPhysics = async () => {
    try {
      const generatedWagons = Array.from({ length: simWagonCount }, () => ({
        wagonSeries: "Sggmrss 90' Intermodal",
        tareWeightTonnes: Number(simAvgWagonTare),
        payloadMassTonnes: Number(simAvgWagonPayload),
        lengthOverBuffersMeters: 29.59,
        brakedWeightTonnes: Number(simAvgWagonBrake),
        numberOfAxles: 6,
      }));

      const res = await fetch("/api/rail/calculate-physics", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          locomotiveLengthMeters: 23.0,
          locomotiveWeightTonnes: Number(simLocoWeight),
          locomotiveBrakedWeightTonnes: Number(simLocoBrake),
          maxAllowedLengthMeters: 750,
          requiredBrakePercentage: 65.0,
          corridorLineCategory: "D",
          wagons: generatedWagons,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTrainPhysicsResult(data.result);
      }
    } catch (err) {
      console.error("Train physics calculation error:", err);
    }
  };

  const handleRunAxleCalc = async () => {
    try {
      const res = await fetch("/api/rail/calculate-axle-load", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          wagonTareTonnes: Number(calcWagonTare),
          payloadTonnes: Number(calcPayload),
          numberOfAxles: Number(calcAxles),
          lineCategory: calcLineCategory,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAxleResult(data.result);
      }
    } catch (err) {
      console.error("Axle load calculation error:", err);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedConsignment) return;
    try {
      const res = await fetch(
        `/api/rail/consignments/${selectedConsignment.id}/status`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            status: statusInput,
            remarks:
              remarksInput ||
              "Estado de expedición ferroviaria actualizado según el registro de circulación de tracción.",
          }),
        },
      );
      if (res.ok) {
        setShowStatusModal(false);
        refetchConsignments();
      }
    } catch (err) {
      console.error("Error updating consignment status:", err);
    }
  };

  const totalGrossMassSum = consignments.reduce(
    (acc, c) => acc + (c.totalGrossMassTonnes || 0),
    0,
  );
  const totalTeuSum = consignments.reduce(
    (acc, c) => acc + (c.totalTeu || 0),
    0,
  );
  const inTransitCount = consignments.filter(
    (c) => c.status === "IN_TRANSIT" || c.status === "GAUGE_TRANSFERRED",
  ).length;

  const currentConsignment = consignmentDetails || selectedConsignment;

  return {
    activeTab,
    setActiveTab,
    activeCorridorFilter,
    setActiveCorridorFilter,
    searchQuery,
    setSearchQuery,
    selectedConsignment,
    setSelectedConsignment,
    currentConsignment,
    consignments,
    loadingConsignments,
    corridors,
    terminals,
    wagons,
    trains,
    totalGrossMassSum,
    totalTeuSum,
    inTransitCount,
    simLocoWeight,
    setSimLocoWeight,
    simLocoBrake,
    setSimLocoBrake,
    simWagonCount,
    setSimWagonCount,
    simAvgWagonTare,
    setSimAvgWagonTare,
    simAvgWagonPayload,
    setSimAvgWagonPayload,
    simAvgWagonBrake,
    setSimAvgWagonBrake,
    trainPhysicsResult,
    calcWagonTare,
    setCalcWagonTare,
    calcPayload,
    setCalcPayload,
    calcAxles,
    setCalcAxles,
    calcLineCategory,
    setCalcLineCategory,
    axleResult,
    showStatusModal,
    setShowStatusModal,
    statusInput,
    setStatusInput,
    remarksInput,
    setRemarksInput,
    handleRunTrainPhysics,
    handleRunAxleCalc,
    handleSaveStatus,
  };
}
