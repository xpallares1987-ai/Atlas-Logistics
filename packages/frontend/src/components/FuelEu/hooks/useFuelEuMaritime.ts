/**
 * @file useFuelEuMaritime.ts
 * @description Custom React hook encapsulating FuelEU Maritime voyages, EU ETS / Green BAF calculations, and fleet pooling state.
 * @module @atlas/frontend/components/FuelEu/hooks
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { useState, useEffect } from "react";
import { useApiQuery } from "../../../hooks/useApiQuery";
import type {
  FuelEuTab,
  FuelEuGeographicScope,
  VoyageVerificationStatus,
} from "../../../types/fueleu.types";

/**
 * Pure helper to compute aggregated FuelEU / EU ETS KPIs across voyages.
 */
export function computeVoyageKpis(voyages: any[]) {
  const totalEtsEmissionsSum = voyages.reduce(
    (acc, v) => acc + (v.etsApplicableScopeEmissionsTco2eq || 0),
    0,
  );
  const totalFuelEnergySum = voyages.reduce(
    (acc, v) => acc + (v.totalEnergyConsumedMj || 0),
    0,
  );
  const avgGhgIntensity =
    voyages.length > 0
      ? voyages.reduce(
          (acc, v) => acc + (v.calculatedGhgIntensityGco2eqPerMj || 0),
          0,
        ) / voyages.length
      : 0;

  return {
    totalEtsEmissionsSum,
    totalFuelEnergySum,
    avgGhgIntensity,
  };
}

