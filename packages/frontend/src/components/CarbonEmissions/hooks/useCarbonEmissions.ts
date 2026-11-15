/**
 * @file useCarbonEmissions.ts
 * @description Custom domain hook and formatting helpers for Scope 3 Carbon Footprint (ISO 14083 & GLEC v3).
 * @module @atlas/frontend/components/CarbonEmissions/hooks
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { useState } from "react";
import { getSecureRandomInt } from "@atlas/shared";
import { useApiMutation, useApiQuery } from "../../../hooks/useApiQuery";
import type {
  CarbonCalculation,
  CarbonCertificate,
  CarbonProject,
  CarbonSummary,
  CarbonTab,
  GreenAlternative,
  LegInput,
} from "../../../types/carbon-emissions.types";

export const toNumber = (value: unknown, fallback = 0): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const toFixed = (value: unknown, digits = 2): string =>
  toNumber(value).toFixed(digits);

export function useCarbonEmissions() {
  const [activeTab, setActiveTab] = useState<CarbonTab>("JOURNEYS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCalculation, setSelectedCalculation] =
    useState<CarbonCalculation | null>(null);

  // Offset Purchase Modal State
  const [showOffsetModal, setShowOffsetModal] = useState(false);
  const [offsetSelectedProjectId, setOffsetSelectedProjectId] =
    useState<string>("");
  const [beneficiaryInput, setBeneficiaryInput] = useState("");

  // Calculator State
  const [calcRefCode, setCalcRefCode] = useState(
    () => `SIM-${getSecureRandomInt(1000, 9999)}`,
  );
  const [calcOriginCity, setCalcOriginCity] = useState("Barcelona");
  const [calcDestinationCity, setCalcDestinationCity] = useState("Rotterdam");
  const [calcLegs, setCalcLegs] = useState<LegInput[]>([
    {
      originName: "Barcelona Port (BEST Terminal)",
      destinationName: "Lyon Railhub",
      mode: "RAIL_ELECTRIC",
      distanceKm: 640,
      weightKg: 20000,
    },
    {
      originName: "Lyon Railhub",
      destinationName: "Rotterdam Maasvlakte",
      mode: "ROAD_HVO",
      distanceKm: 780,
      weightKg: 20000,
    },
  ]);
  const [calcResult, setCalcResult] = useState<CarbonCalculation | null>(null);
  const [greenAlternatives, setGreenAlternatives] = useState<
    GreenAlternative[]
  >([]);

  // 1. Fetch Summary KPIs
  const { data: summary = null, refetch: refetchSummary } =
    useApiQuery<CarbonSummary>(["carbon-summary"], "/carbon/summary");

  // 2. Fetch Calculations List
  const { data: calculations = [], refetch: refetchCalculations } = useApiQuery<
    CarbonCalculation[]
  >(
    ["carbon-calculations", searchQuery],
    `/carbon/calculations?q=${encodeURIComponent(searchQuery)}`,
  );

  // 3. Fetch Projects Catalog
  const { data: projects = [], refetch: refetchProjects } = useApiQuery<
    CarbonProject[]
  >(["carbon-projects"], "/carbon/projects");

  // 4. Fetch Certificates List
  const { data: certificates = [], refetch: refetchCertificates } = useApiQuery<
    CarbonCertificate[]
  >(["carbon-certificates"], "/carbon/certificates");

  // 5. Fetch Calculation Details
  const { data: calcDetails = null } = useApiQuery<CarbonCalculation>(
    ["carbon-calculation-details", selectedCalculation?.id],
    selectedCalculation?.id
      ? `/carbon/calculations/${selectedCalculation.id}`
      : "",
  );

  // Mutations
  const calculateMutation = useApiMutation<
    { journey: CarbonCalculation },
    Record<string, unknown>
  >("/carbon/calculate", "POST");
  const compareMutation = useApiMutation<
    { alternatives: GreenAlternative[] },
    Record<string, unknown>
  >("/carbon/compare-green-route", "POST");
  const offsetMutation = useApiMutation<
    Record<string, unknown>,
    Record<string, unknown>
  >("/carbon/offset", "POST");

  const handleRunCalculation = async () => {
    try {
      const payload = {
        referenceCode: calcRefCode,
        originCity: calcOriginCity,
        destinationCity: calcDestinationCity,
        legs: calcLegs,
      };
      const res = await calculateMutation.mutateAsync(payload);
      setCalcResult(res.journey);

      const altRes = await compareMutation.mutateAsync({ legs: calcLegs });
      setGreenAlternatives(altRes.alternatives || []);

      refetchSummary();
      refetchCalculations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert("Error al calcular huella: " + message);
    }
  };

  const handleAddLeg = () => {
    setCalcLegs([
      ...calcLegs,
      {
        originName: "",
        destinationName: "",
        mode: "ROAD_DIESEL",
        distanceKm: 300,
        weightKg: calcLegs[0]?.weightKg || 10000,
      },
    ]);
  };

  const handleRemoveLeg = (index: number) => {
    if (calcLegs.length > 1) {
      setCalcLegs(calcLegs.filter((_, i) => i !== index));
    }
  };

  const handleLegChange = (
    index: number,
    field: keyof LegInput,
    value: string | number,
  ) => {
    const updated = [...calcLegs];
    updated[index] = { ...updated[index], [field]: value };
    setCalcLegs(updated);
  };

  const handleConfirmOffset = async () => {
    if (!selectedCalculation || !offsetSelectedProjectId) {
      alert("Selecciona un proyecto de compensación.");
      return;
    }

    try {
      await offsetMutation.mutateAsync({
        calculationId: selectedCalculation.id,
        projectId: offsetSelectedProjectId,
        beneficiaryName: beneficiaryInput || "Atlas Logistics Customer",
      });

      setShowOffsetModal(false);
      refetchSummary();
      refetchCalculations();
      refetchProjects();
      refetchCertificates();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert("Error en la compensación: " + message);
    }
  };

  const handleOpenOffsetForCalc = (calc: CarbonCalculation) => {
    setSelectedCalculation(calc);
    setBeneficiaryInput("Iberia Retail Group S.A.");
    setShowOffsetModal(true);
  };

  const handleSelectProjectForOffset = (projectId: string) => {
    setOffsetSelectedProjectId(projectId);
    if (calculations.length > 0 && !selectedCalculation) {
      setSelectedCalculation(calculations[0]);
    }
    setShowOffsetModal(true);
  };

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedCalculation,
    setSelectedCalculation,
    showOffsetModal,
    setShowOffsetModal,
    offsetSelectedProjectId,
    setOffsetSelectedProjectId,
    beneficiaryInput,
    setBeneficiaryInput,
    calcRefCode,
    setCalcRefCode,
    calcOriginCity,
    setCalcOriginCity,
    calcDestinationCity,
    setCalcDestinationCity,
    calcLegs,
    calcResult,
    greenAlternatives,
    summary,
    calculations,
    projects,
    certificates,
    calcDetails,
    handleRunCalculation,
    handleAddLeg,
    handleRemoveLeg,
    handleLegChange,
    handleConfirmOffset,
    handleOpenOffsetForCalc,
    handleSelectProjectForOffset,
  };
}
