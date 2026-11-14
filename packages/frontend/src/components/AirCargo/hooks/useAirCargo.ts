/**
 * @file useAirCargo.ts
 * @description Hook managing IATA e-Freight AWBs, consolidation hierarchy, and volumetric pricing simulator.
 * @module @atlas/frontend/components/AirCargo/hooks
 */

import { useState, useEffect } from "react";
import { useApiQuery } from "../../../hooks/useApiQuery";
import {
  AwbFilterType,
  AirwayBillRecord,
  AirwayBillPiece,
} from "../types/index";

export function useAirCargo() {
  const [activeFilter, setActiveFilter] = useState<AwbFilterType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAwb, setSelectedAwb] = useState<AirwayBillRecord | null>(null);
  const [expandedMawbs, setExpandedMawbs] = useState<Record<string, boolean>>(
    {},
  );

  // Simulator & New AWB Modal State
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [simOrigin, setSimOrigin] = useState("MAD");
  const [simDestination, setSimDestination] = useState("JFK");
  const [simPieces, setSimPieces] = useState<AirwayBillPiece[]>([
    { lengthCm: 120, widthCm: 80, heightCm: 100, quantity: 2 },
  ]);
  const [simActualWeight, setSimActualWeight] = useState(250);
  const [simGoods, setSimGoods] = useState(
    "Pharmaceutical reagents & test equipment",
  );
  const [simUnNumber, setSimUnNumber] = useState("");
  const [simTempControlled, setSimTempControlled] = useState(true);
  const [simTempRange, setSimTempRange] = useState("+2C to +8C");
  const [simRatingResult, setSimRatingResult] = useState<any>(null);
  const [simDgrResult, setSimDgrResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch AWBs
  const { data: airwayBills = [], isLoading } = useApiQuery<AirwayBillRecord[]>(
    ["airway-bills", activeFilter, searchQuery],
    `/air-cargo/awb?type=${activeFilter}&q=${encodeURIComponent(searchQuery)}`,
  );

  // Auto-select first AWB
  useEffect(() => {
    if (airwayBills.length > 0 && !selectedAwb) {
      setSelectedAwb(airwayBills[0]);
    }
  }, [airwayBills, selectedAwb]);

  const toggleMawbExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMawbs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

  const calculateSimulator = async () => {
    try {
      setIsCalculating(true);
      const headers = getAuthHeaders();

      // 1. Rating calculation
      const rateRes = await fetch("/api/air-cargo/calculate-rating", {
        method: "POST",
        headers,
        body: JSON.stringify({
          originAirport: simOrigin,
          destinationAirport: simDestination,
          pieces: simPieces,
          actualGrossWeightKg: Number(simActualWeight),
        }),
      });
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        setSimRatingResult(rateData);
      }

      // 2. DGR Compliance Screening
      const dgrRes = await fetch("/api/air-cargo/screen-dgr", {
        method: "POST",
        headers,
        body: JSON.stringify({
          natureOfGoods: simGoods,
          unNumber: simUnNumber || undefined,
          grossWeightKg: Number(simActualWeight),
          isTempControlled: simTempControlled,
          tempRange: simTempRange,
        }),
      });
      if (dgrRes.ok) {
        const dgrData = await dgrRes.json();
        setSimDgrResult(dgrData);
      }
    } catch (err) {
      console.error("Simulator error:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  // KPI Calculations
  const totalAwbs = airwayBills.reduce(
    (acc, m) => acc + 1 + (m.consolidatedHawbs?.length || 0),
    0,
  );
  const totalMawbs = airwayBills.filter((a) => a.type === "MAWB").length;
  const totalChargeableKg = airwayBills.reduce(
    (acc, a) => acc + (a.chargeableWeightKg || 0),
    0,
  );
  const dgrSpecialCount = airwayBills.filter(
    (a) =>
      a.specialHandlingCodes &&
      a.specialHandlingCodes.some((shc: string) =>
        ["ELI", "ELM", "COL", "ICE", "CAO", "VAL", "PER"].includes(shc),
      ),
  ).length;

  return {
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    selectedAwb,
    setSelectedAwb,
    expandedMawbs,
    toggleMawbExpand,
    airwayBills,
    isLoading,
    totalAwbs,
    totalMawbs,
    totalChargeableKg,
    dgrSpecialCount,
    // Simulator
    showSimulatorModal,
    setShowSimulatorModal,
    simOrigin,
    setSimOrigin,
    simDestination,
    setSimDestination,
    simPieces,
    setSimPieces,
    simActualWeight,
    setSimActualWeight,
    simGoods,
    setSimGoods,
    simUnNumber,
    setSimUnNumber,
    simTempControlled,
    setSimTempControlled,
    simTempRange,
    setSimTempRange,
    simRatingResult,
    simDgrResult,
    isCalculating,
    calculateSimulator,
  };
}
