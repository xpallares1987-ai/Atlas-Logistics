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
  CbamCertificateLot,
  CbamDeclaration,
  CbamDeclarationStatus,
  CbamEexQuoteRecord,
  CbamEmissionsResult,
  CbamInstallation,
  CbamInventorySummary,
  CbamLiabilityResult,
  CbamSurrenderResult,
  CbamTabId,
} from "../../../types/cbam.types";

export function formatCbamStatusBadge(status: CbamDeclarationStatus | string): {
  label: string;
  className: string;
} {
  if (status === "CERTIFICATES_SURRENDERED") {
    return {
      label: "CERTIFICADOS ENTREGADOS",
      className: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
    };
  }
  if (status === "PENDING_SURRENDER") {
    return {
      label: "PENDIENTE ENTREGA",
      className: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    };
  }
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

  // Fetch Certificate Inventory & EEX Quotes (2026+ Definitive Regime)
  const DEFAULT_CERTIFICATE_LOTS: CbamCertificateLot[] = [
    {
      id: "lot-demo-01",
      lotReference: "LOT-2026-001",
      purchaseDate: "2026-09-01",
      ncaRegistryAccountId: "ES-CBAM-ACC-88319",
      quantityPurchased: 2500,
      quantitySurrendered: 1200,
      quantityAvailable: 1300,
      unitPriceEur: 84.5,
      totalCostEur: 211250.0,
      status: "ACTIVE",
    },
    {
      id: "lot-demo-02",
      lotReference: "LOT-2026-002",
      purchaseDate: "2026-10-01",
      ncaRegistryAccountId: "ES-CBAM-ACC-88319",
      quantityPurchased: 1500,
      quantitySurrendered: 0,
      quantityAvailable: 1500,
      unitPriceEur: 87.25,
      totalCostEur: 130875.0,
      status: "ACTIVE",
    },
  ];

  const DEFAULT_INVENTORY_SUMMARY: CbamInventorySummary = {
    totalPurchased: 4000,
    totalSurrendered: 1200,
    totalAvailable: 2800,
    totalValuationEur: 240750.0,
    activeLotsCount: 2,
  };

  const DEFAULT_EEX_QUOTES: CbamEexQuoteRecord[] = [
    {
      id: "eex-2026-W43",
      quoteWeek: "2026-W43",
      validFrom: "2026-10-19",
      validUntil: "2026-10-25",
      auctionAveragePriceEur: 88.5,
      scaledPrice: 88500000,
      source: "EEX_AUCTION",
    },
    {
      id: "eex-2026-W42",
      quoteWeek: "2026-W42",
      validFrom: "2026-10-12",
      validUntil: "2026-10-18",
      auctionAveragePriceEur: 87.25,
      scaledPrice: 87250000,
      source: "EEX_AUCTION",
    },
    {
      id: "eex-2026-W41",
      quoteWeek: "2026-W41",
      validFrom: "2026-10-05",
      validUntil: "2026-10-11",
      auctionAveragePriceEur: 85.5,
      scaledPrice: 85500000,
      source: "EEX_AUCTION",
    },
  ];

  const { data: inventoryData, refetch: refetchInventory } = useApiQuery<{
    summary: CbamInventorySummary;
    lots: CbamCertificateLot[];
  }>(["cbam-inventory"], "/cbam/certificates/inventory");

  const { data: rawEexQuotes = [] } = useApiQuery<CbamEexQuoteRecord[]>(
    ["cbam-eex-quotes"],
    "/cbam/eex/quotes",
  );

  const { data: rawActiveQuote } = useApiQuery<CbamEexQuoteRecord>(
    ["cbam-active-eex-quote"],
    "/cbam/eex/quotes/active",
  );

  const certificateLots = useMemo(() => {
    if (inventoryData?.lots && inventoryData.lots.length > 0) {
      return inventoryData.lots;
    }
    return DEFAULT_CERTIFICATE_LOTS;
  }, [inventoryData]);

  const inventorySummary = useMemo(() => {
    if (inventoryData?.summary) {
      return inventoryData.summary;
    }
    return DEFAULT_INVENTORY_SUMMARY;
  }, [inventoryData]);

  const eexQuotes = useMemo(() => {
    if (rawEexQuotes && rawEexQuotes.length > 0) {
      return rawEexQuotes;
    }
    return DEFAULT_EEX_QUOTES;
  }, [rawEexQuotes]);

  const activeEexQuote = useMemo(() => {
    if (rawActiveQuote) return rawActiveQuote;
    return eexQuotes[0] || DEFAULT_EEX_QUOTES[0];
  }, [rawActiveQuote, eexQuotes]);

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

  const downloadXmlBlob = (filename: string, xmlString: string) => {
    if (typeof window === "undefined") return;
    const blob = new Blob([xmlString], {
      type: "application/xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePurchaseLot = async (params: {
    lotReference: string;
    purchaseDate: string;
    ncaRegistryAccountId: string;
    quantityPurchased: number;
    unitPriceEur: number;
    generatePaymentOrder: boolean;
    debtorName: string;
    debtorIban: string;
    debtorBic: string;
  }) => {
    try {
      const res = await fetch("/api/cbam/certificates/lots", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          lotReference: params.lotReference,
          purchaseDate: params.purchaseDate,
          ncaRegistryAccountId: params.ncaRegistryAccountId,
          quantityPurchased: params.quantityPurchased,
          unitPriceEur: params.unitPriceEur,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.message || "Error al registrar lote en el servidor",
        );
      }

      const lot = await res.json();

      if (params.generatePaymentOrder && lot.id) {
        const pmtRes = await fetch(
          `/api/cbam/certificates/lots/${lot.id}/payment-order`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              debtorName: params.debtorName,
              debtorIban: params.debtorIban,
              debtorBic: params.debtorBic,
            }),
          },
        );
        if (pmtRes.ok) {
          const pmtData = await pmtRes.json();
          if (pmtData.xml) {
            downloadXmlBlob(
              `pain_001_CBAM_${params.lotReference}.xml`,
              pmtData.xml,
            );
          }
        }
      }

      refetchInventory();
    } catch (err: unknown) {
      console.error("Purchase lot error:", err);
      throw err;
    }
  };

  const handleDownloadPaymentOrder = async (lotId: string) => {
    try {
      const res = await fetch(
        `/api/cbam/certificates/lots/${lotId}/payment-order`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            debtorName: "Atlas Forwarding Customs SL",
            debtorIban: "ES9121000418450200051332",
            debtorBic: "CAIXESBBXXX",
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.xml) {
          downloadXmlBlob(`pain_001_CBAM_${lotId}.xml`, data.xml);
        }
      }
    } catch (err) {
      console.error("Download payment order error:", err);
    }
  };

  const handleDownloadSurrenderPaymentOrder = async (params: {
    surrenderId: string;
    surrenderReference: string;
    debtorName?: string;
    debtorIban?: string;
    debtorBic?: string;
  }) => {
    try {
      const res = await fetch(
        `/api/cbam/certificates/surrenders/${params.surrenderId}/payment-order`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            debtorName: params.debtorName || "Atlas Forwarding Customs SL",
            debtorIban: params.debtorIban || "ES9121000418450200051332",
            debtorBic: params.debtorBic || "CAIXESBBXXX",
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        if (data.xml) {
          downloadXmlBlob(
            `pain_001_CBAM_SURRENDER_${params.surrenderReference}.xml`,
            data.xml,
          );
        }
      }
    } catch (err) {
      console.error("Download surrender payment order error:", err);
    }
  };

  const handleSurrenderCertificates = async (params: {
    declarationId: string;
    verifierName: string;
    verifierAccreditationNumber: string;
    verificationReportId: string;
  }): Promise<CbamSurrenderResult> => {
    try {
      const res = await fetch(
        `/api/cbam/declarations/${params.declarationId}/surrender`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            verifierName: params.verifierName,
            verifierAccreditationNumber: params.verifierAccreditationNumber,
            verificationReportId: params.verificationReportId,
          }),
        },
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error ||
            errJson.message ||
            "Fallo en la liquidación de certificados",
        );
      }

      const json = await res.json();
      refetchDeclarations();
      refetchInventory();
      return json.result as CbamSurrenderResult;
    } catch (err: unknown) {
      console.error("Surrender error:", err);
      throw err;
    }
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
    certificateLots,
    inventorySummary,
    eexQuotes,
    activeEexQuote,
    handlePurchaseLot,
    handleDownloadPaymentOrder,
    handleDownloadSurrenderPaymentOrder,
    handleSurrenderCertificates,
    handleRunEmissionsCalc,
    handleRunLiabilityCalc,
    handleSaveStatus,
    openStatusModal,
  };
}
