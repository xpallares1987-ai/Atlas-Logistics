/**
 * @file useCarbonEmissions.ts
 * @description Custom domain hook and formatting helpers for Scope 3 Carbon Footprint (ISO 14083 & GLEC v3).
 * @module @atlas/frontend/components/CarbonEmissions/hooks
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { useState } from "react";
import { useApiMutation, useApiQuery } from "../../../hooks/useApiQuery";
import type {
  CarbonTab,
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
  const [selectedCalculation, setSelectedCalculation] = useState<any>(null);

  // Offset Purchase Modal State
  const [showOffsetModal, setShowOffsetModal] = useState(false);
  const [offsetSelectedProjectId, setOffsetSelectedProjectId] =
    useState<string>("");
  const [beneficiaryInput, setBeneficiaryInput] = useState("");

  // Calculator State
  const [calcRefCode, setCalcRefCode] = useState(
    "SIM-" + Math.floor(1000 + Math.random() * 9000),
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
  const [calcResult, setCalcResult] = useState<any>(null);
  const [greenAlternatives, setGreenAlternatives] = useState<any[]>([]);

  // 1. Fetch Summary KPIs
  const { data: summary, refetch: refetchSummary } = useApiQuery<any>(
    ["carbon-summary"],
    "/carbon/summary",
  );

  // 2. Fetch Calculations List
  const { data: calculations = [], refetch: refetchCalculations } = useApiQuery<
    any[]
  >(
    ["carbon-calculations", searchQuery],
    `/carbon/calculations?q=${encodeURIComponent(searchQuery)}`,
  );

  // 3. Fetch Projects Catalog
  const { data: projects = [], refetch: refetchProjects } = useApiQuery<any[]>(
    ["carbon-projects"],
    "/carbon/projects",
  );

  // 4. Fetch Certificates List
  const { data: certificates = [], refetch: refetchCertificates } = useApiQuery<
    any[]
  >(["carbon-certificates"], "/carbon/certificates");

  // 5. Fetch Calculation Details
  const { data: calcDetails } = useApiQuery<any>(
    ["carbon-calculation-details", selectedCalculation?.id],
    selectedCalculation?.id
      ? `/carbon/calculations/${selectedCalculation.id}`
      : "",
  );

  // Mutations
  const calculateMutation = useApiMutation<any, any>(
    "/carbon/calculate",
    "POST",
  );
  const compareMutation = useApiMutation<any, any>(
    "/carbon/compare-green-route",
    "POST",
  );
  const offsetMutation = useApiMutation<any, any>("/carbon/offset", "POST");

  const handleRunCalculation = async () => {
    try {
      const payload = {
        referenceCode: calcRefCode,
        originCity: calcOriginCity,
        destinationCity: calcDestinationCity,
        legs: calcLegs,
      };
      const res: any = await calculateMutation.mutateAsync(payload);
      setCalcResult(res.journey);

      const altRes: any = await compareMutation.mutateAsync({ legs: calcLegs });
      setGreenAlternatives(altRes.alternatives || []);

      refetchSummary();
      refetchCalculations();
    } catch (err: any) {
      alert("Error al calcular huella: " + err.message);
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
    value: any,
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
    } catch (err: any) {
      alert("Error en la compensación: " + err.message);
    }
  };

  const handleOpenOffsetForCalc = (calc: any) => {
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
