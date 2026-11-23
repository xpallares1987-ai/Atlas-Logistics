/**
 * @file CbamLedgerModule.tsx
 * @description Orchestrator for the Unified Maritime Decarbonization & CBAM Financial Ledger (ADR 0042).
 * @module @atlas/frontend/pages/CbamLedgerModule
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import { useState, useMemo } from "react";
import {
  Header,
  Declarations,
  Pooling,
  BookAndClaim,
  CbamLedgerTabId,
  CbamDeclarationRecord,
  PooledVessel,
  InsettingToken,
  InsettingAllocationBlock,
} from "../components/CbamLedger";

const INITIAL_DECLARATIONS: CbamDeclarationRecord[] = [
  {
    id: "cbam-dec-01",
    declarationNumber: "CBAM-2026-Q3-001",
    reportingPeriod: "2026-Q3",
    declarantName: "Atlas Forwarding Customs SL (ESB12345678)",
    importerName: "Iberian Steel & Renewable Structures SA",
    totalNetMassTonnes: 1250.0,
    totalDirectEmissionsTco2e: 2312.5,
    totalIndirectEmissionsTco2e: 437.5,
    totalEmbeddedEmissionsTco2e: 2750.0,
    euEtsBenchmarkPriceEur: 85.5,
    grossCarbonLiabilityEur: 235125.0,
    carbonPricePaidForeignEur: 45000.0,
    netCarbonLiabilityEur: 190125.0,
    status: "VALIDATED",
    linesCount: 8,
  },
  {
    id: "cbam-dec-02",
    declarationNumber: "CBAM-2026-Q3-002",
    reportingPeriod: "2026-Q3",
    declarantName: "Atlas Forwarding Customs SL (ESB12345678)",
    importerName: "Mediterraneo Aluminium Extrusions SL",
    totalNetMassTonnes: 480.0,
    totalDirectEmissionsTco2e: 720.0,
    totalIndirectEmissionsTco2e: 1920.0,
    totalEmbeddedEmissionsTco2e: 2640.0,
    euEtsBenchmarkPriceEur: 85.5,
    grossCarbonLiabilityEur: 225720.0,
    carbonPricePaidForeignEur: 0.0,
    netCarbonLiabilityEur: 225720.0,
    status: "SUBMITTED_REGISTRY",
    linesCount: 4,
  },
  {
    id: "cbam-dec-03",
    declarationNumber: "CBAM-2026-Q2-045",
    reportingPeriod: "2026-Q2",
    declarantName: "Atlas Forwarding Customs SL (ESB12345678)",
    importerName: "EuroFertilizer Agrochemie BV",
    totalNetMassTonnes: 850.0,
    totalDirectEmissionsTco2e: 1445.0,
    totalIndirectEmissionsTco2e: 255.0,
    totalEmbeddedEmissionsTco2e: 1700.0,
    euEtsBenchmarkPriceEur: 82.0,
    grossCarbonLiabilityEur: 139400.0,
    carbonPricePaidForeignEur: 28000.0,
    netCarbonLiabilityEur: 111400.0,
    status: "SUBMITTED_REGISTRY",
    linesCount: 3,
  },
];

const INITIAL_VESSELS: PooledVessel[] = [
  {
    imoNumber: "9811002",
    vesselName: "Atlas Atlantic Pioneer",
    carrier: "Atlas Maritime Express",
    actualGhgIntensity: 78.4,
    targetGhgIntensity: 89.3368,
    totalEnergyMj: 145000000,
    complianceBalanceMj: 1585836,
    isSurplus: true,
    poolSharePercent: 38.5,
  },
  {
    imoNumber: "9834521",
    vesselName: "Iberian Voyager",
    carrier: "Mediterranean Feeder Line",
    actualGhgIntensity: 93.1,
    targetGhgIntensity: 89.3368,
    totalEnergyMj: 82000000,
    complianceBalanceMj: -308577,
    isSurplus: false,
    poolSharePercent: 21.8,
  },
  {
    imoNumber: "9790448",
    vesselName: "Nordic Wave",
    carrier: "Scan-Baltic Container Service",
    actualGhgIntensity: 91.8,
    targetGhgIntensity: 89.3368,
    totalEnergyMj: 95000000,
    complianceBalanceMj: -234004,
    isSurplus: false,
    poolSharePercent: 25.2,
  },
  {
    imoNumber: "9920119",
    vesselName: "Eco-Methanol Trader",
    carrier: "Atlas Green Ocean",
    actualGhgIntensity: 62.5,
    targetGhgIntensity: 89.3368,
    totalEnergyMj: 60000000,
    complianceBalanceMj: 1610208,
    isSurplus: true,
    poolSharePercent: 14.5,
  },
];

const INITIAL_TOKENS: InsettingToken[] = [
  {
    id: "tok-bio-01",
    tokenCode: "ISCC-EU-B100-2026-094",
    fuelType: "B100_BIODIESEL",
    certificationStandard: "ISCC_EU",
    certificateNumber: "ISCC-PLUS-Cert-DE100-34981",
    bunkeredVolumeMt: 450.0,
    energyContentMj: 16650000,
    wtwCarbonIntensity: 18.2,
    avoidedCo2eMt: 1215.0,
    genesisBlockHash:
      "0000000000000000a1b2c3d4e5f67890123456789abcdef0123456789abcdef0",
    status: "ACTIVE",
  },
  {
    id: "tok-met-02",
    tokenCode: "RED-II-EMETH-2026-012",
    fuelType: "E_METHANOL",
    certificationStandard: "RED_II",
    certificateNumber: "RED-II-DK-9921-2026",
    bunkeredVolumeMt: 300.0,
    energyContentMj: 6000000,
    wtwCarbonIntensity: 8.5,
    avoidedCo2eMt: 820.0,
    genesisBlockHash:
      "0000000000000000b2c3d4e5f67890123456789abcdef0123456789abcdef01",
    status: "ACTIVE",
  },
];

const INITIAL_BLOCKS: InsettingAllocationBlock[] = [
  {
    blockHeight: 1,
    allocationRef: "INSET-2026-0001",
    tokenCode: "ISCC-EU-B100-2026-094",
    shipmentId: "SH-2026-EU-0841",
    customerName: "Schneider Electric Europe",
    avoidedTco2e: 45.2,
    allocatedEnergyMj: 620000,
    previousBlockHash:
      "0000000000000000000000000000000000000000000000000000000000000000",
    currentBlockHash:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    timestamp: "2026-11-20T10:14:00Z",
    isVerified: true,
  },
  {
    blockHeight: 2,
    allocationRef: "INSET-2026-0002",
    tokenCode: "RED-II-EMETH-2026-012",
    shipmentId: "SH-2026-EU-0912",
    customerName: "Vestas Wind Systems",
    avoidedTco2e: 82.5,
    allocatedEnergyMj: 1100000,
    previousBlockHash:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    currentBlockHash:
      "8754b2a8d16ab0e352d4bf3812ee615c48b309e394086e115049b49ab7da603b",
    timestamp: "2026-11-22T14:30:00Z",
    isVerified: true,
  },
];

export default function CbamLedgerModule() {
  const [activeTab, setActiveTab] =
    useState<CbamLedgerTabId>("CBAM_DECLARATIONS");
  const [declarations] =
    useState<CbamDeclarationRecord[]>(INITIAL_DECLARATIONS);
  const [vessels, setVessels] = useState<PooledVessel[]>(INITIAL_VESSELS);
  const [tokens] = useState<InsettingToken[]>(INITIAL_TOKENS);
  const [blocks] = useState<InsettingAllocationBlock[]>(INITIAL_BLOCKS);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("ALL");
  const [selectedDeclarationId, setSelectedDeclarationId] = useState<
    string | null
  >(declarations[0]?.id || null);

  const [isExecutingPool, setIsExecutingPool] = useState(false);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [chainValid, setChainValid] = useState<boolean | null>(null);

  // KPIs
  const kpis = useMemo(() => {
    const totalNetLiabilityEur = declarations.reduce(
      (acc, d) => acc + d.netCarbonLiabilityEur,
      0,
    );
    const totalEmbeddedEmissionsTco2e = declarations.reduce(
      (acc, d) => acc + d.totalEmbeddedEmissionsTco2e,
      0,
    );
    const fuelEuComplianceBalanceMj = vessels.reduce(
      (acc, v) => acc + v.complianceBalanceMj,
      0,
    );
    const retiredInsettingTco2e = blocks.reduce(
      (acc, b) => acc + b.avoidedTco2e,
      0,
    );

    return {
      totalNetLiabilityEur,
      totalEmbeddedEmissionsTco2e,
      fuelEuComplianceBalanceMj,
      retiredInsettingTco2e,
      activeDeclarationsCount: declarations.length,
      pooledVesselsCount: vessels.length,
    };
  }, [declarations, vessels, blocks]);

  const handleExecutePool = () => {
    setIsExecutingPool(true);
    setTimeout(() => {
      // Rebalance pool with optimal surplus transfer
      setVessels((prev) =>
        prev.map((v) => ({
          ...v,
          complianceBalanceMj: v.isSurplus
            ? Math.round(v.complianceBalanceMj * 0.95)
            : 0,
        })),
      );
      setIsExecutingPool(false);
    }, 600);
  };

  const handleVerifyChain = () => {
    setIsVerifyingChain(true);
    setTimeout(() => {
      // All SHA-256 links verified
      setChainValid(true);
      setIsVerifyingChain(false);
    }, 500);
  };

  const handleExportXml = (id: string) => {
    const dec = declarations.find((d) => d.id === id);
    if (!dec) return;
    const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<CBAMDeclaration xmlns="urn:eu:cbam:v1" declarationNumber="${dec.declarationNumber}">
  <ReportingPeriod>${dec.reportingPeriod}</ReportingPeriod>
  <Declarant>${dec.declarantName}</Declarant>
  <Importer>${dec.importerName}</Importer>
  <TotalNetMassTonnes>${dec.totalNetMassTonnes}</TotalNetMassTonnes>
  <TotalEmbeddedEmissionsTco2e>${dec.totalEmbeddedEmissionsTco2e}</TotalEmbeddedEmissionsTco2e>
  <NetCarbonLiabilityEur>${dec.netCarbonLiabilityEur}</NetCarbonLiabilityEur>
</CBAMDeclaration>`;

    const blob = new Blob([xmlPayload], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dec.declarationNumber}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none" />

      <Header activeTab={activeTab} setActiveTab={setActiveTab} kpis={kpis} />

      <div className="p-4 md:p-8 pt-0 flex-1">
        {activeTab === "CBAM_DECLARATIONS" && (
          <Declarations
            declarations={declarations}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            onSelectDeclaration={(d) => setSelectedDeclarationId(d.id)}
            selectedDeclarationId={selectedDeclarationId}
            onExportXml={handleExportXml}
          />
        )}

        {activeTab === "FUELEU_POOLING" && (
          <Pooling
            vessels={vessels}
            totalPoolBalanceMj={kpis.fuelEuComplianceBalanceMj}
            statutoryPenaltyRateEurPerTon={2400}
            onExecutePool={handleExecutePool}
            isExecuting={isExecutingPool}
          />
        )}

        {activeTab === "BOOK_AND_CLAIM" && (
          <BookAndClaim
            tokens={tokens}
            blocks={blocks}
            onVerifyChain={handleVerifyChain}
            isVerifying={isVerifyingChain}
            chainValid={chainValid}
          />
        )}
      </div>
    </div>
  );
}
