import { Button, Input } from "@atlas/ui";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  Calculator,
  Download,
  ExternalLink,
  Globe2,
  Layers,
  Leaf,
  Plane,
  Plus,
  Search,
  Ship,
  Sparkles,
  TrainTrack,
  Trash2,
  TreePine,
  TrendingDown,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { useApiMutation, useApiQuery } from "../hooks/useApiQuery";

interface LegInput {
  originName: string;
  destinationName: string;
  mode: string;
  distanceKm: number;
  weightKg: number;
}

const toNumber = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const toFixed = (value: unknown, digits = 2) => toNumber(value).toFixed(digits);

export default function CarbonEmissionsModule() {
  const [activeTab, setActiveTab] = useState<
    "JOURNEYS" | "CALCULATOR" | "MARKETPLACE" | "CERTIFICATES"
  >("JOURNEYS");
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

  const selectedProject = projects.find(
    (project: any) => project.id === offsetSelectedProjectId,
  );
  const totalCalcTco2eWtw = toNumber(calcDetails?.totalTco2eWtw);
  const totalCalcTco2eTtw = toNumber(calcDetails?.totalTco2eTtw);
  const totalCalcTco2eWtt = toNumber(calcDetails?.totalTco2eWtt);
  const totalCalcCarbonIntensity = toNumber(
    calcDetails?.carbonIntensityGco2ePerTkm,
  );
  const selectedCalculationTotal = toNumber(selectedCalculation?.totalTco2eWtw);

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

  // Handle Calculate Journey in Simulator
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

      // Also get green alternatives
      const altRes: any = await compareMutation.mutateAsync({ legs: calcLegs });
      setGreenAlternatives(altRes.alternatives || []);

      refetchSummary();
      refetchCalculations();
    } catch (err: any) {
      alert("Error al calcular huella: " + err.message);
    }
  };

  // Add/Remove Legs in Calculator
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

  // Handle Offset Purchase
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

  // Helper for mode icons & badges
  const getModeBadge = (mode: string) => {
    switch (mode) {
      case "OCEAN_CONTAINER":
      case "OCEAN_BULK":
        return {
          icon: <Ship size={14} className="text-blue-400" />,
          label: "Marítimo",
          bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        };
      case "AIR_FREIGHT":
      case "AIR_BELLY":
        return {
          icon: <Plane size={14} className="text-amber-400" />,
          label: "Aéreo",
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
      case "RAIL_ELECTRIC":
      case "RAIL_DIESEL":
        return {
          icon: <TrainTrack size={14} className="text-emerald-400" />,
          label: "Ferrocarril",
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
      case "ROAD_HVO":
      case "ROAD_EV":
        return {
          icon: <Truck size={14} className="text-green-400" />,
          label: "Carretera Eco",
          bg: "bg-green-500/10 text-green-400 border-green-500/20",
        };
      default:
        return {
          icon: <Truck size={14} className="text-slate-400" />,
          label: "Carretera Diésel",
          bg: "bg-slate-500/10 text-slate-400 border-slate-500/20",
        };
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-r from-emerald-950 via-teal-900 to-slate-900 p-8 border border-emerald-500/20 shadow-2xl"
      >
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                <Leaf size={26} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-wider text-white">
                  CALCULADORA DE HUELLA DE CARBONO SCOPE 3
                </h1>
                <p className="text-xs font-medium text-emerald-300/80">
                  Estándar Internacional ISO 14083 & GLEC Framework v3 —
                  Descarbonización Multimodal
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl">
              Audita y cuantifica las emisiones de gases de efecto invernadero
              (GEI) de puerta a puerta separando Well-to-Wheel (WTW),
              Tank-to-Wheel (TTW) y Well-to-Tank (WTT), compensa tu impacto con
              proyectos verificados y emite certificados oficiales.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setActiveTab("CALCULATOR")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-2"
            >
              <Calculator size={16} />
              Simular Corredor Verde
            </Button>
          </div>
        </div>

        {/* Top KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-emerald-500/20">
          <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Emisiones Totales (WTW)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-white">
                {toFixed(summary?.totalTco2eWtw, 2)}
              </span>
              <span className="text-xs font-bold text-emerald-400">tCO2e</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Ciclo de vida completo
            </span>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Compensación Realizada
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-emerald-400">
                {summary?.offsetPercentage || "0.0"}%
              </span>
              <span className="text-xs text-slate-400">
                ({toFixed(summary?.totalTco2eOffset, 2)} t)
              </span>
            </div>
            <span className="text-[11px] text-emerald-400/80">
              Proyectos Gold Standard / VCS
            </span>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Intensidad Media de Carbono
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-white">
                {toFixed(summary?.avgCarbonIntensity, 1)}
              </span>
              <span className="text-xs text-slate-400">gCO2e / t-km</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Ponderado ISO 14083
            </span>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Certificados Emitidos
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-white">
                {summary?.issuedCertificatesCount || 0}
              </span>
              <span className="text-xs font-bold text-teal-400">Oficiales</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Descargables con QR de validación
            </span>
          </div>
        </div>
      </motion.div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-700/60 pb-3">
        <button
          onClick={() => setActiveTab("JOURNEYS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "JOURNEYS"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
              : "bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Layers size={15} />
          Expediciones Auditadas ({calculations.length})
        </button>

        <button
          onClick={() => setActiveTab("CALCULATOR")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "CALCULATOR"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
              : "bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Calculator size={15} />
          Simulador Multimodal GLEC v3
        </button>

        <button
          onClick={() => setActiveTab("MARKETPLACE")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "MARKETPLACE"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
              : "bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <TreePine size={15} />
          Marketplace de Compensación ({projects.length})
        </button>

        <button
          onClick={() => setActiveTab("CERTIFICATES")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "CERTIFICATES"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
              : "bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Award size={15} />
          Certificados Emitidos ({certificates.length})
        </button>
      </div>

      {/* Tab 1: JOURNEYS (Audit & Itemized Legs Breakdown) */}
      {activeTab === "JOURNEYS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          {/* List of Journeys */}
          <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe2 size={16} className="text-emerald-400" />
                Expediciones Multimodales
              </h3>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                {calculations.length} registradas
              </span>
            </div>

            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <Input
                placeholder="Buscar por referencia o ciudad..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-950/50 border-slate-700/60 text-xs text-white"
              />
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 max-h-137.5 pr-1">
              {calculations.map((calc) => {
                const isSelected = selectedCalculation?.id === calc.id;
                const isOffset = calc.status === "OFFSET_COMPLETED";

                return (
                  <div
                    key={calc.id}
                    onClick={() => setSelectedCalculation(calc)}
                    className={`p-4 rounded-xl border transition cursor-pointer text-left ${
                      isSelected
                        ? "bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-950/50"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-white">
                        {calc.referenceCode}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                          isOffset
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {isOffset ? "COMPENSADO" : "PENDIENTE"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 font-medium mb-2 flex items-center gap-1.5">
                      <span>{calc.originCity}</span>
                      <ArrowRight size={12} className="text-slate-500" />
                      <span>{calc.destinationCity}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/80 text-slate-400">
                      <div>
                        <span>Huella WTW: </span>
                        <strong className="text-emerald-400">
                          {calc.totalTco2eWtw
                            ? calc.totalTco2eWtw.toFixed(3)
                            : 0}{" "}
                          t
                        </strong>
                      </div>
                      <div className="text-right">
                        <span>Distancia: </span>
                        <strong className="text-white">
                          {calc.totalDistanceKm} km
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details & Leg-by-Leg Inspector */}
          <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 flex flex-col gap-6">
            {calcDetails ? (
              <>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-black text-white">
                        {calcDetails.referenceCode}
                      </h2>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          calcDetails.status === "OFFSET_COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {calcDetails.status === "OFFSET_COMPLETED"
                          ? "NEUTRALIDAD 100% CERTIFICADA"
                          : "HUELLA AUDITADA (SIN COMPENSAR)"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ruta: {calcDetails.originCity} ➔{" "}
                      {calcDetails.destinationCity} | Peso Carga:{" "}
                      {(calcDetails.totalWeightKg / 1000).toFixed(2)} Toneladas
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {calcDetails.status === "OFFSET_COMPLETED" ? (
                      <Button
                        onClick={() => setActiveTab("CERTIFICATES")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                      >
                        <Award size={14} />
                        Ver Certificado Oficial
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedCalculation(calcDetails);
                          setBeneficiaryInput("Iberia Retail Group S.A.");
                          setShowOffsetModal(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                      >
                        <Award size={14} />
                        Compensar con Créditos Verificados
                      </Button>
                    )}
                  </div>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-emerald-500/20">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Total WTW (Well-to-Wheel)
                    </span>
                    <span className="text-2xl font-black text-white mt-1 block">
                      {toFixed(totalCalcTco2eWtw, 4)}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        tCO2e
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Intensidad: {toFixed(totalCalcCarbonIntensity, 2)} g/t-km
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Directo TTW (Tank-to-Wheel)
                    </span>
                    <span className="text-2xl font-black text-slate-200 mt-1 block">
                      {toFixed(totalCalcTco2eTtw, 4)}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        tCO2e
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Combustión operacional directa
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Indirecto WTT (Well-to-Tank)
                    </span>
                    <span className="text-2xl font-black text-slate-200 mt-1 block">
                      {toFixed(totalCalcTco2eWtt, 4)}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        tCO2e
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Extracción y refinado de combustible
                    </span>
                  </div>
                </div>

                {/* Itemized Legs */}
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Layers size={14} className="text-emerald-400" />
                    Desglose Tramo a Tramo (Leg-by-Leg)
                  </h3>

                  <div className="flex flex-col gap-3">
                    {calcDetails.legs?.map((leg: any) => {
                      const badge = getModeBadge(leg.mode);
                      const pctOfTotal = (
                        (toNumber(leg.legTco2eWtw) / totalCalcTco2eWtw) *
                        100
                      ).toFixed(1);

                      return (
                        <div
                          key={leg.id}
                          className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-white">
                              {leg.legOrder}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.bg}`}
                                >
                                  {badge.icon}
                                  {badge.label}
                                </span>
                                <span className="text-xs font-bold text-white">
                                  {leg.originName} ➔ {leg.destinationName}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                Distancia: {leg.distanceKm} km | Factor GLEC:{" "}
                                {leg.emissionFactorWtw} gCO2e/t-km
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 text-right w-full md:w-auto justify-between md:justify-end">
                            <div>
                              <span className="text-xs font-black text-emerald-400 block">
                                {leg.legTco2eWtw.toFixed(4)} tCO2e
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {pctOfTotal}% del total
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-500">
                <Leaf size={48} className="text-slate-700 mb-3" />
                <h4 className="text-base font-bold text-slate-300">
                  Selecciona una expedición para ver su auditoría Scope 3
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Explora el balance de emisiones tramo a tramo, compara
                  factores GLEC y genera certificados de neutralidad.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: CALCULATOR & GREEN CORRIDOR SIMULATOR */}
      {activeTab === "CALCULATOR" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          {/* Journey Builder */}
          <div className="lg:col-span-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calculator size={16} className="text-emerald-400" />
                  Configurador de Ruta Multimodal
                </h3>
                <p className="text-xs text-slate-400">
                  Define los tramos de origen a destino con pesos y modos de
                  transporte
                </p>
              </div>
              <Button
                onClick={handleAddLeg}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5"
              >
                <Plus size={14} />
                Añadir Tramo
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Referencia Simulación
                </label>
                <Input
                  value={calcRefCode}
                  onChange={(e) => setCalcRefCode(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Ciudad Origen
                </label>
                <Input
                  value={calcOriginCity}
                  onChange={(e) => setCalcOriginCity(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Ciudad Destino
                </label>
                <Input
                  value={calcDestinationCity}
                  onChange={(e) => setCalcDestinationCity(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto max-h-105 pr-1">
              {calcLegs.map((leg, index) => (
                <div
                  key={index}
                  className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col gap-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">
                      Tramo #{index + 1}
                    </span>
                    {calcLegs.length > 1 && (
                      <button
                        onClick={() => handleRemoveLeg(index)}
                        className="text-slate-500 hover:text-red-400 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-slate-400 block mb-1">
                        Punto de Salida
                      </label>
                      <Input
                        value={leg.originName}
                        onChange={(e) =>
                          handleLegChange(index, "originName", e.target.value)
                        }
                        className="bg-slate-900 border-slate-700 text-xs text-white"
                        placeholder="Ej. Puerto de Valencia"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-400 block mb-1">
                        Punto de Llegada
                      </label>
                      <Input
                        value={leg.destinationName}
                        onChange={(e) =>
                          handleLegChange(
                            index,
                            "destinationName",
                            e.target.value,
                          )
                        }
                        className="bg-slate-900 border-slate-700 text-xs text-white"
                        placeholder="Ej. Madrid Dry Port"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-slate-400 block mb-1">
                        Modo de Transporte
                      </label>
                      <select
                        value={leg.mode}
                        onChange={(e) =>
                          handleLegChange(index, "mode", e.target.value)
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="OCEAN_CONTAINER">
                          Marítimo (Portacontenedores 15k TEU)
                        </option>
                        <option value="OCEAN_BULK">
                          Marítimo Granelero (Capesize)
                        </option>
                        <option value="AIR_FREIGHT">
                          Aéreo Carguero Puro (B777F)
                        </option>
                        <option value="AIR_BELLY">
                          Aéreo Pasajeros (Belly Cargo)
                        </option>
                        <option value="ROAD_DIESEL">
                          Carretera Camión Diésel Euro 6
                        </option>
                        <option value="ROAD_HVO">
                          Carretera HVO100 Renovable
                        </option>
                        <option value="ROAD_EV">
                          Carretera Eléctrico (BEV)
                        </option>
                        <option value="RAIL_ELECTRIC">
                          Ferrocarril Eléctrico (Mix UE)
                        </option>
                        <option value="RAIL_DIESEL">Ferrocarril Diésel</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-400 block mb-1">
                        Distancia (km)
                      </label>
                      <Input
                        type="number"
                        value={leg.distanceKm}
                        onChange={(e) =>
                          handleLegChange(
                            index,
                            "distanceKm",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="bg-slate-900 border-slate-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-400 block mb-1">
                        Peso Carga (kg)
                      </label>
                      <Input
                        type="number"
                        value={leg.weightKg}
                        onChange={(e) =>
                          handleLegChange(
                            index,
                            "weightKg",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="bg-slate-900 border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleRunCalculation}
              className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              Calcular Huella GLEC v3 & Analizar Corredores Verdes
            </Button>
          </div>

          {/* Simulation Output & Green Alternatives */}
          <div className="lg:col-span-6 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 flex flex-col gap-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <TrendingDown size={16} className="text-emerald-400" />
              Resultado de Auditoría & Comparativa Ecológica
            </h3>

            {calcResult ? (
              <div className="flex flex-col gap-5">
                {/* Result Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase block">
                      Total WTW
                    </span>
                    <span className="text-xl font-black text-white mt-1 block">
                      {calcResult.totalTco2eWtw.toFixed(4)} t
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {calcResult.totalDistanceKm} km totales
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Directo TTW
                    </span>
                    <span className="text-xl font-black text-slate-200 mt-1 block">
                      {calcResult.totalTco2eTtw.toFixed(4)} t
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Combustión motriz
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Intensidad
                    </span>
                    <span className="text-xl font-black text-emerald-400 mt-1 block">
                      {calcResult.carbonIntensityGco2ePerTkm}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      gCO2e / t-km
                    </span>
                  </div>
                </div>

                {/* Green Alternatives List */}
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <TreePine size={15} className="text-emerald-400" />
                    Opciones de Corredores Verdes Recomendadas
                  </h4>

                  {greenAlternatives.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {greenAlternatives.map((alt, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/20 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-300">
                              {alt.modeName}
                            </span>
                            <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                              -{alt.reductionPercentage}% CO2e
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {alt.description}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                            <span className="text-slate-400">
                              Emisión con esta ruta:{" "}
                              <strong className="text-white">
                                {toFixed(alt.simulatedTco2eWtw, 4)} t
                              </strong>
                            </span>
                            <span className="text-emerald-400 font-bold">
                              Ahorro: {toFixed(alt.savedTco2e, 4)} tCO2e
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-950/40 p-6 rounded-xl text-center text-xs text-slate-400">
                      Esta ruta ya utiliza tramos altamente optimizados en bajas
                      emisiones (Tren Eléctrico / HVO).
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-500">
                <Calculator size={44} className="text-slate-700 mb-2" />
                <h4 className="text-sm font-bold text-slate-300">
                  Configura los tramos y ejecuta el cálculo
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  El motor aplicará los factores de emisión GLEC v3 y generará
                  propuestas de descarbonización.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: OFFSET MARKETPLACE */}
      {activeTab === "MARKETPLACE" && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TreePine size={18} className="text-emerald-400" />
                Catálogo de Proyectos de Compensación Verificados
              </h3>
              <p className="text-xs text-slate-400">
                Créditos de carbono certificados por Verra VCS, Gold Standard y
                Puro.earth con trazabilidad total
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col justify-between hover:border-emerald-500/40 transition shadow-xl"
              >
                <div>
                  <div className="h-44 relative overflow-hidden bg-slate-950">
                    {proj.imageUrl ? (
                      <img
                        src={proj.imageUrl}
                        alt={proj.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        <Leaf size={40} className="text-emerald-500/40" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-emerald-400 border border-emerald-500/30">
                      {proj.standard.replace("_", " ")}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col gap-2.5">
                    <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
                      {proj.category.replace("_", " ")} | {proj.country}
                    </span>
                    <h4 className="text-sm font-bold text-white leading-snug">
                      {proj.name}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {proj.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="flex items-baseline justify-between pt-3 border-t border-slate-800/80 mb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Precio por Tonelada
                      </span>
                      <span className="text-lg font-black text-white">
                        €{proj.pricePerTco2eEur.toFixed(2)}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          / tCO2e
                        </span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">
                        Créditos Disponibles
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        {proj.availableCreditsTco2e.toLocaleString()} t
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {proj.verificationRegistryUrl && (
                      <a
                        href={proj.verificationRegistryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        title="Verificar en Registro Oficial"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <Button
                      onClick={() => {
                        setOffsetSelectedProjectId(proj.id);
                        if (calculations.length > 0) {
                          setSelectedCalculation(calculations[0]);
                        }
                        setShowOffsetModal(true);
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
                    >
                      Asignar Compensación
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: CERTIFICATES */}
      {activeTab === "CERTIFICATES" && (
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award size={18} className="text-emerald-400" />
                Registro Oficial de Certificados Scope 3
              </h3>
              <p className="text-xs text-slate-400">
                Certificados de neutralización emitidos con código QR y validez
                para auditorías CSRD
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 px-3">Nº Certificado</th>
                  <th className="pb-3 px-3">Beneficiario</th>
                  <th className="pb-3 px-3">Proyecto Asignado</th>
                  <th className="pb-3 px-3">Estándar</th>
                  <th className="pb-3 px-3">tCO2e Neutralizadas</th>
                  <th className="pb-3 px-3">Inversión Verde</th>
                  <th className="pb-3 px-3">Fecha Emisión</th>
                  <th className="pb-3 px-3 text-right">Descarga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {certificates.map((cert) => (
                  <tr
                    key={cert.id}
                    className="hover:bg-slate-800/30 transition"
                  >
                    <td className="py-3 px-3 font-bold text-emerald-400">
                      {cert.certificateNumber}
                    </td>
                    <td className="py-3 px-3 font-medium text-white">
                      {cert.beneficiaryName}
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-medium">
                      {cert.projectName}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                        {cert.projectStandard.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {cert.offsetTco2e.toFixed(4)} t
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">
                      €{cert.amountPaidEur.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(cert.issuedAt).toLocaleDateString("es-ES")}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <a
                        href={`/api/carbon/certificates/${cert.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition"
                      >
                        <Download size={13} />
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Purchase Offset */}
      <AnimatePresence>
        {showOffsetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 flex flex-col gap-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TreePine size={18} className="text-emerald-400" />
                  Neutralizar Huella de Carbono Scope 3
                </h3>
                <button
                  onClick={() => setShowOffsetModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Expedición a Compensar
                  </label>
                  <select
                    value={selectedCalculation?.id || ""}
                    onChange={(e) => {
                      const found = calculations.find(
                        (c) => c.id === e.target.value,
                      );
                      setSelectedCalculation(found);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    {calculations.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.referenceCode} ({c.originCity} ➔ {c.destinationCity})
                        — {c.totalTco2eWtw.toFixed(3)} tCO2e
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Proyecto de Compensación
                  </label>
                  <select
                    value={offsetSelectedProjectId}
                    onChange={(e) => setOffsetSelectedProjectId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value="">Selecciona un proyecto...</option>
                    {projects.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({String(p.standard || "").replace("_", " ")})
                        — €{toNumber(p.pricePerTco2eEur, 0)}/t
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Empresa Beneficiaria (Titular del Certificado)
                  </label>
                  <Input
                    value={beneficiaryInput}
                    onChange={(e) => setBeneficiaryInput(e.target.value)}
                    placeholder="Ej. Inditex Logistics S.A."
                    className="bg-slate-950 border-slate-700 text-xs text-white"
                  />
                </div>

                {selectedCalculation && offsetSelectedProjectId && (
                  <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-500/30 flex items-center justify-between mt-2">
                    <div>
                      <span className="text-[10px] text-emerald-400 uppercase font-bold block">
                        Coste Total Compensación (100% tCO2e)
                      </span>
                      <span className="text-xs text-slate-300">
                        {toFixed(selectedCalculationTotal, 4)} tCO2e
                        neutralizadas
                      </span>
                    </div>
                    <span className="text-xl font-black text-white">
                      €
                      {(
                        selectedCalculationTotal *
                        toNumber(selectedProject?.pricePerTco2eEur)
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  onClick={() => setShowOffsetModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmOffset}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
                >
                  Confirmar y Emitir Certificado
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
