/**
 * @file useTradeFinance.ts
 * @description Custom React hook managing Trade Finance instruments, UCP 600 / Gemini AI discrepancy audits, and bank fee calculations.
 * @module @atlas/frontend/components/TradeFinance/hooks/useTradeFinance
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { useState, useEffect, useMemo } from "react";
import { useApiQuery } from "../../../hooks/useApiQuery";
import {
  BankFeeCalculationResult,
  GeminiUcpAuditResult,
  TradeFinanceTabId,
  TradeInstrument,
  UcpValidationResult,
} from "../../../types/trade-finance.types";

export function formatInstrumentFilterLabel(filterKey: string): string {
  switch (filterKey) {
    case "ALL":
      return "Todos";
    case "COMMERCIAL_LC_CONFIRMED":
      return "L/C Confirmado";
    case "COMMERCIAL_LC_IRREVOCABLE":
      return "L/C Irrevocable";
    case "DEMAND_GUARANTEE_URDG758":
      return "Garantía URDG";
    default:
      return "Remesa D/P";
  }
}

export function useTradeFinance() {
  const [activeTab, setActiveTab] =
    useState<TradeFinanceTabId>("INSTRUMENTS_DOCS");
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstrument, setSelectedInstrument] =
    useState<TradeInstrument | null>(null);

  // Fee Simulator State
  const [simAmount, setSimAmount] = useState(250000);
  const [simCurrency, setSimCurrency] = useState("EUR");
  const [simTenorDays, setSimTenorDays] = useState(90);
  const [simOpeningRate, setSimOpeningRate] = useState(0.25);
  const [simConfirmRate, setSimConfirmRate] = useState(0.5);
  const [simDiscrepancyCount, setSimDiscrepancyCount] = useState(1);
  const [simAmendmentCount, setSimAmendmentCount] = useState(0);
  const [feeSimResult, setFeeSimResult] =
    useState<BankFeeCalculationResult | null>(null);

  // Discrepancy Audit State
  const [auditDateInput, setAuditDateInput] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [auditResult, setAuditResult] = useState<UcpValidationResult | null>(
    null,
  );
  const [isAuditing, setIsAuditing] = useState(false);

  // On-Demand Gemini AI UCP 600 Audit State
  const [isAuditingGeminiUcp, setIsAuditingGeminiUcp] = useState(false);
  const [geminiUcpAudit, setGeminiUcpAudit] =
    useState<GeminiUcpAuditResult | null>(null);

  const handleRunGeminiUcpAudit = async () => {
    setIsAuditingGeminiUcp(true);
    try {
      const res = await fetch("/api/ai/ucp600-lc-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instrumentId: selectedInstrument?.id,
          shipmentId: "sh_demo_01",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeminiUcpAudit(data);
      }
    } catch (err) {
      console.error("Failed to run Gemini UCP 600 audit:", err);
    } finally {
      setIsAuditingGeminiUcp(false);
    }
  };

  // Fetch Instruments
  const {
    data: instruments = [],
    isLoading: loadingInstruments,
    refetch: refetchInstruments,
  } = useApiQuery<TradeInstrument[]>(
    ["trade-instruments", activeTypeFilter, searchQuery],
    `/trade-finance/instruments?type=${activeTypeFilter}&q=${encodeURIComponent(
      searchQuery,
    )}`,
  );

  // Fetch Instrument Detail
  const { data: instrumentDetail } = useApiQuery<TradeInstrument>(
    ["trade-instrument-detail", selectedInstrument?.id],
    selectedInstrument?.id
      ? `/trade-finance/instruments/${selectedInstrument.id}`
      : "",
  );

  useEffect(() => {
    if (instruments.length > 0 && !selectedInstrument) {
      setSelectedInstrument(instruments[0]);
    }
  }, [instruments, selectedInstrument]);

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

  const handleRunFeeSim = async () => {
    try {
      const res = await fetch("/api/trade-finance/calculate-fees", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          creditAmount: Number(simAmount),
          currency: simCurrency,
          tenorDays: Number(simTenorDays),
          openingFeeRatePct: Number(simOpeningRate),
          confirmationFeeRatePct: Number(simConfirmRate),
          discrepanciesCount: Number(simDiscrepancyCount),
          amendmentsCount: Number(simAmendmentCount),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFeeSimResult(data.feeCalculation);
      }
    } catch (err) {
      console.error("Fee calculation error:", err);
    }
  };

  const handleRunUcpAudit = async () => {
    if (!selectedInstrument) return;
    setIsAuditing(true);
    try {
      const res = await fetch(
        `/api/trade-finance/instruments/${selectedInstrument.id}/validate-ucp`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            presentationDate: auditDateInput,
          }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        setAuditResult(data.auditResult);
        refetchInstruments();
      }
    } catch (err) {
      console.error("UCP Audit error:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  const stats = useMemo(() => {
    const totalFinancedVolume = instruments.reduce(
      (acc, inst) => acc + (inst.creditAmount || 0),
      0,
    );
    const compliantCount = instruments.filter(
      (i) => i.status === "ACCEPTED" || i.status === "DOCUMENTS_PRESENTED",
    ).length;
    const complianceRate =
      instruments.length > 0
        ? (compliantCount / instruments.length) * 100
        : 100;
    const urdgCount = instruments.filter(
      (i) => i.applicableRules === "URDG758",
    ).length;

    return {
      activeCount: instruments.length,
      totalFinancedVolume,
      complianceRate,
      urdgCount,
    };
  }, [instruments]);

  const currentInst = instrumentDetail || selectedInstrument;

  return {
    activeTab,
    setActiveTab,
    activeTypeFilter,
    setActiveTypeFilter,
    searchQuery,
    setSearchQuery,
    selectedInstrument,
    setSelectedInstrument,
    currentInst,
    instruments,
    loadingInstruments,
    simAmount,
    setSimAmount,
    simCurrency,
    setSimCurrency,
    simTenorDays,
    setSimTenorDays,
    simOpeningRate,
    setSimOpeningRate,
    simConfirmRate,
    setSimConfirmRate,
    simDiscrepancyCount,
    setSimDiscrepancyCount,
    simAmendmentCount,
    setSimAmendmentCount,
    feeSimResult,
    auditDateInput,
    setAuditDateInput,
    auditResult,
    isAuditing,
    isAuditingGeminiUcp,
    geminiUcpAudit,
    setGeminiUcpAudit,
    stats,
    handleRunGeminiUcpAudit,
    handleRunFeeSim,
    handleRunUcpAudit,
  };
}
