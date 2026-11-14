/**
 * @file useIncotermsContracts.ts
 * @description Hook managing Incoterms 2020 rules, commercial contracts, and simulator validations.
 * @module @atlas/frontend/components/IncotermsContracts/hooks
 */

import { useState, useEffect } from "react";
import { useApiQuery } from "../../../hooks/useApiQuery";
import {
  IncotermsTabKey,
  IncotermRule,
  CommercialContract,
} from "../types/index";

export function useIncotermsContracts() {
  const [activeTab, setActiveTab] = useState<IncotermsTabKey>("CONTRACTS");
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContract, setSelectedContract] =
    useState<CommercialContract | null>(null);

  // Simulator Modal State
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [simIncoterm, setSimIncoterm] = useState("CIP");
  const [simMode, setSimMode] = useState("AIR");
  const [simContainerized, setSimContainerized] = useState(false);
  const [simGoodsValue, setSimGoodsValue] = useState(150000);
  const [simFreight, setSimFreight] = useState(3800);
  const [simInsurance, setSimInsurance] = useState(338);
  const [simPreCarriage, setSimPreCarriage] = useState(450);
  const [simExportCosts, setSimExportCosts] = useState(120);
  const [simImportDuty, setSimImportDuty] = useState(0);
  const [simImportVat, setSimImportVat] = useState(0);
  const [simDestTransport, setSimDestTransport] = useState(0);
  const [simModeResult, setSimModeResult] = useState<any>(null);
  const [simInsResult, setSimInsResult] = useState<any>(null);
  const [simCustomsResult, setSimCustomsResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch Incoterms Rules
  const { data: rulesData } = useApiQuery<any>(
    ["incoterm-rules"],
    "/incoterms/rules",
  );
  const incotermRules: IncotermRule[] = rulesData?.rules || [];

  // Fetch Commercial Contracts
  const { data: contracts = [], isLoading } = useApiQuery<CommercialContract[]>(
    ["commercial-contracts", activeFilter, searchQuery],
    `/incoterms/contracts?incoterm=${activeFilter}&q=${encodeURIComponent(searchQuery)}`,
  );

  // Auto-select first contract
  useEffect(() => {
    if (contracts.length > 0 && !selectedContract) {
      setSelectedContract(contracts[0]);
    }
  }, [contracts, selectedContract]);

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

      // 1. Mode validation
      const modeRes = await fetch("/api/incoterms/validate-mode", {
        method: "POST",
        headers,
        body: JSON.stringify({
          incotermCode: simIncoterm,
          transportMode: simMode,
          isContainerized: simContainerized,
        }),
      });
      if (modeRes.ok) {
        const modeData = await modeRes.json();
        setSimModeResult(modeData.validation);
      }

      // 2. Insurance calculation
      const insRes = await fetch("/api/incoterms/calculate-insurance", {
        method: "POST",
        headers,
        body: JSON.stringify({
          incotermCode: simIncoterm,
          goodsValue: Number(simGoodsValue),
          freightCost: Number(simFreight),
          currency: "EUR",
        }),
      });
      if (insRes.ok) {
        const insData = await insRes.json();
        setSimInsResult(insData.insurance);
      }

      // 3. Customs Normalization
      const custRes = await fetch("/api/incoterms/normalize-customs-value", {
        method: "POST",
        headers,
        body: JSON.stringify({
          incotermCode: simIncoterm,
          invoiceValue: Number(simGoodsValue),
          preCarriageCost: Number(simPreCarriage),
          exportFormalitiesCost: Number(simExportCosts),
          internationalFreightCost: Number(simFreight),
          insuranceCost: Number(simInsurance),
          destinationHandlingCost: Number(simDestTransport),
          importDutyCost: Number(simImportDuty),
          importVatCost: Number(simImportVat),
        }),
      });
      if (custRes.ok) {
        const custData = await custRes.json();
        setSimCustomsResult(custData.normalization);
      }
    } catch (err) {
      console.error("Incoterms simulator error:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  // KPIs
  const totalContracts = contracts.length;
  const totalContractValue = contracts.reduce(
    (acc, c) => acc + (c.goodsValue || 0),
    0,
  );
  const multimodalCount = contracts.filter(
    (c) => c.transportMode !== "OCEAN",
  ).length;
  const activeCount = contracts.filter((c) => c.status === "ACTIVE").length;

  return {
    activeTab,
    setActiveTab,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    selectedContract,
    setSelectedContract,
    contracts,
    isLoading,
    incotermRules,
    totalContracts,
    totalContractValue,
    multimodalCount,
    activeCount,
    // Simulator
    showSimulatorModal,
    setShowSimulatorModal,
    simIncoterm,
    setSimIncoterm,
    simMode,
    setSimMode,
    simContainerized,
    setSimContainerized,
    simGoodsValue,
    setSimGoodsValue,
    simFreight,
    setSimFreight,
    simInsurance,
    setSimInsurance,
    simPreCarriage,
    setSimPreCarriage,
    simExportCosts,
    setSimExportCosts,
    simImportDuty,
    setSimImportDuty,
    simImportVat,
    setSimImportVat,
    simDestTransport,
    setSimDestTransport,
    simModeResult,
    simInsResult,
    simCustomsResult,
    isCalculating,
    calculateSimulator,
  };
}
