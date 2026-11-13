/**
 * @file useColdChain.ts
 * @description Custom React hook managing Cold Chain & Pharma GDP shipments, EN 12830 telemetry, MKT/Dry Ice/Genset calculators, and QP/RP batch release.
 * @module @atlas/frontend/components/ColdChain/hooks/useColdChain
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { useState, useEffect, useMemo } from "react";
import { useApiQuery } from "../../../hooks/useApiQuery";
import {
  ColdChainProfile,
  ColdChainShipment,
  ColdChainTabId,
  DryIceSimResult,
  GdpReleaseVerdict,
  MktEvaluationResult,
  ReeferPowerSimResult,
} from "../../../types/cold-chain.types";

export function getGdpVerdictBadge(verdict: GdpReleaseVerdict | string): {
  label: string;
  className: string;
} {
  if (verdict === "RELEASED_FOR_DISTRIBUTION") {
    return {
      label: "LIBERADO",
      className:
        "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    };
  }
  if (verdict === "QUARANTINE_INVESTIGATION") {
    return {
      label: "CUARENTENA",
      className: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    };
  }
  return {
    label: verdict,
    className: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  };
}

export function useColdChain() {
  const [activeTab, setActiveTab] = useState<ColdChainTabId>("MONITOR");
  const [activeProfileFilter, setActiveProfileFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShipment, setSelectedShipment] =
    useState<ColdChainShipment | null>(null);

  // MKT Calculator State
  const [calcTempsInput, setCalcTempsInput] = useState(
    "4.8, 5.2, 5.0, 8.4, 4.9, 4.6",
  );
  const [calcMinTemp, setCalcMinTemp] = useState(2.0);
  const [calcMaxTemp, setCalcMaxTemp] = useState(8.0);
  const [mktResult, setMktResult] = useState<MktEvaluationResult | null>(null);

  // Dry Ice Simulator State
  const [simDryIceInitialKg, setSimDryIceInitialKg] = useState(45.0);
  const [simDryIceCurrentKg, setSimDryIceCurrentKg] = useState(32.0);
  const [simDryIceRate, setSimDryIceRate] = useState(0.45);
  const [simDryIceTransitHrs, setSimDryIceTransitHrs] = useState(24);
  const [dryIceResult, setDryIceResult] = useState<DryIceSimResult | null>(
    null,
  );

  // Reefer Genset Simulator State
  const [simAmbientTemp, setSimAmbientTemp] = useState(32.0);
  const [simSetpointTemp, setSimSetpointTemp] = useState(5.0);
  const [simTransitHours, setSimTransitHours] = useState(36);
  const [simTankCapacity, setSimTankCapacity] = useState(450);
  const [reeferResult, setReeferResult] = useState<ReeferPowerSimResult | null>(
    null,
  );

  // GDP Release Modal State
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [verdictInput, setVerdictInput] = useState<GdpReleaseVerdict>(
    "RELEASED_FOR_DISTRIBUTION",
  );
  const [rpNameInput, setRpNameInput] = useState(
    "Dra. Elena Ruiz (Directora Técnica QP/RP)",
  );
  const [auditNotesInput, setAuditNotesInput] = useState("");

  // Fetch Cold Chain Shipments
  const {
    data: shipments = [],
    isLoading: loadingShipments,
    refetch: refetchShipments,
  } = useApiQuery<ColdChainShipment[]>(
    ["cold-chain-shipments", activeProfileFilter, searchQuery],
    `/cold-chain/shipments?profileId=${activeProfileFilter}&q=${encodeURIComponent(searchQuery)}`,
  );

  // Fetch Regulated Profiles
  const { data: profiles = [] } = useApiQuery<ColdChainProfile[]>(
    ["cold-chain-profiles"],
    "/cold-chain/profiles",
  );

  // Fetch Detailed Selected Shipment
  const { data: shipmentDetails } = useApiQuery<ColdChainShipment>(
    ["cold-chain-shipment-details", selectedShipment?.id],
    selectedShipment?.id ? `/cold-chain/shipments/${selectedShipment.id}` : "",
  );

  useEffect(() => {
    if (shipments.length > 0 && !selectedShipment) {
      setSelectedShipment(shipments[0]);
    }
  }, [shipments, selectedShipment]);

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

  const handleRunMktCalc = async () => {
    const tempsArray = calcTempsInput
      .split(",")
      .map((t) => parseFloat(t.trim()))
      .filter((t) => !isNaN(t));

    try {
      const res = await fetch("/api/cold-chain/calculate-mkt", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          readings: tempsArray.map((c) => ({
            celsius: c,
            durationMinutes: 60,
          })),
          minAllowedCelsius: Number(calcMinTemp),
          maxAllowedCelsius: Number(calcMaxTemp),
          targetCelsius: (Number(calcMinTemp) + Number(calcMaxTemp)) / 2,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMktResult(data.evaluation);
      }
    } catch (err) {
      console.error("MKT calculation error:", err);
    }
  };

  const handleRunDryIceSim = async () => {
    try {
      const res = await fetch("/api/cold-chain/simulate-dry-ice", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          initialWeightKg: Number(simDryIceInitialKg),
          currentWeightKg: Number(simDryIceCurrentKg),
          sublimationRateKgHr: Number(simDryIceRate),
          transitHoursRemaining: Number(simDryIceTransitHrs),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDryIceResult(data.result);
      }
    } catch (err) {
      console.error("Dry Ice simulation error:", err);
    }
  };

  const handleRunReeferSim = async () => {
    try {
      const res = await fetch("/api/cold-chain/simulate-reefer-power", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ambientTempCelsius: Number(simAmbientTemp),
          setpointCelsius: Number(simSetpointTemp),
          transitHours: Number(simTransitHours),
          tankCapacityLiters: Number(simTankCapacity),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReeferResult(data.result);
      }
    } catch (err) {
      console.error("Reefer simulation error:", err);
    }
  };

  const handleSaveGdpRelease = async () => {
    if (!selectedShipment) return;
    try {
      const res = await fetch(
        `/api/cold-chain/shipments/${selectedShipment.id}/release`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            gdpReleaseVerdict: verdictInput,
            responsiblePersonName: rpNameInput,
            qualityAuditNotes:
              auditNotesInput ||
              "Liberación certificada por Dirección Técnica.",
          }),
        },
      );
      if (res.ok) {
        setShowReleaseModal(false);
        refetchShipments();
      }
    } catch (err) {
      console.error("Error saving GDP release:", err);
    }
  };

  const openReleaseModal = (shipment: ColdChainShipment) => {
    setVerdictInput(shipment.gdpReleaseVerdict || "RELEASED_FOR_DISTRIBUTION");
    setAuditNotesInput(shipment.qualityAuditNotes || "");
    setShowReleaseModal(true);
  };

  const stats = useMemo(() => {
    const totalShipmentsCount = shipments.length;
    const compliantCount = shipments.filter(
      (s) => s.gdpReleaseVerdict === "RELEASED_FOR_DISTRIBUTION",
    ).length;
    const quarantineCount = shipments.filter(
      (s) =>
        s.gdpReleaseVerdict === "QUARANTINE_INVESTIGATION" ||
        s.excursionStatus === "CRITICAL_EXCURSION",
    ).length;
    const criticalDryIceCount = shipments.filter(
      (s) => s.currentDryIceWeightKg && s.currentDryIceWeightKg < 10.0,
    ).length;
    return {
      totalShipmentsCount,
      compliantCount,
      quarantineCount,
      criticalDryIceCount,
    };
  }, [shipments]);

  const currentShipment = shipmentDetails || selectedShipment;

  return {
    activeTab,
    setActiveTab,
    activeProfileFilter,
    setActiveProfileFilter,
    searchQuery,
    setSearchQuery,
    selectedShipment,
    setSelectedShipment,
    currentShipment,
    shipments,
    profiles,
    loadingShipments,
    calcTempsInput,
    setCalcTempsInput,
    calcMinTemp,
    setCalcMinTemp,
    calcMaxTemp,
    setCalcMaxTemp,
    mktResult,
    simDryIceInitialKg,
    setSimDryIceInitialKg,
    simDryIceCurrentKg,
    setSimDryIceCurrentKg,
    simDryIceRate,
    setSimDryIceRate,
    simDryIceTransitHrs,
    setSimDryIceTransitHrs,
    dryIceResult,
    simAmbientTemp,
    setSimAmbientTemp,
    simSetpointTemp,
    setSimSetpointTemp,
    simTransitHours,
    setSimTransitHours,
    simTankCapacity,
    setSimTankCapacity,
    reeferResult,
    showReleaseModal,
    setShowReleaseModal,
    verdictInput,
    setVerdictInput,
    rpNameInput,
    setRpNameInput,
    auditNotesInput,
    setAuditNotesInput,
    stats,
    handleRunMktCalc,
    handleRunDryIceSim,
    handleRunReeferSim,
    handleSaveGdpRelease,
    openReleaseModal,
  };
}
