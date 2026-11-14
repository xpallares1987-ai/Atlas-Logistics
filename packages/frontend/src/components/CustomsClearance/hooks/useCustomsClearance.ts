/**
 * @file useCustomsClearance.ts
 * @description State management and API integration hook for customs declarations and TARIC calculations.
 * @module @atlas/frontend/components/CustomsClearance/hooks
 */

import { useState, useMemo } from "react";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import {
  CustomsDeclaration,
  DeclarationFilter,
  StatusVisuals,
  TariffCalcParams,
  TariffCalcResult,
} from "../types/index";

export function getStatusVisuals(status: string): StatusVisuals {
  switch (status) {
    case "Green Channel":
    case "Cleared":
      return {
        icon: CheckCircle2,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
        label: "Canal Verde (Levante Inmediato)",
      };
    case "Red Channel":
    case "Hold":
      return {
        icon: AlertCircle,
        color: "text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
        glow: "shadow-[0_0_15px_rgba(244,63,94,0.15)]",
        label: "Canal Rojo (Inspección Física)",
      };
    case "Orange Channel":
    case "Pending":
    default:
      return {
        icon: Clock,
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        glow: "shadow-[0_0_15px_rgba(245,158,11,0.15)]",
        label: "Canal Naranja (Control Documental)",
      };
  }
}

export function useCustomsClearance() {
  const queryClient = useQueryClient();
  const { data: customsData, isLoading } = useApiQuery<CustomsDeclaration[]>(
    ["customs"],
    "/customs-declarations",
  );
  const declarations = Array.isArray(customsData) ? customsData : [];

  const [activeFilter, setActiveFilter] = useState<DeclarationFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDecl, setSelectedDecl] = useState<CustomsDeclaration | null>(
    null,
  );
  const [isAuditing, setIsAuditing] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);

  // Live Tariff Calculator State
  const [calcParams, setCalcParams] = useState<TariffCalcParams>({
    hsCode: "8504.40.90.90",
    fobValue: 25000,
    freightCost: 1800,
    insuranceCost: 200,
    grossWeightKg: 1200,
    originCountry: "CN",
    hasPreferentialOriginCert: false,
  });
  const [calcResult, setCalcResult] = useState<TariffCalcResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const filteredDeclarations = useMemo(() => {
    return declarations.filter((dec) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (dec.blNumber && dec.blNumber.toLowerCase().includes(q)) ||
        (dec.duaNumber && dec.duaNumber.toLowerCase().includes(q)) ||
        (dec.hsCode && dec.hsCode.toLowerCase().includes(q)) ||
        dec.id.toLowerCase().includes(q);

      const matchesFilter =
        activeFilter === "All"
          ? true
          : activeFilter === "Hold"
            ? dec.status === "Red Channel" || dec.status === "Hold"
            : activeFilter === "Pending"
              ? dec.status === "Pending" || dec.status === "Orange Channel"
              : activeFilter === "Cleared"
                ? dec.status === "Green Channel" || dec.status === "Cleared"
                : true;
      return matchesSearch && matchesFilter;
    });
  }, [declarations, searchQuery, activeFilter]);

  // Set initial selected declaration
  useMemo(() => {
    if (!selectedDecl && filteredDeclarations.length > 0) {
      setSelectedDecl(filteredDeclarations[0]);
    } else if (
      selectedDecl &&
      !filteredDeclarations.some((d) => d.id === selectedDecl.id)
    ) {
      if (filteredDeclarations.length > 0) {
        setSelectedDecl(filteredDeclarations[0]);
      } else {
        setSelectedDecl(null);
      }
    }
  }, [filteredDeclarations, selectedDecl]);

  const holds = declarations.filter(
    (d) => d.status === "Red Channel" || d.status === "Hold",
  );
  const greens = declarations.filter(
    (d) => d.status === "Green Channel" || d.status === "Cleared",
  );
  const oranges = declarations.filter(
    (d) => d.status === "Orange Channel" || d.status === "Pending",
  );

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

  const runComplianceAudit = async (id: string) => {
    try {
      setIsAuditing(true);
      const res = await fetch(`/api/customs-declarations/${id}/analyze`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["customs"] });
      }
    } catch (err) {
      console.error("Audit error:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCalculateTariff = async () => {
    try {
      setIsCalculating(true);
      const res = await fetch("/api/customs-declarations/calculate-tariff", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          hsCode: calcParams.hsCode,
          fobValue: Number(calcParams.fobValue),
          freightCost: Number(calcParams.freightCost),
          insuranceCost: Number(calcParams.insuranceCost),
          grossWeightKg: Number(calcParams.grossWeightKg),
          originCountry: calcParams.originCountry,
          hasPreferentialOriginCert: calcParams.hasPreferentialOriginCert,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCalcResult(data);
      }
    } catch (err) {
      console.error("Calculation error:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCreateNewDeclaration = async () => {
    try {
      const customsVal =
        Number(calcParams.fobValue) +
        Number(calcParams.freightCost) +
        Number(calcParams.insuranceCost);
      const res = await fetch("/api/customs-declarations", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          shipmentId: `shp-${Date.now().toString(36)}`,
          hsCode: calcParams.hsCode,
          type: "Import",
          customsValue: customsVal,
          originCountry: calcParams.originCountry,
          destinationCountry: "ES",
          eoriNumber: "ESB88492019",
          consigneeName: "Iberica Import Logistics SL",
          exporterName: "Global Trade Logistics Ltd",
          grossWeightKg: Number(calcParams.grossWeightKg),
          hasPreferentialOriginCert: calcParams.hasPreferentialOriginCert,
          attachedDocumentTypes: ["DOC-INV", "DOC-HBL", "DOC-PKL"],
        }),
      });

      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["customs"] });
        setShowCalculatorModal(false);
      }
    } catch (err) {
      console.error("Create declaration error:", err);
    }
  };

  return {
    declarations,
    isLoading,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    selectedDecl,
    setSelectedDecl,
    filteredDeclarations,
    holds,
    greens,
    oranges,
    isAuditing,
    showCalculatorModal,
    setShowCalculatorModal,
    calcParams,
    setCalcParams,
    calcResult,
    setCalcResult,
    isCalculating,
    runComplianceAudit,
    handleCalculateTariff,
    handleCreateNewDeclaration,
  };
}
