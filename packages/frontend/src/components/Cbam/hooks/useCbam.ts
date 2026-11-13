/**
 * @file useCbam.ts
 * @description Custom React hook managing CBAM declarations, embedded emissions calculator, and EU ETS Article 9 liability simulator.
 * @module @atlas/frontend/components/Cbam/hooks/useCbam
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { useState, useEffect, useMemo } from "react";
import { useApiQuery } from "../../../hooks/useApiQuery";
import {
  CbamCatalogItem,
  CbamDeclaration,
  CbamDeclarationStatus,
  CbamEmissionsResult,
  CbamInstallation,
  CbamLiabilityResult,
  CbamTabId,
} from "../../../types/cbam.types";

export function formatCbamStatusBadge(status: CbamDeclarationStatus | string): {
  label: string;
  className: string;
} {
  if (status === "SUBMITTED_REGISTRY") {
    return {
      label: "REGISTRADO UE",
      className:
        "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    };
  }
  if (status === "VALIDATED") {
    return {
      label: "VALIDADO",
      className: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    };
  }
  return {
    label: status,
    className: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  };
}

export function useCbam() {
  const [activeTab, setActiveTab] = useState<CbamTabId>("DECLARATIONS");
  const [activePeriodFilter, setActivePeriodFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeclaration, setSelectedDeclaration] =
    useState<CbamDeclaration | null>(null);

  // Emissions Simulator State
  const [calcNetWeight, setCalcNetWeight] = useState(1000.0);
  const [calcDirectFactor, setCalcDirectFactor] = useState(1.85);
  const [calcIndirectFactor, setCalcIndirectFactor] = useState(0.42);
  const [calcEuDefaultDirect, setCalcEuDefaultDirect] = useState(2.15);
  const [calcEuDefaultIndirect, setCalcEuDefaultIndirect] = useState(0.55);
  const [emissionsResult, setEmissionsResult] =
    useState<CbamEmissionsResult | null>(null);

  // Financial ETS Simulator State
  const [simEmissionsTotal, setSimEmissionsTotal] = useState(5000.0);
  const [simEtsPrice, setSimEtsPrice] = useState(85.5);
  const [simForeignPricePaid, setSimForeignPricePaid] = useState(75000.0);
  const [liabilityResult, setLiabilityResult] =
    useState<CbamLiabilityResult | null>(null);

  // Status Change Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusInput, setStatusInput] =
    useState<CbamDeclarationStatus>("SUBMITTED_REGISTRY");
  const [remarksInput, setRemarksInput] = useState("");

  // Fetch Declarations
  const {
    data: declarations = [],
    isLoading: loadingDeclarations,
    refetch: refetchDeclarations,
  } = useApiQuery<CbamDeclaration[]>(
    ["cbam-declarations", activePeriodFilter, searchQuery],
    `/cbam/declarations?period=${activePeriodFilter}&q=${encodeURIComponent(
      searchQuery,
    )}`,
  );

  // Fetch Goods Catalog
  const { data: catalog = [] } = useApiQuery<CbamCatalogItem[]>(
    ["cbam-catalog"],
    "/cbam/catalog",
  );

  // Fetch Verified Installations
  const { data: installations = [] } = useApiQuery<CbamInstallation[]>(
    ["cbam-installations"],
    "/cbam/installations",
  );

  // Fetch Selected Declaration Details
  const { data: declarationDetails } = useApiQuery<CbamDeclaration>(
    ["cbam-declaration-details", selectedDeclaration?.id],
    selectedDeclaration?.id
      ? `/cbam/declarations/${selectedDeclaration.id}`
      : "",
  );

  useEffect(() => {
    if (declarations.length > 0 && !selectedDeclaration) {
      setSelectedDeclaration(declarations[0]);
    }
  }, [declarations, selectedDeclaration]);

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

  const handleRunEmissionsCalc = async () => {
    try {
      const res = await fetch("/api/cbam/calculate-emissions", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          netWeightTonnes: Number(calcNetWeight),
          directEmissionFactor: Number(calcDirectFactor),
          indirectEmissionFactor: Number(calcIndirectFactor),
          euDefaultDirectFactor: Number(calcEuDefaultDirect),
          euDefaultIndirectFactor: Number(calcEuDefaultIndirect),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmissionsResult(data.result);
      }
    } catch (err) {
      console.error("Emissions calculation error:", err);
    }
  };

  const handleRunLiabilityCalc = async () => {
    try {
      const res = await fetch("/api/cbam/calculate-liability", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          totalEmbeddedEmissionsTco2e: Number(simEmissionsTotal),
          euEtsBenchmarkPriceEur: Number(simEtsPrice),
          foreignCarbonPricePaidEur: Number(simForeignPricePaid),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLiabilityResult(data.result);
      }
    } catch (err) {
      console.error("Liability calculation error:", err);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedDeclaration) return;
    try {
      const res = await fetch(
        `/api/cbam/declarations/${selectedDeclaration.id}/status`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            status: statusInput,
            remarks:
              remarksInput ||
              "Estado actualizado conforme al Registro Transitorio de la Comisión Europea.",
          }),
        },
      );
      if (res.ok) {
        setShowStatusModal(false);
        refetchDeclarations();
      }
    } catch (err) {
      console.error("Error updating declaration status:", err);
    }
  };

  const openStatusModal = (declaration: CbamDeclaration) => {
    setStatusInput(declaration.status || "VALIDATED");
    setRemarksInput(declaration.remarks || "");
    setShowStatusModal(true);
  };

  const stats = useMemo(() => {
    const totalNetMassSum = declarations.reduce(
      (acc, d) => acc + (d.totalNetMassTonnes || 0),
      0,
    );
    const totalDirectEmissionsSum = declarations.reduce(
      (acc, d) => acc + (d.totalDirectEmissionsTco2e || 0),
      0,
    );
    const totalIndirectEmissionsSum = declarations.reduce(
      (acc, d) => acc + (d.totalIndirectEmissionsTco2e || 0),
      0,
    );
    const totalNetLiabilitySum = declarations.reduce(
      (acc, d) => acc + (d.netCarbonLiabilityEur || 0),
      0,
    );
    return {
      totalNetMassSum,
      totalDirectEmissionsSum,
      totalIndirectEmissionsSum,
      totalNetLiabilitySum,
    };
  }, [declarations]);

  const currentDeclaration = declarationDetails || selectedDeclaration;

  return {
    activeTab,
    setActiveTab,
    activePeriodFilter,
    setActivePeriodFilter,
    searchQuery,
    setSearchQuery,
    selectedDeclaration,
    setSelectedDeclaration,
    currentDeclaration,
    declarations,
    loadingDeclarations,
    catalog,
    installations,
    calcNetWeight,
    setCalcNetWeight,
    calcDirectFactor,
    setCalcDirectFactor,
    calcIndirectFactor,
    setCalcIndirectFactor,
    calcEuDefaultDirect,
    setCalcEuDefaultDirect,
    calcEuDefaultIndirect,
    setCalcEuDefaultIndirect,
    emissionsResult,
    simEmissionsTotal,
    setSimEmissionsTotal,
    simEtsPrice,
    setSimEtsPrice,
    simForeignPricePaid,
    setSimForeignPricePaid,
    liabilityResult,
    showStatusModal,
    setShowStatusModal,
    statusInput,
    setStatusInput,
    remarksInput,
    setRemarksInput,
    stats,
    handleRunEmissionsCalc,
    handleRunLiabilityCalc,
    handleSaveStatus,
    openStatusModal,
  };
}
