import { useState } from "react";
import {
  Anchor,
  Ship,
  FileText,
  Clock,
  DollarSign,
  AlertTriangle,
  Download,
  Play,
  Building2,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";

interface FixtureRecord {
  id: string;
  fixtureReference: string;
  charterType: "VOYAGE_CHARTER" | "TIME_CHARTER";
  contractForm: string;
  ownerName: string;
  chartererName: string;
  vesselName: string;
  imoNumber: string;
  flagState: string;
  cargoDescription: string;
  cargoQuantityMt: number;
  loadingPort: string;
  dischargingPort: string;
  laycanStart: string;
  laycanEnd: string;
  freightRateUsdPerMt: number;
  dailyHireRateUsd: number;
  demurrageRateUsdPerDay: number;
  despatchRateUsdPerDay: number;
  laytimeTerms: string;
  loadRateMtPerDay: number;
  dischargeRateMtPerDay: number;
  turnTimeHours: number;
  status: string;
}

export default function CharteringLaytimeModule() {
  const [activeTab, setActiveTab] = useState<
    "fixtures" | "sof_laytime" | "settlements"
  >("fixtures");

  // Sample Fixtures
  const [fixtures] = useState<FixtureRecord[]>([
    {
      id: "cp_gencon_wheat_01",
      fixtureReference: "CP-2026-SDR-0081",
      charterType: "VOYAGE_CHARTER",
      contractForm: "GENCON_2022",
      ownerName: "Naviera Cantábrica SA",
      chartererName: "AgroGrain International Traders Ltd",
      vesselName: "MV Northern Star",
      imoNumber: "9842109",
      flagState: "Malta",
      cargoDescription: "Trigo Duro a Granel (Durum Wheat in Bulk)",
      cargoQuantityMt: 35000,
      loadingPort: "Puerto de Santander (ESSDR)",
      dischargingPort: "Puerto de Alexandria (EGALY)",
      laycanStart: "2026-09-01",
      laycanEnd: "2026-09-10",
      freightRateUsdPerMt: 32.5,
      dailyHireRateUsd: 18500,
      demurrageRateUsdPerDay: 14000,
      despatchRateUsdPerDay: 7000,
      laytimeTerms: "SHEX_EIU",
      loadRateMtPerDay: 5000,
      dischargeRateMtPerDay: 3500,
      turnTimeHours: 12.0,
      status: "FIXED_ACTIVE",
    },
    {
      id: "cp_nype_container_02",
      fixtureReference: "CP-2026-TC-0042",
      charterType: "TIME_CHARTER",
      contractForm: "NYPE_2015",
      ownerName: "Iberian Ocean Carriers SL",
      chartererName: "Global Feeder Lines Singapore Pte",
      vesselName: "MV Atlantic Trader",
      imoNumber: "9721085",
      flagState: "Cyprus",
      cargoDescription: "Contenedores y Carga General (Containers & Breakbulk)",
      cargoQuantityMt: 28000,
      loadingPort: "Puerto de Valencia (ESVLC)",
      dischargingPort: "Puerto de Santos (BRSSZ)",
      laycanStart: "2026-08-15",
      laycanEnd: "2026-11-15",
      freightRateUsdPerMt: 0,
      dailyHireRateUsd: 19800,
      demurrageRateUsdPerDay: 15000,
      despatchRateUsdPerDay: 7500,
      laytimeTerms: "SHINC",
      loadRateMtPerDay: 4000,
      dischargeRateMtPerDay: 4000,
      turnTimeHours: 6.0,
      status: "FIXED_ACTIVE",
    },
  ]);

  const [selectedFixture, setSelectedFixture] = useState<FixtureRecord>(
    fixtures[0],
  );

  // Laytime Simulator State
  const [simCargoMt, setSimCargoMt] = useState<number>(35000);
  const [simRateMtPerDay, setSimRateMtPerDay] = useState<number>(5000);
  const [simLaytimeTerms, setSimLaytimeTerms] = useState<string>("SHEX_EIU");
  const [simDemurrageRate, setSimDemurrageRate] = useState<number>(14000);
  const [simDespatchRate, setSimDespatchRate] = useState<number>(7000);
  const [simRainHours, setSimRainHours] = useState<number>(12);
  const [simSundayHours, setSimSundayHours] = useState<number>(24);
  const [simCraneBreakdownHours, setSimCraneBreakdownHours] =
    useState<number>(0);
  const [simGrossOperationHours, setSimGrossOperationHours] =
    useState<number>(186);

  // Time Charter Simulator State
  const [tcDays, setTcDays] = useState<number>(30);
  const [tcHireRate, setTcHireRate] = useState<number>(19800);
  const [tcOffHireDays, setTcOffHireDays] = useState<number>(1.5);
  const [tcVlsfoMt, setTcVlsfoMt] = useState<number>(4.2);

  // Deterministic Laytime Calculation logic
  const allowedHours =
    simRateMtPerDay > 0 ? (simCargoMt / simRateMtPerDay) * 24 : 120;
  const allowedDays = allowedHours / 24;

  const rainDeduction = simLaytimeTerms !== "SHINC" ? simRainHours : 0;
  const sundayDeduction = simLaytimeTerms.startsWith("SHEX")
    ? simSundayHours
    : 0;
  const breakdownDeduction = simCraneBreakdownHours;
  const totalDeductionsHours =
    rainDeduction + sundayDeduction + breakdownDeduction;

  const netUsedHours = Math.max(
    0,
    simGrossOperationHours - totalDeductionsHours,
  );
  const netUsedDays = netUsedHours / 24;

  const diffHours = netUsedHours - allowedHours;
  const isDemurrage = diffHours > 0;
  const diffDays = Math.abs(diffHours) / 24;

  const demurragePayableUsd = isDemurrage ? diffDays * simDemurrageRate : 0;
  const despatchDueUsd = !isDemurrage ? diffDays * simDespatchRate : 0;

  // Time charter calc
  const tcGrossHire = tcDays * tcHireRate;
  const tcHireDeduction = tcOffHireDays * tcHireRate;
  const tcBunkerCost = tcVlsfoMt * 580;
  const tcTotalOffHireClaim = tcHireDeduction + tcBunkerCost;
  const tcNetPayable = tcGrossHire - tcTotalOffHireClaim - tcGrossHire * 0.0375; // 3.75% comms

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
            <Anchor className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Fletamentos Marítimos & Liquidación de Planchas (Laytime &
              Demurrage)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                BIMCO Gencon 2022 / NYPE 2015
              </span>
            </h1>
            <p className="text-sm text-slate-400">
              Cómputo de planchas, validación de NOR/Turn-Time, cálculo de
              demoras y pronto despacho (ATS/WTS) y auditoría Time Charter
              Off-Hire.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() =>
              window.open(
                `/api/chartering/fixtures/${selectedFixture.id}/fixture-pdf`,
                "_blank",
              )
            }
            className="bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-2 text-xs"
          >
            <Download className="w-4 h-4" />
            Descargar Póliza / Fixture PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Pólizas & Fixtures Activas
              </p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">2</h3>
              <p className="text-[11px] text-emerald-400 mt-0.5">
                1 Voyage / 1 Time Charter
              </p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
              <Ship className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Liquidación Neta Demurrage / Despatch
              </p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                +$5,250 USD
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pronto Despacho (ATS) Acreditado
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Tiempo de Plancha Ahorrado
              </p>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">
                18.0 hrs
              </h3>
              <p className="text-[11px] text-emerald-400 mt-0.5">
                0.75 días de ahorro FIOST
              </p>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                Días Off-Hire Auditados
              </p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">
                1.5 días
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                $32,736 USD Claim Flete + Búnker
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 space-x-4">
        {[
          {
            id: "fixtures",
            label: "Pólizas de Fletamento & Fixtures",
            icon: FileText,
          },
          {
            id: "sof_laytime",
            label: "Estado de Hechos (SOF) & Simulador de Plancha",
            icon: Clock,
          },
          {
            id: "settlements",
            label: "Liquidación Demurrage / Despatch & Time Charter",
            icon: DollarSign,
          },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 pb-3 pt-1 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-sky-500 text-sky-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: FIXTURES */}
      {activeTab === "fixtures" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">
              Contratos & Fixtures Registrados
            </h3>
            <div className="space-y-3">
              {fixtures.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFixture(f)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedFixture.id === f.id
                      ? "bg-sky-500/10 border-sky-500/40 shadow-lg shadow-sky-500/5"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-slate-100">
                      {f.fixtureReference}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700 font-mono">
                      {f.contractForm}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Ship className="w-3.5 h-3.5 text-sky-400" />
                    {f.vesselName} ({f.flagState})
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex justify-between text-xs text-slate-400">
                    <span>
                      {f.charterType === "VOYAGE_CHARTER"
                        ? "Voyage FIOST"
                        : "Time Charter"}
                    </span>
                    <span className="font-semibold text-slate-300">
                      {f.charterType === "VOYAGE_CHARTER"
                        ? `$${f.freightRateUsdPerMt}/MT`
                        : `$${f.dailyHireRateUsd}/día`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-400" />
                    Detalle del Contrato: {selectedFixture.fixtureReference}
                  </CardTitle>
                  <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {selectedFixture.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">
                      Armador / Disponent Owner
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedFixture.ownerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Fletador / Charterer
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedFixture.chartererName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Buque (IMO)</span>
                    <span className="font-semibold text-slate-200">
                      {selectedFixture.vesselName} ({selectedFixture.imoNumber})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Carga & Cantidad
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedFixture.cargoQuantityMt.toLocaleString()} MT (
                      {selectedFixture.cargoDescription})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Puertos (Carga / Descarga)
                    </span>
                    <span className="font-semibold text-slate-200">
                      {selectedFixture.loadingPort} ➔{" "}
                      {selectedFixture.dischargingPort}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Ventana Laycan</span>
                    <span className="font-semibold text-slate-200">
                      {selectedFixture.laycanStart} a{" "}
                      {selectedFixture.laycanEnd}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Términos de Plancha, Demoras y Cláusulas Marítimas
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">
                        Régimen Plancha
                      </span>
                      <span className="font-semibold text-slate-200">
                        {selectedFixture.laytimeTerms}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">
                        Tasa de Carga
                      </span>
                      <span className="font-semibold text-slate-200">
                        {selectedFixture.loadRateMtPerDay} MT/WWD
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">
                        Demurrage Rate
                      </span>
                      <span className="font-semibold text-rose-400">
                        $
                        {selectedFixture.demurrageRateUsdPerDay.toLocaleString()}{" "}
                        USD/d
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">
                        Despatch Rate (ATS)
                      </span>
                      <span className="font-semibold text-emerald-400">
                        $
                        {selectedFixture.despatchRateUsdPerDay.toLocaleString()}{" "}
                        USD/d
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() =>
                      window.open(
                        `/api/chartering/fixtures/${selectedFixture.id}/fixture-pdf`,
                        "_blank",
                      )
                    }
                    className="bg-sky-600 hover:bg-sky-500 text-white text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar Póliza / Fixture Recap PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: SOF & LAYTIME SIMULATOR */}
      {activeTab === "sof_laytime" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                  <Play className="w-4 h-4 text-sky-400" />
                  Simulador de Plancha, Lluvia y Demoras
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Cantidad Carga (MT)
                    </label>
                    <input
                      type="number"
                      value={simCargoMt}
                      onChange={(e) => setSimCargoMt(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Ritmo Carga (MT/día)
                    </label>
                    <input
                      type="number"
                      value={simRateMtPerDay}
                      onChange={(e) =>
                        setSimRateMtPerDay(Number(e.target.value))
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Término de Plancha
                    </label>
                    <select
                      value={simLaytimeTerms}
                      onChange={(e) => setSimLaytimeTerms(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                    >
                      <option value="SHEX_EIU">SHEX Even If Used</option>
                      <option value="SHEX_UU">SHEX Unless Used</option>
                      <option value="SHINC">SHINC (Sundays Included)</option>
                      <option value="FHEX">FHEX (Fridays Excluded)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Tiempo Bruto Operación (h)
                    </label>
                    <input
                      type="number"
                      value={simGrossOperationHours}
                      onChange={(e) =>
                        setSimGrossOperationHours(Number(e.target.value))
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
                  <span className="font-semibold text-slate-300 block text-xs">
                    Deducciones e Interrupciones SOF:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Lluvia WWD (h)
                      </label>
                      <input
                        type="number"
                        value={simRainHours}
                        onChange={(e) =>
                          setSimRainHours(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Domingo SHEX (h)
                      </label>
                      <input
                        type="number"
                        value={simSundayHours}
                        onChange={(e) =>
                          setSimSundayHours(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block text-[11px] mb-1">
                        Avería Buque (h)
                      </label>
                      <input
                        type="number"
                        value={simCraneBreakdownHours}
                        onChange={(e) =>
                          setSimCraneBreakdownHours(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Demurrage Rate ($/d)
                    </label>
                    <input
                      type="number"
                      value={simDemurrageRate}
                      onChange={(e) =>
                        setSimDemurrageRate(Number(e.target.value))
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Despatch Rate ($/d)
                    </label>
                    <input
                      type="number"
                      value={simDespatchRate}
                      onChange={(e) =>
                        setSimDespatchRate(Number(e.target.value))
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-sm text-slate-200 flex items-center justify-between">
                  <span>
                    Resultado del Cómputo de Plancha & Dictamen Financiero
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isDemurrage
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {isDemurrage
                      ? "DEMURRAGE INCURRED"
                      : "DESPATCH EARNED (ATS)"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-xs">
                      Plancha Permitida
                    </span>
                    <span className="text-base font-bold text-slate-200">
                      {allowedDays.toFixed(2)} días
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      ({allowedHours.toFixed(1)} horas)
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-xs">
                      Deducciones SOF
                    </span>
                    <span className="text-base font-bold text-amber-400">
                      -{totalDeductionsHours.toFixed(1)} h
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Lluvia + SHEX + Avería
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-xs">
                      Plancha Neta Utilizada
                    </span>
                    <span className="text-base font-bold text-slate-200">
                      {netUsedDays.toFixed(2)} días
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      ({netUsedHours.toFixed(1)} horas)
                    </span>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border ${
                    isDemurrage
                      ? "bg-rose-500/5 border-rose-500/30 text-rose-300"
                      : "bg-emerald-500/5 border-emerald-500/30 text-emerald-300"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs uppercase tracking-wider font-semibold block">
                        {isDemurrage
                          ? "Importe de Demoras a Pagar por Fletador"
                          : "Pronto Despacho (Despatch) a Favor de Fletador"}
                      </span>
                      <p className="text-xl font-bold mt-1">
                        $
                        {isDemurrage
                          ? demurragePayableUsd.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })
                          : despatchDueUsd.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}{" "}
                        USD
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="block font-medium">
                        Diferencia: {diffDays.toFixed(2)} días (
                        {Math.abs(diffHours).toFixed(1)} horas)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {isDemurrage
                          ? "Exceso sobre plancha"
                          : "Tiempo neto ahorrado"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() =>
                      window.open(
                        "/api/chartering/sofs/sof_sdr_load_01/sof-pdf",
                        "_blank",
                      )
                    }
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs flex items-center gap-1.5 border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar Statement of Facts (SOF PDF)
                  </Button>
                  <Button
                    onClick={() =>
                      window.open(
                        "/api/chartering/laytime/lay_calc_sdr_01/calculation-pdf",
                        "_blank",
                      )
                    }
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar Hoja de Liquidación de Planchas PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: SETTLEMENTS & TIME CHARTER */}
      {activeTab === "settlements" && (
        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Auditoría de Fletamento por Tiempo (Time Charter Hire & Off-Hire
                Statement)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Días Totales del Periodo
                  </label>
                  <input
                    type="number"
                    value={tcDays}
                    onChange={(e) => setTcDays(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Daily Hire Rate ($/día)
                  </label>
                  <input
                    type="number"
                    value={tcHireRate}
                    onChange={(e) => setTcHireRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Días Off-Hire Auditados
                  </label>
                  <input
                    type="number"
                    value={tcOffHireDays}
                    onChange={(e) => setTcOffHireDays(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Búnker VLSFO Consumido en Off-Hire (MT)
                  </label>
                  <input
                    type="number"
                    value={tcVlsfoMt}
                    onChange={(e) => setTcVlsfoMt(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <span className="text-slate-500 text-xs block">
                    Flete Bruto Devengado
                  </span>
                  <span className="text-base font-bold text-slate-100">
                    ${tcGrossHire.toLocaleString()} USD
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">
                    Deducción Off-Hire Flete
                  </span>
                  <span className="text-base font-bold text-rose-400">
                    -${tcHireDeduction.toLocaleString()} USD
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">
                    Compensación Búnker
                  </span>
                  <span className="text-base font-bold text-rose-400">
                    -${tcBunkerCost.toLocaleString()} USD
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">
                    Saldo Neto Liquidado a Armador
                  </span>
                  <span className="text-base font-bold text-indigo-400">
                    $
                    {tcNetPayable.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    USD
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() =>
                    window.open(
                      "/api/chartering/fixtures/cp_nype_container_02/hire-statement-pdf",
                      "_blank",
                    )
                  }
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar Estado de Liquidación Time Charter PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