export function useFuelEuMaritime() {
  const [activeTab, setActiveTab] = useState<FuelEuTab>("VOYAGES_GHG");
  const [activeScopeFilter, setActiveScopeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVoyage, setSelectedVoyage] = useState<any>(null);

  const [simCo2Tonnes, setSimCo2Tonnes] = useState(350);
  const [simCh4Tonnes, setSimCh4Tonnes] = useState(0.01);
  const [simN2oTonnes, setSimN2oTonnes] = useState(0.02);
  const [simScope, setSimScope] =
    useState<FuelEuGeographicScope>("INTRA_EU_100");
  const [simEuaPrice, setSimEuaPrice] = useState(75);
  const [simCarriedTeus, setSimCarriedTeus] = useState(4500);
  const [simFueleuImpact, setSimFueleuImpact] = useState(8000);
  const [etsSimResult, setEtsSimResult] = useState<any>(null);

  const [simFuelCode, setSimFuelCode] = useState("E_METHANOL_RFNBO");
  const [simFuelTonnes, setSimFuelTonnes] = useState(120);
  const [simOpsKwh, setSimOpsKwh] = useState(15000);
  const [fuelSimResult, setFuelSimResult] = useState<any>(null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusInput, setStatusInput] =
    useState<VoyageVerificationStatus>("COMPLETED_VERIFIED");
  const [verifierInput, setVerifierInput] = useState("");

  const { data: fuels = [] } = useApiQuery<any[]>(
    ["fueleu-fuels"],
    "/fueleu/fuels",
  );
  const { data: vessels = [] } = useApiQuery<any[]>(
    ["fueleu-vessels"],
    "/fueleu/vessels",
  );
  const {
    data: voyages = [],
    isLoading: loadingVoyages,
    refetch: refetchVoyages,
  } = useApiQuery<any[]>(
    ["fueleu-voyages", activeScopeFilter, searchQuery],
    `/fueleu/voyages?scope=${activeScopeFilter}&q=${encodeURIComponent(
      searchQuery,
    )}`,
  );
  const { data: accounts = [] } = useApiQuery<any[]>(
    ["fueleu-accounts"],
    "/fueleu/accounts",
  );
  const { data: pools = [] } = useApiQuery<any[]>(
    ["fueleu-pools"],
    "/fueleu/pools",
  );
  const { data: voyageDetails } = useApiQuery<any>(
    ["fueleu-voyage-details", selectedVoyage?.id],
    selectedVoyage?.id ? `/fueleu/voyages/${selectedVoyage.id}` : "",
  );

  useEffect(() => {
    if (voyages.length > 0 && !selectedVoyage) {
      setSelectedVoyage(voyages[0]);
    }
  }, [voyages, selectedVoyage]);

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

  const handleRunEtsCalc = async () => {
    try {
      const res = await fetch("/api/fueleu/calculate-ets", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          co2EmissionsTonnes: Number(simCo2Tonnes),
          ch4EmissionsTonnes: Number(simCh4Tonnes),
          n2oEmissionsTonnes: Number(simN2oTonnes),
          scope: simScope,
          euaPriceEurPerTonne: Number(simEuaPrice),
          carriedTeus: Number(simCarriedTeus),
          fueleuPenaltyEur: Number(simFueleuImpact),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEtsSimResult(data);
      }
    } catch (err) {
      console.error("ETS calculation error:", err);
    }
  };

  const handleRunFuelSim = async () => {
    const selectedFuelObj =
      fuels.find((f) => f.fuelCode === simFuelCode) || fuels[0];
    if (!selectedFuelObj) return;

    try {
      const res = await fetch("/api/fueleu/calculate-fueleu", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          reportingYear: 2025,
          fuelConsumptions: [
            {
              fuelCode: selectedFuelObj.fuelCode,
              consumedTonnes: Number(simFuelTonnes),
              lowerCalorificValueMjPerGram:
                selectedFuelObj.lowerCalorificValueMjPerGram,
              wtwFactorGco2eqPerMj: selectedFuelObj.totalWtwFactorGco2eqPerMj,
            },
          ],
          opsElectricityKwh: Number(simOpsKwh),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFuelSimResult(data);
      }
    } catch (err) {
      console.error("Fuel calculation error:", err);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedVoyage) return;
    try {
      const res = await fetch(
        `/api/fueleu/voyages/${selectedVoyage.id}/status`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            status: statusInput,
            leadAuditorVerifier: verifierInput || "DNV Marine Lead Auditor",
          }),
        },
      );
      if (res.ok) {
        setShowStatusModal(false);
        refetchVoyages();
      }
    } catch (err) {
      console.error("Error updating voyage status:", err);
    }
  };

  const handleOpenVerifyModal = (voyage: any) => {
    setStatusInput(voyage.status || "COMPLETED_VERIFIED");
    setVerifierInput(voyage.leadAuditorVerifier || "");
    setShowStatusModal(true);
  };

  const kpis = computeVoyageKpis(voyages);
  const currentVoyage = voyageDetails || selectedVoyage;
  const currentAccount = accounts[0];

  return {
    activeTab,
    setActiveTab,
    activeScopeFilter,
    setActiveScopeFilter,
    searchQuery,
    setSearchQuery,
    selectedVoyage,
    setSelectedVoyage,
    simCo2Tonnes,
    setSimCo2Tonnes,
    simCh4Tonnes,
    setSimCh4Tonnes,
    simN2oTonnes,
    setSimN2oTonnes,
    simScope,
    setSimScope,
    simEuaPrice,
    setSimEuaPrice,
    simCarriedTeus,
    setSimCarriedTeus,
    simFueleuImpact,
    setSimFueleuImpact,
    etsSimResult,
    simFuelCode,
    setSimFuelCode,
    simFuelTonnes,
    setSimFuelTonnes,
    simOpsKwh,
    setSimOpsKwh,
    fuelSimResult,
    showStatusModal,
    setShowStatusModal,
    statusInput,
    setStatusInput,
    verifierInput,
    setVerifierInput,
    fuels,
    vessels,
    voyages,
    loadingVoyages,
    pools,
    currentVoyage,
    currentAccount,
    ...kpis,
    handleRunEtsCalc,
    handleRunFuelSim,
    handleSaveStatus,
    handleOpenVerifyModal,
  };
}
