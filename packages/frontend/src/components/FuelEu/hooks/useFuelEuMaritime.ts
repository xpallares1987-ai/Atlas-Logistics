/**
 * @file useFuelEuMaritime.ts
 * @description Custom React hook encapsulating FuelEU Maritime voyages, EU ETS / Green BAF calculations, and fleet pooling state.
 * @module @atlas/frontend/components/FuelEu/hooks
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { useState, useEffect } from "react";
import { useApiQuery, resolveApiUrl } from "../../../hooks/useApiQuery";
import type {
  FuelEuTab,
  FuelEuGeographicScope,
  VoyageVerificationStatus,
  FuelEuVoyage,
  FuelRecord,
  ComplianceAccount,
  PoolRecord,
  EtsSimResult,
  FuelSimResult,
} from "../../../types/fueleu.types";

/**
 * Pure helper to compute aggregated FuelEU / EU ETS KPIs across voyages.
 */
export function computeVoyageKpis(voyages: Partial<FuelEuVoyage>[]) {
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
  const [selectedVoyage, setSelectedVoyage] = useState<FuelEuVoyage | null>(
    null,
  );

  const [simCo2Tonnes, setSimCo2Tonnes] = useState(350);
  const [simCh4Tonnes, setSimCh4Tonnes] = useState(0.01);
  const [simN2oTonnes, setSimN2oTonnes] = useState(0.02);
  const [simScope, setSimScope] =
    useState<FuelEuGeographicScope>("INTRA_EU_100");
  const [simEuaPrice, setSimEuaPrice] = useState(75);
  const [simCarriedTeus, setSimCarriedTeus] = useState(4500);
  const [simFueleuImpact, setSimFueleuImpact] = useState(8000);
  const [etsSimResult, setEtsSimResult] = useState<EtsSimResult | null>(null);

  const [simFuelCode, setSimFuelCode] = useState("E_METHANOL_RFNBO");
  const [simFuelTonnes, setSimFuelTonnes] = useState(120);
  const [simOpsKwh, setSimOpsKwh] = useState(15000);
  const [fuelSimResult, setFuelSimResult] = useState<FuelSimResult | null>(
    null,
  );

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusInput, setStatusInput] =
    useState<VoyageVerificationStatus>("COMPLETED_VERIFIED");
  const [verifierInput, setVerifierInput] = useState("");

  const { data: fuels = [] } = useApiQuery<FuelRecord[]>(
    ["fueleu-fuels"],
    "/fueleu/fuels",
  );
  const { data: vessels = [] } = useApiQuery<Record<string, unknown>[]>(
    ["fueleu-vessels"],
    "/fueleu/vessels",
  );
  const {
    data: voyages = [],
    isLoading: loadingVoyages,
    refetch: refetchVoyages,
  } = useApiQuery<FuelEuVoyage[]>(
    ["fueleu-voyages", activeScopeFilter, searchQuery],
    `/fueleu/voyages?scope=${activeScopeFilter}&q=${encodeURIComponent(
      searchQuery,
    )}`,
  );
  const { data: accounts = [] } = useApiQuery<ComplianceAccount[]>(
    ["fueleu-accounts"],
    "/fueleu/accounts",
  );
  const { data: pools = [] } = useApiQuery<PoolRecord[]>(
    ["fueleu-pools"],
    "/fueleu/pools",
  );
  const { data: voyageDetails } = useApiQuery<FuelEuVoyage>(
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
      const res = await fetch(
        resolveApiUrl("/api/fueleu/simulate/ets-calculator"),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            co2EmissionsTonnes: simCo2Tonnes,
            co2Tonnes: simCo2Tonnes,
            ch4EmissionsTonnes: simCh4Tonnes,
            ch4Tonnes: simCh4Tonnes,
            n2oEmissionsTonnes: simN2oTonnes,
            n2oTonnes: simN2oTonnes,
            scope: simScope,
            geographicScope: simScope,
            euaPriceEurPerTonne: simEuaPrice,
            euaPriceEur: simEuaPrice,
            carriedTeus: simCarriedTeus,
            fueleuPenaltyEur: simFueleuImpact,
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setEtsSimResult(data);
      }
    } catch (err) {
      console.error("Error simulating ETS:", err);
    }
  };

  const handleRunFuelSim = async () => {
    try {
      const res = await fetch(
        resolveApiUrl("/api/fueleu/simulate/fuel-ghg-intensity"),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            reportingYear: new Date().getFullYear(),
            fuelCode: simFuelCode,
            consumedTonnes: simFuelTonnes,
            fuelConsumptions: [
              {
                fuelCode: simFuelCode,
                fuelConsumptionTonnes: simFuelTonnes,
              },
            ],
            opsElectricityKwh: simOpsKwh,
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setFuelSimResult(data);
      }
    } catch (err) {
      console.error("Error simulating Fuel GHG:", err);
    }
  };

  const handleConfirmStatusUpdate = async () => {
    if (!selectedVoyage) return;
    try {
      const res = await fetch(
        resolveApiUrl(
          `/api/fueleu/voyages/${selectedVoyage.id}/verification-status`,
        ),
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            status: statusInput,
            leadAuditorVerifier: verifierInput,
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

  const handleOpenVerifyModal = (voyage: FuelEuVoyage) => {
    setStatusInput(
      (voyage.status as VoyageVerificationStatus) || "COMPLETED_VERIFIED",
    );
    setVerifierInput((voyage.leadAuditorVerifier as string) || "");
    setShowStatusModal(true);
  };

  const kpis = computeVoyageKpis(voyages);
  const currentVoyage = voyageDetails || selectedVoyage;
  const currentAccount = accounts[0] || null;

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
    handleRunEtsCalc,
    simFuelCode,
    setSimFuelCode,
    simFuelTonnes,
    setSimFuelTonnes,
    simOpsKwh,
    setSimOpsKwh,
    fuelSimResult,
    handleRunFuelSim,
    showStatusModal,
    setShowStatusModal,
    statusInput,
    setStatusInput,
    verifierInput,
    setVerifierInput,
    handleConfirmStatusUpdate,
    handleOpenVerifyModal,
    fuels,
    vessels,
    voyages,
    loadingVoyages,
    accounts,
    pools,
    voyageDetails,
    kpis,
    currentVoyage,
    currentAccount,
    totalEtsEmissionsSum: kpis.totalEtsEmissionsSum,
    totalFuelEnergySum: kpis.totalFuelEnergySum,
    avgGhgIntensity: kpis.avgGhgIntensity,
    handleSaveStatus: handleConfirmStatusUpdate,
  };
}
