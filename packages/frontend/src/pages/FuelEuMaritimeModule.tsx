import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Ship,
  Download,
  Search,
  Calculator,
  ShieldCheck,
  FileCode2,
  Scale,
  Flame,
  Zap,
  Globe,
  Waves,
  Percent,
} from "lucide-react";
import { useApiQuery } from "../hooks/useApiQuery";
import { Input } from "@atlas/ui";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function FuelEuMaritimeModule() {
  const [activeTab, setActiveTab] = useState<
    "VOYAGES_GHG" | "ETS_GREEN_BAF" | "POOLING_FUELS"
  >("VOYAGES_GHG");
  const [activeScopeFilter, setActiveScopeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVoyage, setSelectedVoyage] = useState<any>(null);

  // ETS & Green BAF Simulator State
  const [simCo2Tonnes, setSimCo2Tonnes] = useState(350);
  const [simCh4Tonnes, setSimCh4Tonnes] = useState(0.01);
  const [simN2oTonnes, setSimN2oTonnes] = useState(0.02);
  const [simScope, setSimScope] = useState<
    "INTRA_EU_100" | "EXTRA_EU_50" | "BERTH_PORT_EU_100"
  >("INTRA_EU_100");
  const [simEuaPrice, setSimEuaPrice] = useState(75);
  const [simCarriedTeus, setSimCarriedTeus] = useState(4500);
  const [simFueleuImpact, setSimFueleuImpact] = useState(8000);
  const [etsSimResult, setEtsSimResult] = useState<any>(null);

  // Multi-fuel Simulator State
  const [simFuelCode, setSimFuelCode] = useState("E_METHANOL_RFNBO");
  const [simFuelTonnes, setSimFuelTonnes] = useState(120);
  const [simOpsKwh, setSimOpsKwh] = useState(15000);
  const [fuelSimResult, setFuelSimResult] = useState<any>(null);

  // Status Change Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusInput, setStatusInput] = useState<
    "PLANNED" | "UNDERWAY" | "COMPLETED_VERIFIED" | "AUDITED_THETIS"
  >("COMPLETED_VERIFIED");
  const [verifierInput, setVerifierInput] = useState("");

  // Fetch Marine Fuels
  const { data: fuels = [] } = useApiQuery<any[]>(
    ["fueleu-fuels"],
    "/fueleu/fuels",
  );

  // Fetch Marine Vessels
  const { data: vessels = [] } = useApiQuery<any[]>(
    ["fueleu-vessels"],
    "/fueleu/vessels",
  );

  // Fetch Marine Voyages
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

  // Fetch Compliance Accounts
  const { data: accounts = [] } = useApiQuery<any[]>(
    ["fueleu-accounts"],
    "/fueleu/accounts",
  );

  // Fetch Compliance Pools
  const { data: pools = [] } = useApiQuery<any[]>(
    ["fueleu-pools"],
    "/fueleu/pools",
  );

  // Fetch Voyage Detail
  const { data: voyageDetails } = useApiQuery<any>(
    ["fueleu-voyage-details", selectedVoyage?.id],
    selectedVoyage?.id ? `/fueleu/voyages/${selectedVoyage.id}` : "",
  );

  // Auto-select first voyage
  React.useEffect(() => {
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

  // KPIs
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

  const currentVoyage = voyageDetails || selectedVoyage;
  const currentAccount = accounts[0];

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-cyan-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-emerald-600/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header & KPI Summary */}
      <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <Ship className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                FuelEU Maritime, EU ETS & Descarbonización de Flota
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Reg. (UE) 2023/1805 & Dir. 2023/959
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Contabilidad de Intensidad de GEI Well-to-Wake (gCO2eq/MJ),
              Liquidación de Derechos de Emisión EU ETS, Conexión OPS en Muelle
              y Pooling de Flota.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentAccount && (
              <a
                href={`/api/fueleu/accounts/${currentAccount.id}/certificate-pdf`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-600/25 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Certificado Oficial FuelEU & ETS (PDF)
              </a>
            )}
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Travesías Auditadas
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {voyages.length} Viajes
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Waves className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {vessels.length} buques (
              {(totalFuelEnergySum / 1_000_000).toFixed(1)} GJ a bordo)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Intensidad GEI Media
                </p>
                <h3 className="text-2xl font-black text-cyan-400 mt-1">
                  {avgGhgIntensity.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-slate-300">
                    g/MJ
                  </span>
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Percent className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Objetivo 2025: 89.34 gCO2eq/MJ (-2%)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Derechos EU ETS Marítimo
                </p>
                <h3 className="text-2xl font-black text-amber-400 mt-1">
                  {totalEtsEmissionsSum.toLocaleString("es-ES", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  <span className="text-xs font-normal text-slate-300">
                    tCO2eq
                  </span>
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Scale className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {(totalEtsEmissionsSum * 75).toLocaleString("es-ES")} € obligación
              @ 75€/t
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Agrupaciones (Pools)
                </p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">
                  {pools.length} Activas
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Compensación neta = 0,00 € multas
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mt-6 border-b border-white/10 pb-2">
          {(
            [
              {
                id: "VOYAGES_GHG",
                label: "Monitor de Travesías & Intensidad GEI (gCO2eq/MJ)",
              },
              {
                id: "ETS_GREEN_BAF",
                label: "Liquidación EU ETS & Recargos Green BAF por TEU",
              },
              {
                id: "POOLING_FUELS",
                label:
                  "Pooling de Flota (Art. 21) & Simulador Multicombustible",
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeTab === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                  : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Marine Voyages & GHG Intensity */}
      {activeTab === "VOYAGES_GHG" && (
        <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
          {/* Left Column: Voyages List */}
          <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
            <div className="p-4 border-b border-white/10 space-y-3">
              <Input
                type="text"
                placeholder="Buscar Travesía, Puerto, IMO, Verificador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
              />
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {[
                  "ALL",
                  "INTRA_EU_100",
                  "EXTRA_EU_50",
                  "BERTH_PORT_EU_100",
                ].map((scope) => (
                  <button
                    key={scope}
                    onClick={() => setActiveScopeFilter(scope)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                      activeScopeFilter === scope
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                        : "bg-transparent text-slate-400 border-transparent hover:bg-white/5"
                    }`}
                  >
                    {scope === "ALL"
                      ? "Todos los Ámbitos"
                      : scope === "INTRA_EU_100"
                        ? "Intra-UE (100%)"
                        : scope === "EXTRA_EU_50"
                          ? "Extra-UE (50%)"
                          : "Muelle OPS (100%)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingVoyages ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                </div>
              ) : voyages.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No se encontraron travesías marítimas registradas.
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                  key={activeScopeFilter + searchQuery}
                >
                  {voyages.map((v) => {
                    const isSelected = selectedVoyage?.id === v.id;
                    const isGreen = v.calculatedGhgIntensityGco2eqPerMj < 89.34;
                    return (
                      <motion.div
                        key={v.id}
                        variants={itemVariants}
                        onClick={() => setSelectedVoyage(v)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-white/10 border-white/20 shadow-lg"
                            : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white text-sm tracking-wide">
                                {v.voyageReferenceNumber}
                              </p>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  v.geographicScope === "INTRA_EU_100"
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    : v.geographicScope === "EXTRA_EU_50"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                }`}
                              >
                                {v.geographicScope === "INTRA_EU_100"
                                  ? "Intra-UE 100%"
                                  : v.geographicScope === "EXTRA_EU_50"
                                    ? "Extra-UE 50%"
                                    : "Muelle OPS"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                              {v.departurePortLocode} ➔ {v.arrivalPortLocode} (
                              {v.distanceNauticalMiles} NM)
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {v.fuelConsumedTonnes > 0
                                ? `${v.fuelConsumedTonnes} t Combustible`
                                : `${v.opsElectricityConsumedKwh} kWh OPS`}{" "}
                              | {v.carriedTeuCount} TEU
                            </p>
                          </div>

                          <div className="flex flex-col items-end">
                            <span
                              className={`text-xs font-black ${isGreen ? "text-emerald-400" : "text-amber-400"}`}
                            >
                              {v.calculatedGhgIntensityGco2eqPerMj.toFixed(2)}{" "}
                              g/MJ
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">
                              {v.etsApplicableScopeEmissionsTco2eq.toFixed(1)} t
                              ETS
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>

          {/* Right Column: Detailed Voyage & FuelEU Accounting */}
          <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
            {currentVoyage ? (
              <div className="flex flex-col h-full overflow-y-auto">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        {currentVoyage.status}
                      </span>
                      <h2 className="text-xl font-black text-white tracking-wide">
                        {currentVoyage.voyageReferenceNumber}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <Globe size={12} className="text-cyan-400" />
                      Buque:{" "}
                      {currentVoyage.vessel?.vesselName ||
                        "Buque Mercante"}{" "}
                      (IMO: {currentVoyage.vessel?.imoNumber || "N/A"})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setStatusInput(
                          currentVoyage.status || "COMPLETED_VERIFIED",
                        );
                        setVerifierInput(
                          currentVoyage.leadAuditorVerifier || "",
                        );
                        setShowStatusModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-1.5 shadow-sm border border-white/10"
                    >
                      <ShieldCheck size={14} className="text-cyan-400" />
                      Verificar Travesía
                    </button>
                    <a
                      href={`/api/fueleu/voyages/${currentVoyage.id}/thetis-xml`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <FileCode2 size={14} />
                      XML THETIS-MRV
                    </a>
                    <a
                      href={`/api/fueleu/voyages/${currentVoyage.id}/bdn-pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Download size={14} />
                      Informe BDN (PDF)
                    </a>
                  </div>
                </div>

                {/* Body: Operational & Emission Characteristics */}
                <div className="p-4 md:p-6 space-y-4">
                  {/* Metric Ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Intensidad WtW Real
                      </span>
                      <p
                        className={`text-lg font-black ${currentVoyage.calculatedGhgIntensityGco2eqPerMj < 89.34 ? "text-emerald-400" : "text-amber-400"}`}
                      >
                        {currentVoyage.calculatedGhgIntensityGco2eqPerMj.toFixed(
                          2,
                        )}{" "}
                        g/MJ
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Energía Consumida
                      </span>
                      <p className="text-lg font-bold text-cyan-400">
                        {(
                          currentVoyage.totalEnergyConsumedMj / 1_000_000
                        ).toFixed(2)}{" "}
                        GJ
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Derechos EU ETS (
                        {currentVoyage.geographicScope === "EXTRA_EU_50"
                          ? "50%"
                          : "100%"}
                        )
                      </span>
                      <p className="text-lg font-bold text-amber-400">
                        {currentVoyage.etsApplicableScopeEmissionsTco2eq.toFixed(
                          2,
                        )}{" "}
                        tCO2e
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Carga / TEUs
                      </span>
                      <p className="text-lg font-black text-white">
                        {currentVoyage.carriedTeuCount} TEU
                      </p>
                    </div>
                  </div>

                  {/* Route & Bunker Details */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2 text-xs">
                    <span className="font-bold text-slate-300 block">
                      Ruta Náutica & Parámetros Operacionales:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-200">
                      <div>
                        <p>
                          <strong className="text-slate-400">Origen:</strong>{" "}
                          {currentVoyage.departurePortName} (
                          {currentVoyage.departurePortLocode})
                        </p>
                        <p>
                          <strong className="text-slate-400">Destino:</strong>{" "}
                          {currentVoyage.arrivalPortName} (
                          {currentVoyage.arrivalPortLocode})
                        </p>
                        <p>
                          <strong className="text-slate-400">
                            Distancia Navegada:
                          </strong>{" "}
                          {currentVoyage.distanceNauticalMiles} Millas Náuticas
                        </p>
                        <p>
                          <strong className="text-slate-400">
                            Horas Navegación / Muelle:
                          </strong>{" "}
                          {currentVoyage.navigationHours}h /{" "}
                          {currentVoyage.berthHours}h
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong className="text-slate-400">
                            Combustible Principal:
                          </strong>{" "}
                          {currentVoyage.fuel?.fuelName || "VLSFO"}
                        </p>
                        <p>
                          <strong className="text-slate-400">
                            Consumo Bunker:
                          </strong>{" "}
                          {currentVoyage.fuelConsumedTonnes} Toneladas
                        </p>
                        <p>
                          <strong className="text-slate-400">
                            Consumo Red OPS:
                          </strong>{" "}
                          {currentVoyage.opsElectricityConsumedKwh} kWh
                        </p>
                        <p>
                          <strong className="text-slate-400">
                            Auditor Verificador:
                          </strong>{" "}
                          {currentVoyage.leadAuditorVerifier}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Gas Emissions Table */}
                  <div className="rounded-2xl border border-white/10 overflow-hidden space-y-1">
                    <div className="p-3 bg-slate-900/90 border-b border-white/10 flex justify-between items-center">
                      <span className="font-bold text-slate-300 text-xs flex items-center gap-2">
                        <Flame size={14} className="text-cyan-400" />
                        Desglose de Emisiones Multi-Gas (CO2, CH4 & N2O bajo
                        Directiva 2023/959)
                      </span>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="p-3">Gas Contaminante</th>
                          <th className="p-3">GWP (Factor Potencial)</th>
                          <th className="p-3 text-right">Masa Bruta (t)</th>
                          <th className="p-3 text-right">
                            Emisiones Equivalentes (tCO2e)
                          </th>
                          <th className="p-3 text-right">
                            Alcance EU ETS (tCO2e)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="p-3 text-white font-bold">
                            Dióxido de Carbono (CO2)
                          </td>
                          <td className="p-3 text-slate-300">1.0</td>
                          <td className="p-3 text-right text-slate-300">
                            {currentVoyage.co2EmissionsTonnes.toFixed(3)}
                          </td>
                          <td className="p-3 text-right text-white font-bold">
                            {currentVoyage.co2EmissionsTonnes.toFixed(3)}
                          </td>
                          <td className="p-3 text-right font-black text-amber-400">
                            {(
                              currentVoyage.co2EmissionsTonnes *
                              (currentVoyage.geographicScope === "EXTRA_EU_50"
                                ? 0.5
                                : 1.0)
                            ).toFixed(3)}
                          </td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="p-3 text-white font-bold">
                            Metano (CH4 - Deslizamiento)
                          </td>
                          <td className="p-3 text-slate-300">28.0 (AR5)</td>
                          <td className="p-3 text-right text-slate-300">
                            {currentVoyage.ch4EmissionsTonnes.toFixed(4)}
                          </td>
                          <td className="p-3 text-right text-white font-bold">
                            {(currentVoyage.ch4EmissionsTonnes * 28).toFixed(3)}
                          </td>
                          <td className="p-3 text-right font-black text-amber-400">
                            {(
                              currentVoyage.ch4EmissionsTonnes *
                              28 *
                              (currentVoyage.geographicScope === "EXTRA_EU_50"
                                ? 0.5
                                : 1.0)
                            ).toFixed(3)}
                          </td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="p-3 text-white font-bold">
                            Óxido Nitroso (N2O)
                          </td>
                          <td className="p-3 text-slate-300">265.0 (AR5)</td>
                          <td className="p-3 text-right text-slate-300">
                            {currentVoyage.n2oEmissionsTonnes.toFixed(4)}
                          </td>
                          <td className="p-3 text-right text-white font-bold">
                            {(currentVoyage.n2oEmissionsTonnes * 265).toFixed(
                              3,
                            )}
                          </td>
                          <td className="p-3 text-right font-black text-amber-400">
                            {(
                              currentVoyage.n2oEmissionsTonnes *
                              265 *
                              (currentVoyage.geographicScope === "EXTRA_EU_50"
                                ? 0.5
                                : 1.0)
                            ).toFixed(3)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                <Ship className="w-12 h-12 mb-2 stroke-1 opacity-40" />
                Seleccione una travesía para auditar los consumos de bunker y la
                intensidad de gases de efecto invernadero
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: EU ETS & Green BAF Simulator */}
      {activeTab === "ETS_GREEN_BAF" && (
        <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Simulator Inputs */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Calculator size={18} className="text-cyan-400" />
                Simulador EU ETS & Recargo Green BAF
              </h3>
              <p className="text-xs text-slate-400">
                Calcula la entrega de derechos EUA y el recargo ecológico
                repercutible por contenedor (TEU / FEU).
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">
                    Ámbito Geográfico
                  </label>
                  <select
                    value={simScope}
                    onChange={(e: any) => setSimScope(e.target.value)}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="INTRA_EU_100">
                      Intra-UE / Puertos EEA (100% Cobertura)
                    </option>
                    <option value="EXTRA_EU_50">
                      Extra-UE / Terceros Países (50% Cobertura)
                    </option>
                    <option value="BERTH_PORT_EU_100">
                      Atraque en Puerto UE (100% Cobertura)
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">CO2 (t)</label>
                    <Input
                      type="number"
                      value={simCo2Tonnes}
                      onChange={(e) => setSimCo2Tonnes(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">CH4 (t)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={simCh4Tonnes}
                      onChange={(e) => setSimCh4Tonnes(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">N2O (t)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={simN2oTonnes}
                      onChange={(e) => setSimN2oTonnes(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Precio EUA (€/t)
                    </label>
                    <Input
                      type="number"
                      value={simEuaPrice}
                      onChange={(e) => setSimEuaPrice(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      TEUs Transportados
                    </label>
                    <Input
                      type="number"
                      value={simCarriedTeus}
                      onChange={(e) =>
                        setSimCarriedTeus(Number(e.target.value))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">
                    Impacto/Penalización FuelEU (€)
                  </label>
                  <Input
                    type="number"
                    value={simFueleuImpact}
                    onChange={(e) => setSimFueleuImpact(Number(e.target.value))}
                  />
                </div>

                <button
                  onClick={handleRunEtsCalc}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-md shadow-cyan-600/20"
                >
                  Calcular Derechos ETS & Green BAF
                </button>
              </div>
            </div>

            {/* Simulator Output */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4 lg:col-span-2">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Scale size={18} className="text-amber-400" />
                Resultados de Liquidación de Derechos & Tarifas Ecológicas
              </h3>

              {etsSimResult ? (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                      <span className="text-slate-400 block">
                        Emisiones Brutas GEI
                      </span>
                      <p className="text-xl font-black text-white mt-1">
                        {etsSimResult.etsLiability.totalGrossGhgTco2eq.toFixed(
                          2,
                        )}{" "}
                        tCO2e
                      </p>
                      <span className="text-[10px] text-slate-400">
                        Incluye CH4 (x28) y N2O (x265)
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                      <span className="text-slate-400 block">
                        Derechos Exigibles EU ETS
                      </span>
                      <p className="text-xl font-black text-amber-400 mt-1">
                        {etsSimResult.etsLiability.applicableScopeEmissionsTco2eq.toFixed(
                          2,
                        )}{" "}
                        EUA
                      </p>
                      <span className="text-[10px] text-slate-400">
                        Factor de ámbito: x
                        {etsSimResult.etsLiability.scopeFactor}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                      <span className="text-slate-400 block">
                        Obligación Financiera Total
                      </span>
                      <p className="text-xl font-black text-emerald-400 mt-1">
                        {etsSimResult.etsLiability.totalEtsFinancialLiabilityEur.toLocaleString(
                          "es-ES",
                          { minimumFractionDigits: 2 },
                        )}{" "}
                        €
                      </p>
                      <span className="text-[10px] text-slate-400">
                        @ {etsSimResult.etsLiability.euaPriceEurPerTonne} €/EUA
                      </span>
                    </div>
                  </div>

                  {/* Green BAF Breakdown */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-3">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                      <span className="font-bold text-white text-sm flex items-center gap-2">
                        <Zap size={14} className="text-cyan-400" />
                        Desglose de Recargo Verde (Green BAF)
                      </span>
                      <span className="text-xs text-cyan-300 font-bold">
                        Base: {etsSimResult.greenBaf.carriedTeus} TEUs
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-slate-400 block">
                          Impacto FuelEU por TEU:
                        </span>
                        <p className="text-base font-bold text-white mt-0.5">
                          {etsSimResult.greenBaf.fueleuImpactPerTeuEur.toFixed(
                            2,
                          )}{" "}
                          € / TEU
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 block">
                          Coste EU ETS por TEU:
                        </span>
                        <p className="text-base font-bold text-white mt-0.5">
                          {etsSimResult.greenBaf.etsImpactPerTeuEur.toFixed(2)}{" "}
                          € / TEU
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold text-cyan-300">
                          Recargo Total Green BAF:
                        </span>
                        <p className="text-lg font-black text-cyan-400 mt-0.5">
                          {etsSimResult.greenBaf.totalGreenBafSurchargePerTeuEur.toFixed(
                            2,
                          )}{" "}
                          € / TEU
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                      <span className="text-slate-300 font-medium">
                        Recargo Total para Contenedor 40ft (FEU / 2 TEUs):
                      </span>
                      <span className="font-black text-emerald-400 text-base">
                        {etsSimResult.greenBaf.totalGreenSurchargeFor40FtContainerEur.toFixed(
                          2,
                        )}{" "}
                        €
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 text-sm">
                  Configure los parámetros de travesía y ejecute el cálculo para
                  visualizar la liquidación EU ETS y los recargos por TEU.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Fleet Compliance Pooling & Multi-Fuel Simulator */}
      {activeTab === "POOLING_FUELS" && (
        <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Multi-Fuel Simulator */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Flame size={18} className="text-cyan-400" />
                Simulador de Combustibles Verdes & Balance FuelEU
              </h3>
              <p className="text-xs text-slate-400">
                Evalúa el impacto de combustibles alternativos (E-Metanol,
                Bio-LNG, HVO) y conexión OPS en el balance de cumplimiento (CB).
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">
                    Tipo de Combustible Principal
                  </label>
                  <select
                    value={simFuelCode}
                    onChange={(e: any) => setSimFuelCode(e.target.value)}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {fuels.map((f) => (
                      <option key={f.id} value={f.fuelCode}>
                        {f.fuelName} ({f.totalWtwFactorGco2eqPerMj} g/MJ)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Consumo Combustible (t)
                    </label>
                    <Input
                      type="number"
                      value={simFuelTonnes}
                      onChange={(e) => setSimFuelTonnes(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Electricidad OPS Muelle (kWh)
                    </label>
                    <Input
                      type="number"
                      value={simOpsKwh}
                      onChange={(e) => setSimOpsKwh(Number(e.target.value))}
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunFuelSim}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-md shadow-cyan-600/20"
                >
                  Simular Intensidad GEI & Balance
                </button>

                {fuelSimResult && (
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Intensidad WtW Obtenida:
                      </span>
                      <span className="font-bold text-white">
                        {fuelSimResult.ghgMetrics.calculatedGhgIntensityGco2eqPerMj.toFixed(
                          2,
                        )}{" "}
                        gCO2eq/MJ
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Objetivo Regulatorio 2025:
                      </span>
                      <span className="font-bold text-slate-300">
                        {fuelSimResult.complianceMetrics.targetGhgIntensityGco2eqPerMj.toFixed(
                          2,
                        )}{" "}
                        gCO2eq/MJ
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-white/10">
                      <span className="text-slate-400 font-bold">
                        Estado de Cumplimiento:
                      </span>
                      <span
                        className={`font-black ${fuelSimResult.complianceMetrics.isCompliant ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {fuelSimResult.complianceMetrics.complianceStatus} (
                        {fuelSimResult.complianceMetrics.complianceBalanceTonnesCo2eq.toFixed(
                          2,
                        )}{" "}
                        tCO2e)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Penalización Prevista:
                      </span>
                      <span className="font-black text-amber-400">
                        {fuelSimResult.complianceMetrics.fuelEuPenaltyEur.toLocaleString(
                          "es-ES",
                          { minimumFractionDigits: 2 },
                        )}{" "}
                        €
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active Compliance Pools */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                Agrupaciones de Cumplimiento de Flota (Pools - Art. 21)
              </h3>
              <p className="text-xs text-slate-400">
                La agrupación permite compensar déficits de buques
                convencionales con superávits de buques a metanol verde,
                neutralizando penalizaciones a 0,00 €.
              </p>

              <div className="space-y-3 overflow-y-auto max-h-[360px]">
                {pools.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-sm">
                            {p.poolName}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                            {p.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Gestor: {p.managingOperatorName} | Año:{" "}
                          {p.reportingYear}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-emerald-400">
                          +
                          {(
                            p.consolidatedNetComplianceBalanceGco2eq / 1_000_000
                          ).toFixed(1)}{" "}
                          t CO2e
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {p.totalEnrolledVesselsCount} Buques en Pool
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 italic pt-1 border-t border-white/10">
                      "{p.remarks}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Verification Modal */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-cyan-400" />
                  Verificación de Travesía Marítima (THETIS-MRV)
                </h3>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-slate-400 hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Estado de Auditoría
                  </label>
                  <select
                    value={statusInput}
                    onChange={(e: any) => setStatusInput(e.target.value)}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="PLANNED">
                      PLANNED (Planificada / Itinerario Previsto)
                    </option>
                    <option value="UNDERWAY">UNDERWAY (En Navegación)</option>
                    <option value="COMPLETED_VERIFIED">
                      COMPLETED_VERIFIED (Finalizada y Verificada por Jefe de
                      Máquinas)
                    </option>
                    <option value="AUDITED_THETIS">
                      AUDITED_THETIS (Auditada por Sociedad de Clasificación y
                      Registrada en THETIS)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Auditor Verificador Acreditado
                  </label>
                  <Input
                    type="text"
                    value={verifierInput}
                    onChange={(e) => setVerifierInput(e.target.value)}
                    placeholder="ej. DNV Marine Lead Auditor / Bureau Veritas..."
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveStatus}
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  Confirmar Verificación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
